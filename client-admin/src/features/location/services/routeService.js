function assertCoordinate(point, name) {
  if (
    !point
    || !Number.isFinite(point.lat)
    || !Number.isFinite(point.lng)
    || point.lat < -90
    || point.lat > 90
    || point.lng < -180
    || point.lng > 180
  ) {
    throw new Error(`Coordenadas de ${name} no válidas.`);
  }
}

export async function fetchDrivingRoute(origin, destination, {
  baseUrl = 'https://router.project-osrm.org/route/v1/driving',
  fetchImpl = fetch,
  signal,
} = {}) {
  assertCoordinate(origin, 'origen');
  assertCoordinate(destination, 'destino');

  const endpoint = baseUrl.replace(/\/+$/, '');
  const url = new URL(
    `${endpoint}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`,
  );
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');

  const response = await fetchImpl(url, { signal });
  if (!response.ok) {
    throw new Error(`El servicio de rutas respondió con el estado ${response.status}.`);
  }

  const result = await response.json();
  const route = result?.routes?.[0];
  if (
    result?.code !== 'Ok'
    || !route
    || route.geometry?.type !== 'LineString'
    || !Array.isArray(route.geometry.coordinates)
    || route.geometry.coordinates.length < 2
    || !Number.isFinite(route.distance)
    || !Number.isFinite(route.duration)
  ) {
    throw new Error('No se encontró una ruta vehicular entre el origen y el destino.');
  }

  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration,
  };
}

export function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours} h ${remainingMinutes} min` : `${minutes} min`;
}
