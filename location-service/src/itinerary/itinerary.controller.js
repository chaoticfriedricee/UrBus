import {
  changeGroupDestination,
  getGroupItinerary,
  getGroupTripHistory,
  interruptGroupTrip,
  startGroupTrip,
} from './itinerary.service.js';
import { itineraryRoomName } from './itinerary.store.js';

const respondWithError = (res, error) => res.status(error.statusCode || 502).json({
  success: false,
  message: error.message || 'No se pudo completar la operación del recorrido.',
});

const emit = (req, groupId, event, payload) => {
  req.app.locals.io?.to(itineraryRoomName(groupId)).emit(event, payload);
};

export const getMyItineraryAccess = (req, res) => res.status(200).json({
  success: true,
  data: {
    userId: req.user.id,
    role: req.user.role,
    ownedGroupIds: req.groupAccess.ownedGroupIds ?? [],
    memberGroupId: req.groupAccess.memberGroupId ?? null,
  },
});

export const getItinerary = async (req, res) => {
  try {
    const data = await getGroupItinerary(
      req.params.groupId,
      req.user.role === 'DRIVER_ROLE' ? req.user.id : null,
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return respondWithError(res, error);
  }
};

export const updateItinerary = async (req, res) => {
  try {
    const result = await changeGroupDestination({
      groupId: req.params.groupId,
      driverId: req.user.id,
      destination: req.body?.destination,
    });
    const payload = {
      groupId: req.params.groupId,
      destination: result.config.destination,
      activeTrip: result.activeTrip,
    };
    emit(req, req.params.groupId, 'itinerary:destination', payload);
    if (result.activeTrip) emit(req, req.params.groupId, 'itinerary:route', payload);
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return respondWithError(res, error);
  }
};

export const startItineraryTrip = async (req, res) => {
  try {
    const trip = await startGroupTrip({
      groupId: req.params.groupId,
      driverId: req.user.id,
      origin: req.body?.origin,
      vehicleId: req.body?.vehicleId ?? null,
    });
    emit(req, req.params.groupId, 'itinerary:started', { groupId: req.params.groupId, trip });
    emit(req, req.params.groupId, 'itinerary:state', await getGroupItinerary(req.params.groupId, req.user.id));
    return res.status(201).json({ success: true, data: trip });
  } catch (error) {
    return respondWithError(res, error);
  }
};

export const interruptItineraryTrip = async (req, res) => {
  try {
    const trip = await interruptGroupTrip(req.params.groupId);
    emit(req, req.params.groupId, 'itinerary:interrupted', { groupId: req.params.groupId, trip });
    emit(req, req.params.groupId, 'itinerary:state', await getGroupItinerary(req.params.groupId, req.user.id));
    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    return respondWithError(res, error);
  }
};

export const getItineraryHistory = async (req, res) => {
  try {
    const trips = await getGroupTripHistory(req.params.groupId);
    return res.status(200).json({ success: true, data: trips });
  } catch (error) {
    return respondWithError(res, error);
  }
};
