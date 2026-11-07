import {
  ACTIVE_STATUS,
  DEFAULT_DESTINATION,
  createTrip,
  getActiveTrip,
  getRouteConfig,
  getTripHistory,
  normalizeCoordinate,
  normalizeDestination,
  saveRouteConfig,
  saveTrip,
} from './itinerary.store.js';
import { calculateDrivingRoute } from './route.service.js';

const metersBetween = (a, b) => {
  const toRadians = (value) => value * Math.PI / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const distanceToRouteMeters = (point, geometry) => {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return Infinity;
  const latitudeScale = 111320;
  const longitudeScale = latitudeScale * Math.cos(point.lat * Math.PI / 180);
  let minimum = Infinity;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const ax = (previous[0] - point.lng) * longitudeScale;
    const ay = (previous[1] - point.lat) * latitudeScale;
    const bx = (current[0] - point.lng) * longitudeScale;
    const by = (current[1] - point.lat) * latitudeScale;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
    minimum = Math.min(minimum, Math.hypot(ax + projection * dx, ay + projection * dy));
  }
  return minimum;
};

const configuredMeters = (name, fallback, minimum = 0) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
};

export const GPS_STALE_AFTER_MS = configuredMeters('GPS_STALE_AFTER_MS', 20000, 1000);

export const getGroupItinerary = async (groupId, driverId = null) => {
  const [config, activeTrip, history] = await Promise.all([
    getRouteConfig(groupId, driverId),
    getActiveTrip(groupId),
    getTripHistory(groupId, 1),
  ]);
  const gpsStale = activeTrip && (
    activeTrip.gpsStatus !== 'CONECTADO'
    || !activeTrip.lastLocationAt
    || Date.now() - new Date(activeTrip.lastLocationAt).getTime() > GPS_STALE_AFTER_MS
  );
  const withLocationAge = (trip) => trip ? {
    ...trip,
    locationAgeMs: trip.lastLocationAt
      ? Math.max(0, Date.now() - new Date(trip.lastLocationAt).getTime())
      : null,
  } : null;
  return {
    ...config,
    destination: normalizeDestination(config.destination ?? DEFAULT_DESTINATION),
    activeTrip: activeTrip ? {
      ...activeTrip,
      gpsStatus: gpsStale ? 'DESCONECTADO' : activeTrip.gpsStatus,
      locationAgeMs: activeTrip.lastLocationAt
        ? Math.max(0, Date.now() - new Date(activeTrip.lastLocationAt).getTime())
        : null,
    } : null,
    lastTrip: withLocationAge(history[0] ?? null),
    status: activeTrip?.status ?? history[0]?.status ?? 'PENDIENTE',
    gpsStatus: activeTrip
      ? gpsStale ? 'DESCONECTADO' : activeTrip.gpsStatus
      : 'ESPERANDO_GPS',
  };
};

export const startGroupTrip = async ({ groupId, driverId, origin, vehicleId = null }) => {
  if (await getActiveTrip(groupId)) {
    throw Object.assign(new Error('Este grupo ya tiene un recorrido en curso.'), { statusCode: 409 });
  }
  const validOrigin = normalizeCoordinate(origin, 'origen');
  const config = await getRouteConfig(groupId, driverId);
  const route = await calculateDrivingRoute(validOrigin, config.destination);
  return createTrip({
    groupId,
    driverId,
    vehicleId,
    origin: validOrigin,
    destination: config.destination,
    ...route,
  });
};

export const changeGroupDestination = async ({ groupId, driverId, destination }) => {
  const validDestination = normalizeDestination(destination);
  const activeTrip = await getActiveTrip(groupId);
  let nextTrip = activeTrip;

  if (activeTrip) {
    const recent = activeTrip.lastLocationAt
      && Date.now() - new Date(activeTrip.lastLocationAt).getTime() <= GPS_STALE_AFTER_MS;
    if (!activeTrip.currentLocation || !recent) {
      throw Object.assign(
        new Error('No se puede recalcular el recorrido porque no hay una ubicación GPS actual.'),
        { statusCode: 409 },
      );
    }
    const route = await calculateDrivingRoute(activeTrip.currentLocation, validDestination);
    nextTrip = await saveTrip({
      ...activeTrip,
      destination: validDestination,
      ...route,
      lastRerouteAt: new Date(),
      arrivalFixes: 0,
      lastArrivalTimestamp: null,
    });
  }

  const config = await saveRouteConfig({ groupId, driverId, destination: validDestination });
  return { config, activeTrip: nextTrip };
};

export const acceptGroupLocation = async ({ groupId, point }) => {
  const location = normalizeCoordinate(point, 'ubicación GPS');
  const timestamp = Number(point.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now() + 300000) {
    throw Object.assign(new Error('La marca de tiempo GPS no es válida.'), { statusCode: 400 });
  }

  const trip = await getActiveTrip(groupId);
  if (!trip) throw Object.assign(new Error('No hay un recorrido activo para este grupo.'), { statusCode: 409 });
  if (trip.lastLocationTimestamp !== null && timestamp <= trip.lastLocationTimestamp) {
    return { trip, duplicate: true, rerouted: false, completed: false };
  }

  const now = new Date();
  const accuracy = Number(point.accuracy);
  const hasAccuracy = point.accuracy !== null
    && point.accuracy !== undefined
    && point.accuracy !== '';
  const unchanged = trip.currentLocation
    && metersBetween(location, trip.currentLocation) < 1;
  const next = {
    ...trip,
    currentLocation: location,
    lastLocationAt: now,
    lastLocationTimestamp: timestamp,
    gpsStatus: 'CONECTADO',
    track: unchanged
      ? trip.track ?? []
      : [...(trip.track ?? []), { ...location, timestamp }].slice(-5000),
  };
  const arrivalRadius = configuredMeters('ARRIVAL_RADIUS_METERS', 50, 5);
  const arrivalAccuracyLimit = configuredMeters('ARRIVAL_MAX_GPS_ACCURACY_METERS', 35, 5);
  const reached = metersBetween(location, next.destination) <= arrivalRadius
    && hasAccuracy
    && Number.isFinite(accuracy)
    && accuracy >= 0
    && accuracy <= arrivalAccuracyLimit;
  if (!reached) {
    next.arrivalFixes = 0;
    next.lastArrivalTimestamp = null;
  } else if (
    !trip.lastArrivalTimestamp
    || timestamp - trip.lastArrivalTimestamp >= 1000
  ) {
    next.arrivalFixes = (trip.arrivalFixes ?? 0) + 1;
    next.lastArrivalTimestamp = timestamp;
  }

  const deviationLimit = configuredMeters('ROUTE_DEVIATION_METERS', 100, 10);
  const rerouteCooldown = configuredMeters('ROUTE_REROUTE_COOLDOWN_MS', 30000, 1000);
  const cooldownElapsed = !trip.lastRerouteAt
    || now.getTime() - new Date(trip.lastRerouteAt).getTime() >= rerouteCooldown;
  let rerouted = false;
  let routeError = null;
  if (cooldownElapsed && distanceToRouteMeters(location, trip.geometry) > deviationLimit) {
    try {
      const route = await calculateDrivingRoute(location, trip.destination);
      Object.assign(next, route, { lastRerouteAt: now });
      rerouted = true;
    } catch (error) {
      routeError = error.message;
    }
  }

  const completed = next.arrivalFixes >= 2;
  if (completed) {
    next.status = 'COMPLETADO';
    next.endedAt = now;
  }
  const saved = await saveTrip(next);
  return { trip: saved, duplicate: Boolean(unchanged), rerouted, routeError, completed };
};

export const interruptGroupTrip = async (groupId) => {
  const trip = await getActiveTrip(groupId);
  if (!trip) throw Object.assign(new Error('No hay un recorrido en curso para interrumpir.'), { statusCode: 409 });
  return saveTrip({ ...trip, status: 'INTERRUMPIDO', gpsStatus: 'DESCONECTADO', endedAt: new Date() });
};

export const markGroupGpsDisconnected = async (groupId) => {
  const trip = await getActiveTrip(groupId);
  if (!trip || trip.gpsStatus === 'DESCONECTADO') return null;
  const recent = trip.lastLocationAt
    && Date.now() - new Date(trip.lastLocationAt).getTime() <= GPS_STALE_AFTER_MS;
  if (recent) return null;
  return saveTrip({ ...trip, gpsStatus: 'DESCONECTADO' });
};

export const getGroupTripHistory = (groupId) => getTripHistory(groupId, 100);

export const isTripInProgress = (trip) => trip?.status === ACTIVE_STATUS;
