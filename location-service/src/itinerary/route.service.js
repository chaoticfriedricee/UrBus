import { normalizeCoordinate } from './itinerary.store.js';

const DEFAULT_OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export const calculateDrivingRoute = async (origin, destination, {
  baseUrl = process.env.OSRM_URL || DEFAULT_OSRM_URL,
  fetchImpl = fetch,
  timeoutMs = 10000,
} = {}) => {
  const start = normalizeCoordinate(origin, 'origen');
  const end = normalizeCoordinate(destination, 'destino');
  const endpoint = baseUrl.replace(/\/+$/, '');
  const url = `${endpoint}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=false`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`OSRM respondió con el estado ${response.status}.`);

  const result = await response.json();
  const route = result?.routes?.[0];
  if (
    result?.code !== 'Ok'
    || route?.geometry?.type !== 'LineString'
    || !Array.isArray(route.geometry.coordinates)
    || route.geometry.coordinates.length < 2
    || !Number.isFinite(route.distance)
    || !Number.isFinite(route.duration)
    || route.geometry.coordinates.some((point) =>
      !Array.isArray(point)
      || point.length < 2
      || !Number.isFinite(point[0])
      || !Number.isFinite(point[1])
      || Math.abs(point[0]) > 180
      || Math.abs(point[1]) > 90)
  ) {
    throw new Error('OSRM devolvió una ruta inválida o no encontró un recorrido.');
  }

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
};
