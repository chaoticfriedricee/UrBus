// src/features/bus/hooks/useBusTracking.js
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { refreshAccessToken } from '../../../shared/api/authClient';
import {
  connectLocationSocket, onUpdateBus, onBusArrived, onLocationStatus, onConnectionChange,
  reconnectLocationSocket, emitStartSharing, emitStopSharing, emitBusLocation, disconnectLocationSocket,
} from '../../../shared/sockets/locationSocket';

/**
 * Hook de rastreo del bus en tiempo real.
 * location-service solo envía la ubicación del conductor a los pasajeros de sus
 * grupos activos, y solo mientras el conductor la comparte:
 * - sharing: null (aún sin respuesta), true o false.
 * - noGroup: el usuario no pertenece a ningún grupo activo (o es admin).
 * Para DRIVER_ROLE expone startRoute/endRoute: al iniciar la ruta se pide permiso
 * de ubicación, se avisa "startSharing" y se transmite el GPS; al finalizarla (o al
 * cerrar la pantalla) se deja de compartir.
 */
export function useBusTracking() {
  const [coords, setCoords] = useState(null);
  const [arrived, setArrived] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [sharing, setSharing] = useState(null);
  const [noGroup, setNoGroup] = useState(false);
  const [error, setError] = useState(null);
  const [routeActive, setRouteActive] = useState(false);
  const watchRef = useRef(null);
  const routeActiveRef = useRef(false);
  const retriedAuthRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    try {
      connectLocationSocket();
      onConnectionChange(
        () => {
          if (!mounted) return;
          setConnected(true);
          setConnecting(false);
          setError(null);
          retriedAuthRef.current = false;
          // Tras una reconexión el servidor ya no recuerda que el conductor compartía
          if (routeActiveRef.current) emitStartSharing();
        },
        () => mounted && setConnected(false),
        async (err) => {
          if (!mounted) return;
          setConnecting(false);
          if (err?.message === 'UNAUTHORIZED' && !retriedAuthRef.current) {
            // El access token pudo vencer: se renueva una vez y se reintenta
            retriedAuthRef.current = true;
            try {
              await refreshAccessToken();
              reconnectLocationSocket();
              return;
            } catch {
              // refreshAccessToken ya cierra la sesión si no se pudo renovar
            }
          }
          setError('No se pudo conectar al servicio de ubicación');
        }
      );
      onLocationStatus((status) => {
        if (!mounted) return;
        setNoGroup(status?.reason === 'NO_GROUP');
        setSharing(Boolean(status?.sharing));
        if (!status?.sharing) {
          setCoords(null);
          setArrived(false);
        } else if (Number.isFinite(status.lat) && Number.isFinite(status.lng)) {
          setCoords({ lat: status.lat, lng: status.lng, updatedAt: status.updatedAt });
        }
      });
      onUpdateBus((data) => {
        if (!mounted) return;
        setCoords({ lat: data.lat, lng: data.lng, updatedAt: data.updatedAt ?? Date.now() });
      });
      onBusArrived(() => { if (mounted) setArrived(true); });
    } catch (err) {
      if (mounted) {
        setError(err?.message ?? 'No se pudo conectar al servicio de ubicación');
        setConnecting(false);
      }
    }

    return () => {
      mounted = false;
      watchRef.current?.remove?.();
      // Al desconectarse, location-service deja de compartir la ubicación del conductor
      disconnectLocationSocket();
    };
  }, []);

  const resetArrived = useCallback(() => setArrived(false), []);

  const startRoute = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Se necesita permiso de ubicación para iniciar la ruta');
      return;
    }
    setError(null);
    setArrived(false);
    setRouteActive(true);
    routeActiveRef.current = true;
    emitStartSharing();
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
      (position) => {
        emitBusLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      }
    );
  }, []);

  const endRoute = useCallback(() => {
    watchRef.current?.remove?.();
    watchRef.current = null;
    routeActiveRef.current = false;
    emitStopSharing();
    setRouteActive(false);
    setCoords(null);
    setArrived(false);
  }, []);

  return {
    coords, arrived, connected, connecting, sharing, noGroup, error, routeActive,
    resetArrived, startRoute, endRoute,
  };
}
