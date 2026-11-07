import { fetchGroupAccess } from './itinerary.auth.js';
import {
  acceptGroupLocation,
  changeGroupDestination,
  getGroupItinerary,
  interruptGroupTrip,
  markGroupGpsDisconnected,
  startGroupTrip,
} from './itinerary.service.js';
import { getActiveTrips, itineraryRoomName, normalizeCoordinate } from './itinerary.store.js';

const groupIdsFor = (access) => {
  if (access.role === 'DRIVER_ROLE') return [...new Set(access.ownedGroupIds ?? [])];
  if (['USER_ROLE', 'PASSENGER_ROLE'].includes(access.role) && access.memberGroupId) {
    return [access.memberGroupId];
  }
  return [];
};

const canAccessGroup = (access, groupId) => groupIdsFor(access).includes(String(groupId));
const isDriverForGroup = (access, groupId) =>
  access.role === 'DRIVER_ROLE' && canAccessGroup(access, groupId);
const respond = (ack, result) => {
  if (typeof ack === 'function') ack(result);
};

const emitGroup = (io, groupId, event, payload) =>
  io.to(itineraryRoomName(groupId)).emit(event, payload);

export const registerItinerarySocket = (io, { getAccess = fetchGroupAccess } = {}) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || !token) return next(new Error('UNAUTHORIZED'));
    try {
      const access = await getAccess(token);
      if (!access?.userId || !access?.role) return next(new Error('UNAUTHORIZED'));
      socket.data.access = access;
      return next();
    } catch (error) {
      console.error(`No se pudo verificar el acceso a los recorridos: ${error.message}`);
      return next(new Error('ACCESS_UNAVAILABLE'));
    }
  });

  io.on('connection', (socket) => {
    const access = socket.data.access;

    socket.on('itinerary:subscribe', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!canAccessGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'No tienes acceso a este grupo.' });
      }
      socket.join(itineraryRoomName(groupId));
      try {
        const state = await getGroupItinerary(groupId, access.userId);
        socket.emit('itinerary:state', state);
        return respond(ack, { success: true });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });

    socket.on('itinerary:unsubscribe', (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!canAccessGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'No tienes acceso a este grupo.' });
      }
      socket.leave(itineraryRoomName(groupId));
      return respond(ack, { success: true });
    });

    socket.on('itinerary:sync', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!canAccessGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'No tienes acceso a este grupo.' });
      }
      try {
        const state = await getGroupItinerary(groupId, access.userId);
        socket.emit('itinerary:state', state);
        return respond(ack, { success: true, data: state });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });

    socket.on('itinerary:start', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!isDriverForGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'Solo el conductor asignado puede iniciar este recorrido.' });
      }
      try {
        const origin = normalizeCoordinate(payload.origin, 'origen GPS');
        const trip = await startGroupTrip({
          groupId, driverId: access.userId, origin, vehicleId: payload.vehicleId ?? null,
        });
        const state = await getGroupItinerary(groupId, access.userId);
        emitGroup(io, groupId, 'itinerary:started', { groupId, trip });
        emitGroup(io, groupId, 'itinerary:state', state);
        return respond(ack, { success: true, data: trip });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });

    socket.on('itinerary:destination', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!isDriverForGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'Solo el conductor asignado puede cambiar el destino.' });
      }
      try {
        const result = await changeGroupDestination({
          groupId, driverId: access.userId, destination: payload.destination,
        });
        const update = {
          groupId,
          destination: result.config.destination,
          activeTrip: result.activeTrip,
        };
        emitGroup(io, groupId, 'itinerary:destination', update);
        if (result.activeTrip) emitGroup(io, groupId, 'itinerary:route', update);
        return respond(ack, { success: true, data: update });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });

    socket.on('itinerary:location', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!isDriverForGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'Solo el conductor asignado puede enviar ubicaciones.' });
      }
      try {
        const result = await acceptGroupLocation({ groupId, point: payload.point });
        if (!result.duplicate) {
          emitGroup(io, groupId, 'itinerary:location', {
            groupId, tripId: result.trip.tripId, location: result.trip.currentLocation,
            updatedAt: result.trip.lastLocationAt,
          });
        }
        emitGroup(io, groupId, 'itinerary:gps-status', {
          groupId, tripId: result.trip.tripId, status: result.trip.gpsStatus,
          updatedAt: result.trip.lastLocationAt,
        });
        if (result.rerouted) {
          emitGroup(io, groupId, 'itinerary:route', { groupId, trip: result.trip });
        }
        if (result.routeError) {
          emitGroup(io, groupId, 'itinerary:error', { groupId, message: result.routeError });
        }
        if (result.completed) {
          emitGroup(io, groupId, 'itinerary:completed', { groupId, trip: result.trip });
        }
        return respond(ack, { success: true, data: result.trip, duplicate: result.duplicate });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });

    socket.on('itinerary:interrupt', async (payload = {}, ack) => {
      const groupId = String(payload.groupId ?? '');
      if (!isDriverForGroup(access, groupId)) {
        return respond(ack, { success: false, message: 'Solo el conductor asignado puede interrumpir este recorrido.' });
      }
      try {
        const trip = await interruptGroupTrip(groupId);
        emitGroup(io, groupId, 'itinerary:interrupted', { groupId, trip });
        return respond(ack, { success: true, data: trip });
      } catch (error) {
        return respond(ack, { success: false, message: error.message });
      }
    });
  });

  const gpsMonitor = setInterval(async () => {
    try {
      const stale = await getActiveTrips();
      await Promise.all(stale.map(async (trip) => {
        const updated = await markGroupGpsDisconnected(trip.groupId);
        if (updated) emitGroup(io, trip.groupId, 'itinerary:gps-status', {
          groupId: trip.groupId,
          status: 'DESCONECTADO',
        });
      }));
    } catch (error) {
      console.error(`No se pudo revisar el estado GPS de los recorridos: ${error.message}`);
    }
  }, 5000);
  gpsMonitor.unref?.();

  return { dispose: () => clearInterval(gpsMonitor) };
};
