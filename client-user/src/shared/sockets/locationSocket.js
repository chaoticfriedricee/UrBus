// src/shared/sockets/locationSocket.js
import { io } from 'socket.io-client';
import { ENDPOINTS } from '../constants/endpoints';
import useAuthStore from '../store/authStore';

let socket = null;

/**
 * Conecta al namespace raíz de location-service, autenticado con el token.
 * location-service solo entrega la ubicación del conductor a él mismo y a los
 * pasajeros de sus grupos activos:
 * - Todos escuchan "locationStatus" ({ sharing, lat?, lng?, reason? }),
 *   "updateBus" y "busArrived".
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
export function reconnectLocationSocket() {
  socket?.connect();
}
/** El conductor empieza a compartir su ubicación con sus grupos. */
export function emitStartSharing() {
  socket?.emit('startSharing');
}
/** El conductor deja de compartir su ubicación. */
export function emitStopSharing() {
  socket?.emit('stopSharing');
}
/** Emite la posición GPS del bus. Uso exclusivo del conductor. */
export function emitBusLocation(coords) {
  socket?.emit('busLocation', coords);
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
