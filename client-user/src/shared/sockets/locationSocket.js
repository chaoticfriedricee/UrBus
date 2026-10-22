// src/shared/sockets/locationSocket.js
import { io } from 'socket.io-client';
import { ENDPOINTS } from '../constants/endpoints';
import useAuthStore from '../store/authStore';

let socket = null;

/**
 * Conecta al namespace raíz de location-service, autenticado con el token.
 * location-service solo entrega la ubicación del conductor a él mismo y a los
 * pasajeros de sus grupos activos:
 * - Todos escuchan "locationStatus" ({ sharing, paused?, lat?, lng?, updatedAt?, ageMs?, reason? }),
 *   "updateBus" y "busArrived". paused: el conductor perdió la conexión y lo que
 *   llega es solo su última posición conocida.
 * - Solo el conductor (DRIVER_ROLE) emite "startSharing" / "busLocation" /
 *   "stopSharing" para compartir su GPS mientras tiene la ruta iniciada.
 */
export function connectLocationSocket() {
  if (socket) return socket;
  socket = io(ENDPOINTS.LOCATION, {
    transports: ['websocket'],
    reconnection: true,
    // Función: en cada reconexión se envía el token vigente (puede haberse renovado)
    auth: (cb) => cb({ token: useAuthStore.getState().token }),
  });
  return socket;
}

export function onUpdateBus(callback) {
  socket?.on('updateBus', callback);
}
export function onBusArrived(callback) {
  socket?.on('busArrived', callback);
}
export function onLocationStatus(callback) {
  socket?.on('locationStatus', callback);
}
export function onConnectionChange(onConnect, onDisconnect, onError) {
  socket?.on('connect', onConnect);
  socket?.on('disconnect', onDisconnect);
  if (onError) socket?.on('connect_error', onError);
}
/**
 * Reconecta si el socket quedó detenido (p. ej. el servidor rechazó el token). No hace nada
 * si ya está conectado o si Socket.IO ya está reintentando: nunca abre una segunda conexión.
 */
export function reconnectLocationSocket() {
  if (socket && !socket.connected && !socket.active) socket.connect();
}
export function isLocationSocketConnected() {
  return Boolean(socket?.connected);
}
/** true mientras Socket.IO reintenta por su cuenta (cortes de red); false si el servidor lo rechazó. */
export function isLocationSocketActive() {
  return Boolean(socket?.active);
}
/** El conductor empieza a compartir su ubicación con sus grupos. */
export function emitStartSharing() {
  socket?.emit('startSharing');
}
/** El conductor deja de compartir su ubicación. */
export function emitStopSharing() {
  socket?.emit('stopSharing');
}
/**
 * Emite la posición GPS del bus ({ lat, lng, timestamp }). Uso exclusivo del conductor.
 * volatile: sin conexión se descarta en vez de acumularse y llegar tarde y en ráfaga.
 */
export function emitBusLocation(coords) {
  socket?.volatile.emit('busLocation', coords);
}
export function disconnectLocationSocket() {
  if (socket) {
    socket.off('updateBus');
    socket.off('busArrived');
    socket.off('locationStatus');
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.disconnect();
    socket = null;
  }
}
