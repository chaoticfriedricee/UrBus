import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../auth/store/authStore.js';
import { styles } from '../../../styles/location.js';

const LOCATION_SERVICE_URL = import.meta.env.VITE_LOCATION_SERVICE_URL || 'http://localhost:3033/urbus/v1';
// Socket.IO se sirve en la raíz del servicio (/socket.io/), no bajo /urbus/v1. Además,
// io('http://host/urbus/v1') interpreta "/urbus/v1" como namespace y falla con "Invalid namespace".
const SOCKET_URL = new URL(LOCATION_SERVICE_URL).origin;
const CENTER_COORDS = { lat: 14.6245, lng: -90.5366 };

// location-service solo entrega la ubicación de un conductor a él mismo y a los
// pasajeros de sus grupos activos, y solo mientras el conductor la comparte
// ("Iniciar Ruta"). Solo DRIVER_ROLE puede compartir su ubicación.
export const LocationPage = () => {
  const user = useAuthStore((state) => state.user);
  const canManageRoute = user?.role === 'DRIVER_ROLE';

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const hasArrivedRef = useRef(false);
  const routeActiveRef = useRef(false);

  const [routeActive, setRouteActive] = useState(false);
  const [busStatus, setBusStatus] = useState('Esperando...');
  const [connected, setConnected] = useState(false);
  // null = sin respuesta aún; { sharing, reason? } según location-service
  const [locationStatus, setLocationStatus] = useState(null);

  // Inicializar mapa
  const initMap = useCallback((L) => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([CENTER_COORDS.lat, CENTER_COORDS.lng], 15);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.marker([CENTER_COORDS.lat, CENTER_COORDS.lng])
      .addTo(map)
      .bindPopup('<b>Kinal</b><br>Destino del bus');
  }, []);

  // Cargar Leaflet + Socket.io y conectar
  useEffect(() => {
    let mounted = true;

    const loadScripts = async () => {
      // Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Leaflet JS
      await new Promise((resolve) => {
        if (window.L) { resolve(); return; }
        if (!document.getElementById('leaflet-js')) {
          const script = document.createElement('script');
          script.id = 'leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        } else {
          const iv = setInterval(() => { if (window.L) { clearInterval(iv); resolve(); } }, 50);
        }
      });

      // Socket.io client
      await new Promise((resolve) => {
        if (window.io) { resolve(); return; }
        if (!document.getElementById('socketio-js')) {
          const script = document.createElement('script');
          script.id = 'socketio-js';
          script.src = `${SOCKET_URL}/socket.io/socket.io.js`;
          script.onload = resolve;
          script.onerror = resolve; // continúa aunque falle, mostrará desconectado
          document.head.appendChild(script);
        } else {
          const iv = setInterval(() => { if (window.io) { clearInterval(iv); resolve(); } }, 50);
        }
      });

      if (!mounted) return;

      initMap(window.L);

      // Conectar socket (autenticado: la función entrega el token vigente en cada reconexión)
      if (window.io) {
        const socket = window.io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          auth: (cb) => cb({ token: useAuthStore.getState().token }),
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (!mounted) return;
          setConnected(true);
          // Tras una reconexión el servidor ya no recuerda que el conductor compartía
          if (routeActiveRef.current) socket.emit('startSharing');
        });
        socket.on('disconnect', () => { if (mounted) setConnected(false); });

        // Un rechazo del middleware (p. ej. token vencido) no se reintenta solo
        socket.on('connect_error', () => {
          if (!mounted) return;
          setConnected(false);
          setTimeout(() => { if (mounted && !socket.connected) socket.connect(); }, 5000);
        });

        socket.on('locationStatus', (status) => {
          if (!mounted) return;
          setLocationStatus(status);
          if (!status?.sharing) {
            // Sin ubicación compartida: no se deja un marcador que aparente una posición en vivo
            busMarkerRef.current?.remove();
            busMarkerRef.current = null;
            hasArrivedRef.current = false;
            setBusStatus('Ubicación no compartida');
          }
        });

        socket.on('updateBus', (coords) => {
          if (!mounted) return;
          const L = window.L;
          const map = mapInstanceRef.current;
          if (!L || !map) return;

          setBusStatus('En ruta 🚌');
          setLocationStatus({ sharing: true });

          const busIcon = L.divIcon({
            html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚌</div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          if (!busMarkerRef.current) {
            busMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: busIcon })
              .addTo(map)
              .bindPopup('Bus en ruta');
          } else {
            busMarkerRef.current.setLatLng([coords.lat, coords.lng]);
          }

          // Verificar llegada
          const R = 6371000;
          const dLat = (coords.lat - CENTER_COORDS.lat) * Math.PI / 180;
          const dLng = (coords.lng - CENTER_COORDS.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(CENTER_COORDS.lat * Math.PI / 180) *
            Math.cos(coords.lat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
          const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (!hasArrivedRef.current && distance <= 50) {
            hasArrivedRef.current = true;
            busMarkerRef.current.setPopupContent('¡Llegó a Kinal! 🎉').openPopup();
            setBusStatus('¡Llegó a Kinal! 🎉');
            toast.success('¡El bus llegó a Kinal! 🚌', { duration: 5000 });
          }
        });

        socket.on('busArrived', () => {
          if (mounted) {
            setBusStatus('¡Llegó a Kinal! 🎉');
            toast.success('¡El bus llegó a Kinal! 🚌', { duration: 5000 });
          }
        });
      }
    };

    loadScripts();

    return () => {
      mounted = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      busMarkerRef.current = null;
    };
  }, [initMap]);

  const handleStartRoute = () => {
    if (!socketRef.current) return;
    if (!('geolocation' in navigator)) {
      alert('Geolocalización no soportada en este dispositivo.');
      return;
    }
    hasArrivedRef.current = false;
    routeActiveRef.current = true;
    setRouteActive(true);
    setBusStatus('En ruta 🚌');
    socketRef.current.emit('startSharing');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        socketRef.current?.emit('busLocation', coords);
      },
      (err) => console.error('Error GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  };

  const handleEndRoute = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    routeActiveRef.current = false;
    socketRef.current?.emit('stopSharing');
    setRouteActive(false);
    setBusStatus('Ruta finalizada');
    hasArrivedRef.current = false;
  };

  const statusColor = connected ? '#16a34a' : '#9ca3af';
  const statusLabel = connected
    ? (routeActive || locationStatus?.sharing ? busStatus : 'Conectado')
    : 'Desconectado';

  // Aviso sobre el mapa para quien solo observa
  let viewerNotice = null;
  if (!canManageRoute && connected && locationStatus) {
    if (locationStatus.reason === 'NO_GROUP') {
      viewerNotice = user?.role === 'ADMIN_ROLE'
        ? 'La ubicación del bus solo la ven el conductor y los pasajeros de su grupo.'
        : 'Únete a un grupo con el código de tu conductor para ver la ubicación del bus.';
    } else if (!locationStatus.sharing) {
      viewerNotice = 'Tu conductor no está compartiendo su ubicación en este momento.';
    }
  }

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
            <p style={styles.pageSubtitle}>
              {canManageRoute
                ? (routeActive
                    ? 'Compartiendo tu ubicación con los pasajeros de tus grupos'
                    : 'Inicia la ruta para compartir tu ubicación con tus grupos')
                : 'Sigue la ubicación del bus en tiempo real'}
            </p>
          </div>
        </div>

        <div style={{ ...styles.statusBadge, color: statusColor, background: connected ? '#f0fdf4' : '#f3f4f6' }}>
          <span style={{ ...styles.statusDot, background: statusColor }} />
          {statusLabel}
        </div>
      </div>

      <div style={styles.mapCard}>
        <div style={styles.mapCardHeader}>
          <div style={styles.mapCardHeaderLeft}>
            <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span style={styles.mapCardHeaderText}>Actualización en tiempo real</span>
          </div>
        </div>

        {viewerNotice && (
          <div style={{
            padding: '10px 16px', background: '#fffbeb', color: '#92400e',
            fontSize: 13, fontWeight: 600, borderBottom: '1px solid #fde68a',
          }}>
            {viewerNotice}
          </div>
        )}

        <div ref={mapRef} style={styles.mapContainer} />

        {canManageRoute && (
          <div style={styles.adminActions}>
            <button
              style={{
                ...styles.actionBtn,
                ...styles.startBtn,
                opacity: routeActive ? 0.5 : 1,
                cursor: routeActive ? 'not-allowed' : 'pointer',
              }}
              onClick={handleStartRoute}
              disabled={routeActive}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Iniciar Ruta
            </button>
            <button
              style={{
                ...styles.actionBtn,
                ...styles.endBtn,
                opacity: !routeActive ? 0.5 : 1,
                cursor: !routeActive ? 'not-allowed' : 'pointer',
              }}
              onClick={handleEndRoute}
              disabled={!routeActive}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Finalizar Ruta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};