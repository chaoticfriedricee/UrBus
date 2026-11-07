// src/shared/sockets/locationSocket.js
import { io } from 'socket.io-client';
import { ENDPOINTS } from '../constants/endpoints';
import useAuthStore from '../store/authStore';

let socket = null;

/**
 * Conecta al namespace raíz de location-service, autenticado con el token.
 * Las lecturas, rutas e historial se transmiten solo a la sala autorizada del grupo.
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

export function onItineraryState(callback) {
  socket?.on('itinerary:state', callback);
}
export function onItineraryLocation(callback) {
  socket?.on('itinerary:location', callback);
}
export function onItineraryDestination(callback) {
  socket?.on('itinerary:destination', callback);
}
export function onItineraryRoute(callback) {
  socket?.on('itinerary:route', callback);
}
export function onItineraryInterrupted(callback) {
  socket?.on('itinerary:interrupted', callback);
}
export function onItineraryCompleted(callback) {
  socket?.on('itinerary:completed', callback);
}
export function onItineraryGpsStatus(callback) {
  socket?.on('itinerary:gps-status', callback);
}
export function subscribeItineraryGroup(groupId) {
  if (!groupId) return;
  socket?.emit('itinerary:subscribe', { groupId });
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
/**
 * Emite la posición GPS del bus ({ lat, lng, timestamp }). Uso exclusivo del conductor.
 * volatile: sin conexión se descarta en vez de acumularse y llegar tarde y en ráfaga.
 */
export function emitBusLocation(groupId, point) {
  if (groupId) socket?.volatile.emit('itinerary:location', { groupId, point });
}
export function disconnectLocationSocket() {
  if (socket) {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('itinerary:state');
    socket.off('itinerary:location');
    socket.off('itinerary:destination');
    socket.off('itinerary:route');
    socket.off('itinerary:interrupted');
    socket.off('itinerary:completed');
    socket.off('itinerary:gps-status');
    socket.disconnect();
    socket = null;
  }
}
