import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../auth/store/authStore.js';
import { refreshAccessToken } from '../../../shared/api/api.js';
import { useGroupStore } from '../../groups/store/groupStore.js';
import { styles } from '../../../styles/location.js';
import LocationMap from '../components/LocationMap.jsx';
import { createSocketRecovery } from '../services/socketRecovery.js';
import {
  getItinerary,
  getItineraryAccess,
  interruptGroupTrip,
  startGroupTrip,
  updateGroupDestination,
} from '../services/itineraryApi.js';
import { formatAge } from '../services/locationFreshness.js';

const LOCATION_SERVICE_URL = import.meta.env.VITE_LOCATION_SERVICE_URL
  || 'http://localhost:3033/urbus/v1';
const SOCKET_URL = new URL(LOCATION_SERVICE_URL).origin;
const DEFAULT_DESTINATION = { lat: 14.6258, lng: -90.536 };

function getCurrentPosition(geolocation) {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error('Este dispositivo no permite obtener la ubicación GPS.'));
      return;
    }
    geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      }),
      (error) => reject(new Error({
        1: 'Permite el acceso a tu ubicación GPS para iniciar el recorrido.',
        2: 'No se pudo obtener señal GPS. Comprueba la ubicación del dispositivo.',
        3: 'El GPS tardó demasiado en responder. Inténtalo otra vez.',
      }[error.code] || 'No se pudo obtener la ubicación GPS.')),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

async function loadSocketClient() {
  if (window.io) return window.io;
  await new Promise((resolve, reject) => {
    let script = document.getElementById('socketio-js');
    if (!script) {
      script = document.createElement('script');
      script.id = 'socketio-js';
      script.src = `${SOCKET_URL}/socket.io/socket.io.js`;
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar Socket.IO.'));
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('No se pudo cargar Socket.IO.')), { once: true });
    }
  });
  if (!window.io) throw new Error('Socket.IO no está disponible.');
  return window.io;
}

export const LocationPage = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const canManageRoute = user?.role === 'DRIVER_ROLE';
  const groups = useGroupStore((state) => state.groups);
  const fetchGroups = useGroupStore((state) => state.fetchGroups);
  const socketRef = useRef(null);
  const loadStateRef = useRef(null);
  const [access, setAccess] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [itinerary, setItinerary] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const authorizedGroupIds = useMemo(() => (
    canManageRoute ? access?.ownedGroupIds ?? [] : [access?.memberGroupId].filter(Boolean)
  ), [access, canManageRoute]);
  const currentItinerary = itinerary?.groupId === selectedGroupId ? itinerary : null;
  const activeTrip = currentItinerary?.activeTrip ?? null;
  const lastTrip = currentItinerary?.lastTrip ?? null;
  const routeActive = activeTrip?.status === 'EN_CURSO';
  const gpsStatus = activeTrip?.gpsStatus ?? 'DESCONECTADO';
  const displayedLocation = routeActive
    ? activeTrip.currentLocation
    : lastTrip?.currentLocation ?? null;
  const busCoords = busLocation?.groupId === selectedGroupId ? busLocation.point : null;
  const staleLocation = !routeActive && Boolean(displayedLocation);

  const refreshGroupState = useCallback(async (groupId = selectedGroupId) => {
    if (!groupId || !token) return;
    const data = await getItinerary(groupId, token);
    setItinerary(data);
    const current = data.activeTrip?.currentLocation
      ?? data.activeTrip?.origin
      ?? data.lastTrip?.currentLocation
      ?? null;
    if (current) setBusLocation({ groupId, point: { ...current, seenAt: Date.now() } });
  }, [selectedGroupId, token]);

  useEffect(() => {
    loadStateRef.current = refreshGroupState;
  }, [refreshGroupState]);

  useEffect(() => {
    let mounted = true;
    if (!token) return undefined;
    getItineraryAccess(token).then((result) => {
      if (!mounted) return;
      setAccess(result);
      if (result.role === 'DRIVER_ROLE') {
        fetchGroups();
        const firstGroup = result.ownedGroupIds?.[0];
        if (firstGroup) setSelectedGroupId((current) => current || firstGroup);
      } else if (result.memberGroupId) {
        setSelectedGroupId(result.memberGroupId);
      }
    }).catch((error) => {
      if (mounted) setRequestError(error.message);
    });
    return () => { mounted = false; };
  }, [token, fetchGroups]);

  useEffect(() => {
    if (!selectedGroupId || !token) return undefined;
    let mounted = true;
    const timer = setTimeout(() => {
      refreshGroupState(selectedGroupId).catch((error) => {
        if (mounted) setRequestError(error.message);
      });
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [refreshGroupState, selectedGroupId, token]);

  useEffect(() => {
    if (!canManageRoute || routeActive || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setBusLocation({
        groupId: selectedGroupId,
        point: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
      }),
      (error) => {
        if (error.code === 1) setGpsError('Permite el acceso a la ubicación para mostrar el GPS actual.');
        else setGpsError('No se pudo obtener señal GPS; el recorrido todavía no ha iniciado.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [canManageRoute, routeActive, selectedGroupId]);

  useEffect(() => {
    let mounted = true;
    let recovery;
    let socket;
    const connect = async () => {
      try {
        const io = await loadSocketClient();
        if (!mounted) return;
        socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          auth: (callback) => callback({ token: useAuthStore.getState().token }),
        });
        socketRef.current = socket;
        recovery = createSocketRecovery({
          socket,
          refreshToken: refreshAccessToken,
          doc: document,
          win: window,
          onSessionExpired: () => setRequestError('Tu sesión expiró. Vuelve a iniciar sesión.'),
        });
        socket.on('connect', () => {
          if (!mounted) return;
          setConnected(true);
          setRequestError(null);
          const groupId = selectedGroupId;
          if (groupId) socket.emit('itinerary:subscribe', { groupId });
        });
        socket.on('disconnect', () => mounted && setConnected(false));
        socket.on('connect_error', (error) => {
          if (mounted && error.message !== 'UNAUTHORIZED') setConnected(false);
        });
        const refreshOnEvent = (payload) => {
          if (payload?.groupId === selectedGroupId) {
            loadStateRef.current?.(selectedGroupId).catch((error) => setRequestError(error.message));
          }
        };
        [
          'itinerary:state', 'itinerary:started', 'itinerary:destination',
          'itinerary:route', 'itinerary:completed', 'itinerary:interrupted',
        ].forEach((eventName) => socket.on(eventName, (payload) => {
          if (eventName === 'itinerary:state' && payload?.groupId === selectedGroupId) {
            setItinerary(payload);
          } else {
            refreshOnEvent(payload);
          }
        }));
        socket.on('itinerary:location', (payload) => {
          if (payload?.groupId === selectedGroupId && payload.location) {
            setBusLocation({
              groupId: selectedGroupId,
              point: {
                ...payload.location,
                updatedAt: payload.updatedAt,
                seenAt: Date.now(),
              },
            });
          }
        });
        socket.on('itinerary:gps-status', (payload) => {
          if (payload?.groupId === selectedGroupId) {
            const seenAt = Date.now();
            setItinerary((current) => current?.activeTrip ? {
              ...current,
              activeTrip: {
                ...current.activeTrip,
                gpsStatus: payload.status,
                lastLocationAt: payload.updatedAt ?? current.activeTrip.lastLocationAt,
                locationAgeMs: payload.status === 'CONECTADO' ? 0 : current.activeTrip.locationAgeMs,
              },
            } : current);
            if (payload.status === 'CONECTADO') {
              setBusLocation((current) => current?.groupId === selectedGroupId
                ? { ...current, point: { ...current.point, seenAt } }
                : current);
            }
          }
        });
        socket.on('itinerary:error', (payload) => {
          if (payload?.groupId === selectedGroupId) setRequestError(payload.message);
        });
      } catch (error) {
        if (mounted) setRequestError(error.message);
      }
    };
    connect();
    return () => {
      mounted = false;
      recovery?.dispose();
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [selectedGroupId]);

  useEffect(() => {
    if (!routeActive || !canManageRoute || !selectedGroupId) return undefined;
    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setBusLocation({ groupId: selectedGroupId, point: { ...point, seenAt: Date.now() } });
        if (socketRef.current?.connected) {
          socketRef.current.volatile.emit('itinerary:location', { groupId: selectedGroupId, point });
        }
      },
      (error) => setGpsError(error.code === 1
        ? 'Se revocó el permiso GPS. El recorrido sigue guardado, pero no se reciben ubicaciones.'
        : 'No se recibe señal GPS; se reintentará automáticamente.'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [canManageRoute, routeActive, selectedGroupId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    if (!selectedGroupId || busy) return;
    setBusy(true);
    setGpsError(null);
    try {
      const origin = await getCurrentPosition(navigator.geolocation);
      const trip = await startGroupTrip(selectedGroupId, token, origin);
      setItinerary((current) => ({
        ...(current?.groupId === selectedGroupId ? current : { groupId: selectedGroupId }),
        activeTrip: trip,
        destination: trip.destination,
      }));
      setBusLocation({ groupId: selectedGroupId, point: { ...origin, seenAt: Date.now() } });
      toast.success('Recorrido iniciado. El grupo ya puede seguir el bus.');
      await refreshGroupState(selectedGroupId);
    } catch (error) {
      setGpsError(error.message);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleInterrupt = async () => {
    if (!selectedGroupId || busy) return;
    setBusy(true);
    try {
      await interruptGroupTrip(selectedGroupId, token);
      setItinerary((current) => current?.groupId === selectedGroupId && current.activeTrip ? {
        ...current,
        activeTrip: null,
        lastTrip: { ...current.activeTrip, status: 'INTERRUMPIDO', endedAt: new Date().toISOString() },
      } : current);
      toast.success('Recorrido interrumpido.');
      await refreshGroupState(selectedGroupId);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDestinationChange = async (destination) => {
    if (!canManageRoute || !selectedGroupId) return;
    try {
      const result = await updateGroupDestination(selectedGroupId, token, destination);
      setItinerary((current) => ({
        ...(current?.groupId === selectedGroupId ? current : { groupId: selectedGroupId }),
        destination: result.destination,
        activeTrip: result.activeTrip ?? current?.activeTrip ?? null,
      }));
      toast.success('Destino del grupo actualizado.');
    } catch (error) {
      toast.error(error.message);
      await refreshGroupState(selectedGroupId);
    }
  };

  const destination = currentItinerary?.destination ?? DEFAULT_DESTINATION;
  const lastLocationAge = (busCoords?.seenAt
    ? Math.max(0, now - busCoords.seenAt)
    : routeActive ? activeTrip?.locationAgeMs : lastTrip?.locationAgeMs) ?? (
    busCoords?.updatedAt || displayedLocation?.updatedAt
    ? Math.max(0, now - new Date(busCoords?.updatedAt ?? displayedLocation.updatedAt).getTime())
    : displayedLocation?.timestamp
      ? Math.max(0, now - displayedLocation.timestamp)
      : null);
  const tripStatus = routeActive
    ? gpsStatus === 'CONECTADO' ? 'Recorrido en curso · GPS conectado' : 'Recorrido en curso · GPS desconectado'
    : lastTrip?.status === 'COMPLETADO'
      ? 'Recorrido completado'
      : lastTrip?.status === 'INTERRUMPIDO'
        ? 'Último recorrido interrumpido'
        : 'El bus todavía no ha comenzado';

  return (
    <div style={styles.wrapper}>
      <div style={styles.pageHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrap}>
            <svg width="20" height="20" fill="none" stroke="#005691" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </div>
          <div>
            <h1 style={styles.pageTitle}>Mapa a Tiempo Real</h1>
            <p style={styles.pageSubtitle}>{tripStatus}</p>
          </div>
        </div>
        <div style={{
          ...styles.statusBadge,
          color: connected ? '#166534' : '#9ca3af',
          background: connected ? '#f0fdf4' : '#f3f4f6',
        }}>
          <span style={{ ...styles.statusDot, background: connected ? '#16a34a' : '#9ca3af' }} />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <div style={styles.mapCard}>
        <div style={{ ...styles.mapCardHeader, justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={styles.mapCardHeaderText}>Ruta independiente por grupo · sin horarios programados</span>
          {canManageRoute && authorizedGroupIds.length > 1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Grupo
              <select
                value={selectedGroupId}
                onChange={(event) => setSelectedGroupId(event.target.value)}
                disabled={routeActive}
                aria-label="Seleccionar grupo"
              >
                {authorizedGroupIds.map((id) => (
                  <option value={id} key={id}>
                    {groups.find((group) => String(group._id) === id)?.name || id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {(requestError || gpsError) && (
          <div role="alert" style={{
            padding: '10px 16px', background: '#fef2f2', color: '#b91c1c',
            borderBottom: '1px solid #fecaca', fontSize: 13, fontWeight: 600,
          }}>
            {gpsError || requestError}
          </div>
        )}

        {lastLocationAge !== null && (
          <div style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            color: staleLocation ? '#92400e' : '#166534',
            background: staleLocation ? '#fffbeb' : '#f0fdf4',
            borderBottom: '1px solid #e5e7eb',
          }}>
            {staleLocation
              ? `Última ubicación conocida · ${formatAge(lastLocationAge)}`
              : gpsStatus === 'CONECTADO'
                ? `GPS actualizado hace ${formatAge(lastLocationAge)}`
                : 'Se perdió la señal GPS; la posición mostrada no es actual.'}
          </div>
        )}

        <div className="urbus-map-stage">
          <LocationMap
            vehicle={busCoords ?? displayedLocation}
            vehicleOpacity={staleLocation || gpsStatus === 'DESCONECTADO' ? 0.45 : 1}
            origin={routeActive ? activeTrip.origin : null}
            destination={destination}
            routeGeometry={routeActive ? activeTrip.geometry : null}
            canEditDestination={canManageRoute}
            onDestinationChange={handleDestinationChange}
          />
          <div className="urbus-map-tools">
            <span className="urbus-route-summary" role="status">
              {routeActive
                ? `${(activeTrip.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(activeTrip.duration / 60))} min`
                : canManageRoute
                  ? 'Arrastra el marcador rojo para configurar el destino del grupo.'
                  : 'El destino configurado para este grupo aparece en el mapa.'}
            </span>
          </div>
        </div>

        {canManageRoute && (
          <div style={styles.adminActions}>
            <button
              style={{ ...styles.actionBtn, ...styles.startBtn, opacity: routeActive || busy ? 0.5 : 1 }}
              onClick={handleStart}
              disabled={routeActive || busy || !selectedGroupId}
            >
              Iniciar recorrido
            </button>
            <button
              style={{ ...styles.actionBtn, ...styles.endBtn, opacity: !routeActive || busy ? 0.5 : 1 }}
              onClick={handleInterrupt}
              disabled={!routeActive || busy}
            >
              Interrumpir recorrido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
