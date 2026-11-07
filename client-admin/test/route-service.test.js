import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDrivingRoute, formatDistance, formatDuration } from '../src/features/location/services/routeService.js';

const origin = { lat: 14.61, lng: -90.55 };
const destination = { lat: 14.6258, lng: -90.536 };
const routeResponse = {
  code: 'Ok',
  routes: [{
    geometry: {
      type: 'LineString',
      coordinates: [[-90.55, 14.61], [-90.545, 14.618], [-90.536, 14.6258]],
    },
    distance: 3400,
    duration: 720,
  }],
};

test('solicita geometría GeoJSON con perfil driving y devuelve métricas', async () => {
  let requestUrl;
  const route = await fetchDrivingRoute(origin, destination, {
    baseUrl: 'https://routing.example/route/v1/driving',
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return { ok: true, json: async () => routeResponse };
    },
  });

  assert.equal(requestUrl.pathname, '/route/v1/driving/-90.55,14.61;-90.536,14.6258');
  assert.equal(requestUrl.searchParams.get('overview'), 'full');
  assert.equal(requestUrl.searchParams.get('geometries'), 'geojson');
  assert.equal(route.geometry.type, 'LineString');
  assert.equal(route.distance, 3400);
  assert.equal(route.duration, 720);
});

test('rechaza coordenadas inválidas antes de llamar al servicio', async () => {
  let requested = false;
  await assert.rejects(
    fetchDrivingRoute({ lat: 91, lng: -90 }, destination, {
      fetchImpl: async () => { requested = true; },
    }),
    /Coordenadas de origen no válidas/,
  );
  assert.equal(requested, false);
});

test('informa con claridad cuando OSRM no encuentra recorrido', async () => {
  await assert.rejects(
    fetchDrivingRoute(origin, destination, {
      fetchImpl: async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }),
    }),
    /No se encontró una ruta vehicular/,
  );
});

test('formatea distancia y duración de la ruta', () => {
  assert.equal(formatDistance(850), '850 m');
  assert.equal(formatDistance(3400), '3.4 km');
  assert.equal(formatDuration(720), '12 min');
  assert.equal(formatDuration(3660), '1 h 1 min');
});
