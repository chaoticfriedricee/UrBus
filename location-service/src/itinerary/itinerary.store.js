import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { ItineraryRoute, ItineraryTrip } from './itinerary.models.js';

export const DEFAULT_DESTINATION = Object.freeze({ lat: 14.6258, lng: -90.536 });
export const ACTIVE_STATUS = 'EN_CURSO';
export const itineraryRoomName = (groupId) => `itinerary:${groupId}`;

const storagePath = process.env.ITINERARY_JSON_FALLBACK_PATH
  ? path.resolve(process.env.ITINERARY_JSON_FALLBACK_PATH)
  : path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'itineraries.json');
const storageDir = path.dirname(storagePath);
const useMongo = () => mongoose.connection.readyState === 1;
const useJsonFallback = () => {
  if (useMongo()) return false;
  if (process.env.ITINERARY_JSON_FALLBACK === 'true') return true;
  throw new Error(
    `MongoDB no está conectado (readyState=${mongoose.connection.readyState}); no se usará almacenamiento JSON. Comprueba URI_MONGODB y la conexión.`,
  );
};

const ensureStorage = () => {
  mkdirSync(storageDir, { recursive: true });
  if (!existsSync(storagePath)) writeFileSync(storagePath, '{"routes":{},"trips":[]}\n', 'utf8');
};

const readStore = () => {
  ensureStorage();
  const parsed = JSON.parse(readFileSync(storagePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !parsed.routes || !Array.isArray(parsed.trips)) {
    throw new Error('El almacenamiento local de recorridos está dañado.');
  }
  return parsed;
};

const writeStore = (store) => {
  ensureStorage();
  const temporaryPath = `${storagePath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  renameSync(temporaryPath, storagePath);
};

const toTrip = (doc) => {
  if (!doc) return null;
  const result = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, ...trip } = result;
  return trip;
};

export const normalizeDestination = (point) => normalizeCoordinate(point, 'destino');

export const normalizeCoordinate = (point, label = 'coordenada') => {
  if (point?.lat === null || point?.lat === undefined || point?.lng === null || point?.lng === undefined
    || point.lat === '' || point.lng === '') {
    throw Object.assign(new Error(`Coordenadas de ${label} inválidas.`), { statusCode: 400 });
  }
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw Object.assign(new Error(`Coordenadas de ${label} inválidas.`), { statusCode: 400 });
  }
  return { lat, lng };
};

export const getRouteConfig = async (groupId, driverId = null) => {
  if (useMongo()) {
    const config = await ItineraryRoute.findOneAndUpdate(
      { groupId },
      { $setOnInsert: { groupId, driverId, destination: DEFAULT_DESTINATION } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return config;
  }
  useJsonFallback();

  const store = readStore();
  if (!store.routes[groupId]) {
    store.routes[groupId] = {
      groupId, driverId, destination: DEFAULT_DESTINATION,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    writeStore(store);
  }
  return store.routes[groupId];
};

export const saveRouteConfig = async ({ groupId, driverId, destination }) => {
  const normalized = normalizeDestination(destination);
  if (useMongo()) {
    return ItineraryRoute.findOneAndUpdate(
      { groupId },
      { $set: { driverId, destination: normalized } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
  }
  useJsonFallback();

  const store = readStore();
  const current = store.routes[groupId] ?? {
    groupId, createdAt: new Date().toISOString(),
  };
  const result = { ...current, driverId, destination: normalized, updatedAt: new Date().toISOString() };
  store.routes[groupId] = result;
  writeStore(store);
  return result;
};

export const createTrip = async (tripData) => {
  const trip = {
    tripId: randomUUID(),
    ...tripData,
    status: ACTIVE_STATUS,
    gpsStatus: 'CONECTADO',
    arrivalFixes: 0,
    lastRerouteAt: null,
    track: [{ ...tripData.origin, timestamp: tripData.origin.timestamp ?? Date.now() }],
    currentLocation: tripData.origin,
    lastLocationAt: new Date(),
    lastLocationTimestamp: tripData.origin.timestamp ?? Date.now(),
    startedAt: new Date(),
    endedAt: null,
  };

  if (useMongo()) {
    try {
      const created = await ItineraryTrip.create(trip);
      return toTrip(created);
    } catch (error) {
      if (error?.code === 11000) {
        throw Object.assign(new Error('Este grupo ya tiene un recorrido en curso.'), { statusCode: 409 });
      }
      throw error;
    }
  }

  useJsonFallback();
  const store = readStore();
  if (store.trips.some((entry) => entry.groupId === trip.groupId && entry.status === ACTIVE_STATUS)) {
    throw Object.assign(new Error('Este grupo ya tiene un recorrido en curso.'), { statusCode: 409 });
  }
  store.trips.push(trip);
  writeStore(store);
  return trip;
};

export const getActiveTrip = async (groupId) => {
  if (useMongo()) {
    return toTrip(await ItineraryTrip.findOne({ groupId, status: ACTIVE_STATUS }).lean());
  }
  useJsonFallback();
  return readStore().trips.find((trip) => trip.groupId === groupId && trip.status === ACTIVE_STATUS) ?? null;
};

export const getTrip = async (tripId) => {
  if (useMongo()) return toTrip(await ItineraryTrip.findOne({ tripId }).lean());
  useJsonFallback();
  return readStore().trips.find((trip) => trip.tripId === tripId) ?? null;
};

export const saveTrip = async (trip) => {
  if (useMongo()) {
    const { _id, __v, ...fields } = trip;
    const saved = await ItineraryTrip.findOneAndUpdate(
      { tripId: trip.tripId }, { $set: fields }, { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!saved) throw new Error(`No se encontró el recorrido ${trip.tripId} para actualizar.`);
    return toTrip(saved);
  }

  useJsonFallback();
  const store = readStore();
  const index = store.trips.findIndex((entry) => entry.tripId === trip.tripId);
  if (index < 0) throw new Error(`No se encontró el recorrido ${trip.tripId} para actualizar.`);
  store.trips[index] = trip;
  writeStore(store);
  return trip;
};

export const getTripHistory = async (groupId, limit = 50) => {
  if (useMongo()) {
    const trips = await ItineraryTrip.find({ groupId })
      .sort({ startedAt: -1 }).limit(limit).lean();
    return trips.map(toTrip);
  }
  useJsonFallback();
  return readStore().trips
    .filter((trip) => trip.groupId === groupId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, limit);
};

export const getActiveTrips = async () => {
  if (useMongo()) return (await ItineraryTrip.find({ status: ACTIVE_STATUS }).lean()).map(toTrip);
  useJsonFallback();
  return readStore().trips.filter((trip) => trip.status === ACTIVE_STATUS);
};
