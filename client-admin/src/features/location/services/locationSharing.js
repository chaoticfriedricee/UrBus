// Ciclo de vida de la ubicación compartida en el navegador. Recibe el socket, la API de
// geolocalización y document/window como parámetros para poder probarlo sin navegador.
//
// Límite de la plataforma: con la pestaña en segundo plano (p. ej. al cambiar a WhatsApp)
// o la pantalla bloqueada, el navegador deja de entregar posiciones y termina suspendiendo
// la página y su conexión. Esto no lo evita (ningún código web puede); lo que hace es
// retomar solo al volver, sin duplicar watchers ni conexiones y sin enviar posiciones viejas.
import { shouldSendFix } from './locationFreshness.js';

export const GEO_ERRORS = { 1: 'PERMISSION_DENIED', 2: 'POSITION_UNAVAILABLE', 3: 'TIMEOUT' };

const WATCH_OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };

// Reintentos cuando location-service rechaza la conexión (p. ej. passenger-service caído)
export const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000];

/**
 * El conductor comparte su GPS mientras la ruta está activa:
 * - start()/stop() son idempotentes: nunca hay más de un watchPosition.
 * - Al reconectarse el socket vuelve a avisar "startSharing" (el servidor tenía la ruta en pausa).
 * - Al volver a la pestaña reinicia el watcher para obtener una posición fresca enseguida.
 * - Pide un wake lock de pantalla mientras la ruta está activa y la pestaña visible, para
 *   que el bloqueo automático no suspenda la página (no impide bloquearla a mano).
 * - Si se revoca el permiso, deja de compartir: no se reporta como activo sin GPS.
 * onChange recibe { active, error, lastSentAt }.
 */
export function createLocationSharing({ socket, geolocation, doc, win, wakeLock, now = Date.now, onChange = () => {} }) {
  let active = false;
  let watchId = null;
  let lastSent = null;
  let error = null;
  let lock = null;
  let lockRequest = null;

  const notify = () => onChange({ active, error, lastSentAt: lastSent?.timestamp ?? null });

  const setError = (next) => {
    if (error === next) return;
    error = next;
    notify();
  };

  const clearWatch = () => {
    if (watchId === null) return;
    geolocation.clearWatch(watchId);
    watchId = null;
  };

  const releaseWakeLock = () => {
    const current = lock;
    lock = null;
    current?.release?.()?.catch?.(() => {});
  };

  const requestWakeLock = () => {
    if (!wakeLock || lock || lockRequest || doc.visibilityState !== 'visible') return;
    lockRequest = wakeLock.request('screen')
      .then((sentinel) => {
        lock = sentinel;
        // El navegador lo suelta solo al ocultarse la pestaña; se vuelve a pedir al regresar
        sentinel.addEventListener?.('release', () => { if (lock === sentinel) lock = null; });
        if (!active) releaseWakeLock();
      })
      .catch(() => {}) // no soportado, batería baja o sin permiso: se sigue sin él
      .finally(() => { lockRequest = null; });
  };

  const onPosition = (position) => {
    if (!active) return;
    if (error) setError(null);
    const fix = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: position.timestamp };
    if (!shouldSendFix(fix, lastSent, now())) return;
    // Sin conexión no se acumulan posiciones: llegarían tarde, en ráfaga y desordenadas
    if (!socket.connected) return;
    socket.volatile.emit('busLocation', fix);
    lastSent = fix;
    notify();
  };

  const onError = (err) => {
    if (!active) return;
    const code = GEO_ERRORS[err?.code] ?? 'POSITION_UNAVAILABLE';
    if (code === 'PERMISSION_DENIED') {
      stop();
      setError(code);
      return;
    }
    // Sin señal o tiempo agotado: el watcher sigue activo y se recupera solo
    setError(code);
  };

  const startWatch = () => {
    clearWatch();
    watchId = geolocation.watchPosition(onPosition, onError, WATCH_OPTIONS);
  };

  const onConnect = () => {
    if (active) socket.emit('startSharing');
  };

  const onVisible = () => {
    if (!active || doc.visibilityState !== 'visible') return;
    startWatch();
    requestWakeLock();
  };

  const onPageShow = (event) => { if (event.persisted) onVisible(); };
  // La página se cierra o se navega fuera (no es el segundo plano): se termina la ruta
  const onPageHide = (event) => { if (!event.persisted && active) stop(); };

  socket.on('connect', onConnect);
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('pageshow', onPageShow);
  win.addEventListener('pagehide', onPageHide);

  function start() {
    if (active) return false;
    if (!geolocation) {
      setError('UNSUPPORTED');
      return false;
    }
    active = true;
    error = null;
    lastSent = null;
    // Si aún no hay conexión, onConnect lo avisa al conectar
    if (socket.connected) socket.emit('startSharing');
    startWatch();
    requestWakeLock();
    notify();
    return true;
  }

  // Siempre avisa al servidor: también termina una ruta que quedó en pausa tras recargar la página.
  // Sin volatile: si no hay conexión se entrega al reconectar (y el servidor la termina igual al vencer la pausa).
  function stop() {
    socket.emit('stopSharing');
    if (!active) return;
    active = false;
    clearWatch();
    releaseWakeLock();
    notify();
  }

  function dispose() {
    stop();
    socket.off('connect', onConnect);
    doc.removeEventListener('visibilitychange', onVisible);
    win.removeEventListener('pageshow', onPageShow);
    win.removeEventListener('pagehide', onPageHide);
  }

  return { start, stop, dispose, isActive: () => active };
}

/**
 * Mantiene conectado el socket de ubicación (conductor y pasajeros).
 * Socket.IO reintenta solo los cortes de red; un rechazo del servidor deja el socket
 * detenido hasta llamar connect(). Aquí:
 * - UNAUTHORIZED: el access token venció (dura 1 h); se renueva una vez y se reconecta.
 * - Otro rechazo (ACCESS_UNAVAILABLE...): reintenta con espera creciente, solo con la pestaña visible.
 * - Al volver a la pestaña o recuperar la red, reconecta de inmediato si hace falta.
 * Nunca abre una segunda conexión: no llama connect() si ya está conectado o reintentando.
 */
export function createSocketRecovery({
  socket, refreshToken, doc, win, onSessionExpired = () => {},
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let attempt = 0;
  let timer = null;
  let refreshed = false;

  const cancelRetry = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const connectNow = () => {
    cancelRetry();
    if (socket.connected || socket.active) return;
    socket.connect();
  };

  const scheduleRetry = () => {
    // En segundo plano no se gastan reintentos: se reconecta al volver
    if (timer !== null || doc.visibilityState !== 'visible') return;
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    timer = setTimer(() => { timer = null; connectNow(); }, delay);
  };

  const onConnect = () => {
    attempt = 0;
    refreshed = false;
    cancelRetry();
  };

  const onConnectError = async (err) => {
    if (socket.active) return; // corte de red: Socket.IO ya está reintentando
    if (err?.message === 'UNAUTHORIZED') {
      if (refreshed) {
        onSessionExpired();
        return;
      }
      refreshed = true;
      try {
        await refreshToken();
      } catch {
        // refreshToken ya cierra la sesión si el refresh token también venció
        onSessionExpired();
        return;
      }
      connectNow();
      return;
    }
    scheduleRetry();
  };

  const onVisible = () => {
    if (doc.visibilityState !== 'visible') return;
    attempt = 0;
    connectNow();
  };

  const onOnline = () => {
    attempt = 0;
    connectNow();
  };

  socket.on('connect', onConnect);
  socket.on('connect_error', onConnectError);
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('online', onOnline);

  return {
    dispose() {
      cancelRetry();
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      doc.removeEventListener('visibilitychange', onVisible);
      win.removeEventListener('online', onOnline);
    },
  };
}
