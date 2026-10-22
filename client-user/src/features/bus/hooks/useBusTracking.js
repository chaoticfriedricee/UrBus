// src/features/bus/hooks/useBusTracking.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { refreshAccessToken } from '../../../shared/api/authClient';
import {
  connectLocationSocket, onUpdateBus, onBusArrived, onLocationStatus, onConnectionChange,
  reconnectLocationSocket, isLocationSocketConnected, isLocationSocketActive,
  emitStartSharing, emitStopSharing, emitBusLocation, disconnectLocationSocket,
} from '../../../shared/sockets/locationSocket';
import { localTimestamp, shouldSendFix } from '../utils/locationFreshness';

// distanceInterval 0: con el bus detenido (semáforo, parada) siguen llegando posiciones y
// los pasajeros no lo ven como "no actualizada". shouldSendFix limita el envío a una cada 2 s.
const WATCH_OPTIONS = { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 0 };

// Reintentos cuando location-service rechaza la conexión (p. ej. passenger-service caído)
const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000];

const GPS_UNAVAILABLE = 'No se pudo obtener tu ubicación (¿GPS desactivado o sin señal?). Se seguirá intentando.';

/**
 * Hook de rastreo del bus en tiempo real.
 * location-service solo envía la ubicación del conductor a los pasajeros de sus
 * grupos activos, y solo mientras el conductor la comparte:
 * - sharing: null (aún sin respuesta), true o false.
 * - noGroup: el usuario no pertenece a ningún grupo activo (o es admin).
 * - coords: { lat, lng, updatedAt, seenAt, paused }. seenAt es el reloj de este teléfono;
 *   paused indica que el conductor perdió la conexión (es la última posición conocida).
 * Para DRIVER_ROLE expone startRoute/endRoute: al iniciar la ruta se pide permiso
 * de ubicación, se avisa "startSharing" y se transmite el GPS; al finalizarla (o al
 * cerrar la pantalla) se deja de compartir.
 *
 * Límite: con permiso "mientras se usa la app", el sistema deja de entregar el GPS con la
 * app en segundo plano o la pantalla bloqueada. Al volver a primer plano se reconecta, se
 * comprueba el permiso y se pide una posición fresca sin que el conductor reinicie la ruta.
 * - pausedRoute: el servidor conserva en pausa una ruta del conductor que esta app ya no
 *   transmite (se cerró o se reinició); puede reanudarla con startRoute o terminarla con endRoute.
 */
export function useBusTracking() {
  const [coords, setCoords] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [sharing, setSharing] = useState(null);
  const [noGroup, setNoGroup] = useState(false);
  const [error, setError] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [routeActive, setRouteActive] = useState(false);
  const [pausedRoute, setPausedRoute] = useState(false);
  const mountedRef = useRef(true);
  const watchRef = useRef(null);
  // Cada (re)inicio del watcher incrementa la generación: uno que termine de crearse tarde se descarta
  const watchGenRef = useRef(0);
  const routeActiveRef = useRef(false);
  const startingRef = useRef(false);
  const lastSentRef = useRef(null);
  const retriedAuthRef = useRef(false);
  const retryRef = useRef({ attempt: 0, timer: null });

  const stopWatch = useCallback(() => {
    watchGenRef.current += 1;
    watchRef.current?.remove?.();
    watchRef.current = null;
  }, []);

  // Nunca deja dos watchers: elimina el anterior y descarta este si la ruta terminó mientras se creaba
  const startWatch = useCallback(async () => {
    stopWatch();
    const generation = watchGenRef.current;
    let subscription;
    try {
      subscription = await Location.watchPositionAsync(
        WATCH_OPTIONS,
        (position) => {
          if (!routeActiveRef.current) return;
          setGpsError(null);
          const fix = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: position.timestamp };
          if (!shouldSendFix(fix, lastSentRef.current, Date.now())) return;
          // Sin conexión no se acumulan posiciones viejas
          if (!isLocationSocketConnected()) return;
          emitBusLocation(fix);
          lastSentRef.current = fix;
        },
        () => { if (routeActiveRef.current) setGpsError(GPS_UNAVAILABLE); }
      );
    } catch {
      if (routeActiveRef.current) setGpsError(GPS_UNAVAILABLE);
      return;
    }
    if (generation !== watchGenRef.current || !routeActiveRef.current || !mountedRef.current) {
      subscription.remove();
      return;
    }
    watchRef.current = subscription;
  }, [stopWatch]);

  const finishRoute = useCallback((message = null) => {
    stopWatch();
    routeActiveRef.current = false;
    lastSentRef.current = null;
    // Siempre se avisa: también termina una ruta que el servidor tenía en pausa
    emitStopSharing();
    setRouteActive(false);
    setPausedRoute(false);
    setCoords(null);
    setArrived(false);
    setGpsError(null);
    setError(message);
  }, [stopWatch]);

  useEffect(() => {
    mountedRef.current = true;
    const retry = retryRef.current;

    const scheduleRetry = () => {
      // En segundo plano no se gastan reintentos: se reconecta al volver
      if (retry.timer || AppState.currentState !== 'active') return;
      const delay = RETRY_DELAYS_MS[Math.min(retry.attempt, RETRY_DELAYS_MS.length - 1)];
      retry.attempt += 1;
      retry.timer = setTimeout(() => {
        retry.timer = null;
        reconnectLocationSocket();
      }, delay);
    };

    const onAppStateChange = async (state) => {
      if (state !== 'active' || !mountedRef.current) return;
      retry.attempt = 0;
      reconnectLocationSocket();
      if (!routeActiveRef.current) return;

      // El permiso o el GPS pudieron cambiar mientras la app estaba en segundo plano
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!mountedRef.current || !routeActiveRef.current) return;
      if (status !== 'granted') {
        finishRoute('Se retiró el permiso de ubicación. Se dejó de compartir tu ubicación.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) setGpsError(GPS_UNAVAILABLE);
      startWatch();
    };
    const appStateSubscription = AppState.addEventListener('change', onAppStateChange);

    try {
      connectLocationSocket();
      onConnectionChange(
        () => {
          if (!mountedRef.current) return;
          setConnected(true);
          setConnecting(false);
          setError(null);
          retriedAuthRef.current = false;
          retry.attempt = 0;
          // Tras una reconexión el servidor tiene la ruta en pausa hasta recibir esto
          if (routeActiveRef.current) emitStartSharing();
        },
        () => mountedRef.current && setConnected(false),
        async (err) => {
          if (!mountedRef.current) return;
          setConnecting(false);
          setConnected(false);
          if (err?.message === 'UNAUTHORIZED') {
            if (retriedAuthRef.current) {
              setError('Tu sesión expiró. Vuelve a iniciar sesión.');
              return;
            }
            // El access token pudo vencer: se renueva una vez y se reintenta
            retriedAuthRef.current = true;
            try {
              await refreshAccessToken();
              reconnectLocationSocket();
            } catch {
              // refreshAccessToken ya cierra la sesión si no se pudo renovar
              if (mountedRef.current) setError('Tu sesión expiró. Vuelve a iniciar sesión.');
            }
            return;
          }
          setError('No se pudo conectar al servicio de ubicación. Reintentando…');
          // Un corte de red lo reintenta Socket.IO; un rechazo del servidor, no
          if (!isLocationSocketActive()) scheduleRetry();
        }
      );
      onLocationStatus((status) => {
        if (!mountedRef.current) return;
        setNoGroup(status?.reason === 'NO_GROUP');
        setSharing(Boolean(status?.sharing));
        setPausedRoute(Boolean(status?.sharing && status?.paused) && !routeActiveRef.current);
        if (!status?.sharing) {
          setCoords(null);
          setArrived(false);
        } else if (Number.isFinite(status.lat) && Number.isFinite(status.lng)) {
          setCoords({
            lat: status.lat, lng: status.lng, updatedAt: status.updatedAt,
            seenAt: localTimestamp(status, Date.now()), paused: Boolean(status.paused),
          });
        } else {
          setCoords((prev) => (prev ? { ...prev, paused: Boolean(status.paused) } : prev));
        }
      });
      onUpdateBus((data) => {
        if (!mountedRef.current) return;
        setCoords({ lat: data.lat, lng: data.lng, updatedAt: data.updatedAt, seenAt: Date.now(), paused: false });
      });
      onBusArrived(() => { if (mountedRef.current) setArrived(true); });
    } catch (err) {
      setError(err?.message ?? 'No se pudo conectar al servicio de ubicación');
      setConnecting(false);
    }

    return () => {
      mountedRef.current = false;
      appStateSubscription.remove();
      clearTimeout(retry.timer);
      retry.timer = null;
      stopWatch();
      // Al cerrar la pantalla se deja de compartir (antes de desconectar, para que llegue)
      if (routeActiveRef.current) emitStopSharing();
      routeActiveRef.current = false;
      disconnectLocationSocket();
    };
  }, [startWatch, stopWatch, finishRoute]);

  const resetArrived = useCallback(() => setArrived(false), []);

  const startRoute = useCallback(async () => {
    // Un doble toque mientras se pide el permiso no crea dos watchers
    if (routeActiveRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (status !== 'granted') {
        setError('Se necesita permiso de ubicación para iniciar la ruta');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('Activa la ubicación (GPS) del teléfono para iniciar la ruta');
        return;
      }
      if (!mountedRef.current) return;
      setError(null);
      setGpsError(null);
      setArrived(false);
      setPausedRoute(false);
      setRouteActive(true);
      routeActiveRef.current = true;
      lastSentRef.current = null;
      // Sin conexión lo envía el manejador de "connect" al conectar
      if (isLocationSocketConnected()) emitStartSharing();
      await startWatch();
    } finally {
      startingRef.current = false;
    }
  }, [startWatch]);

  const endRoute = useCallback(() => finishRoute(), [finishRoute]);

  return {
    coords, arrived, connected, connecting, sharing, noGroup, error, gpsError, routeActive, pausedRoute,
    resetArrived, startRoute, endRoute,
  };
}
