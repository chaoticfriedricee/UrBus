import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.JWT_SECRET = 'itinerary-test-secret';
process.env.JWT_ISSUER = 'UrBus';
process.env.JWT_AUDIENCE = 'UrBus';
process.env.ITINERARY_JSON_FALLBACK = 'true';
const fallbackStoragePath = path.join(tmpdir(), `urbus-itinerary-test-${randomUUID()}.json`);
process.env.ITINERARY_JSON_FALLBACK_PATH = fallbackStoragePath;

const { signToken, verifyToken } = await import('../src/itinerary/itinerary.auth.js');
const { createServer } = await import('../configs/app.js');
const prefix = `itinerary-${randomUUID()}`;
const groupA = `${prefix}-a`;
const groupB = `${prefix}-b`;
const outsiderGroup = `${prefix}-other`;
const origin = { lat: 14.61, lng: -90.55, accuracy: 10, timestamp: Date.now() };
const destination = { lat: 14.64, lng: -90.52 };

const accessByUser = {
  driverA: { userId: 'driverA', role: 'DRIVER_ROLE', ownedGroupIds: [groupA, groupB], memberGroupId: null },
  driverB: { userId: 'driverB', role: 'DRIVER_ROLE', ownedGroupIds: [outsiderGroup], memberGroupId: null },
  passengerA: { userId: 'passengerA', role: 'USER_ROLE', ownedGroupIds: [], memberGroupId: groupA },
  passengerB: { userId: 'passengerB', role: 'PASSENGER_ROLE', ownedGroupIds: [], memberGroupId: groupB },
};

const tokenFor = (userId, role) => signToken(userId, role);
const driverToken = tokenFor('driverA', 'DRIVER_ROLE');
const passengerToken = tokenFor('passengerA', 'USER_ROLE');
const passengerBToken = tokenFor('passengerB', 'PASSENGER_ROLE');

let server;
let io;
let osrmServer;
let baseUrl;
let osrmCalls = 0;

before(async () => {
  osrmServer = http.createServer((req, res) => {
    osrmCalls += 1;
    const coordinatePath = new URL(req.url, 'http://localhost').pathname.split('/').pop();
    const coordinates = coordinatePath.split(';').map((point) => point.split(',').map(Number));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 'Ok',
      routes: [{
        geometry: { type: 'LineString', coordinates },
        distance: 1800,
        duration: 540,
      }],
    }));
  });
  await new Promise((resolve) => osrmServer.listen(0, '127.0.0.1', resolve));
  process.env.OSRM_URL = `http://127.0.0.1:${osrmServer.address().port}/route/v1/driving`;

  const created = createServer({
    getAccess: async (token) => {
      try {
        const decoded = verifyToken(token);
        return accessByUser[decoded.sub] ?? null;
      } catch {
        return null;
      }
    },
  });
  server = created.server;
  io = created.io;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => io.close(resolve));
  await new Promise((resolve) => osrmServer.close(resolve));
  rmSync(fallbackStoragePath, { force: true });
});

const request = async (method, path, token, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, payload: await response.json() };
};

test('devuelve los grupos autorizados para los selectores web y móvil', async () => {
  const driverAccess = await request('GET', '/urbus/v1/itineraries/access', driverToken);
  const passengerAccess = await request('GET', '/urbus/v1/itineraries/access', passengerToken);
  const noToken = await request('GET', '/urbus/v1/itineraries/access', null);

  assert.equal(driverAccess.status, 200);
  assert.deepEqual(driverAccess.payload.data.ownedGroupIds, [groupA, groupB]);
  assert.equal(passengerAccess.status, 200);
  assert.equal(passengerAccess.payload.data.memberGroupId, groupA);
  assert.equal(noToken.status, 401);
});

test('destinos independientes y predeterminado Kinal por grupo', async () => {
  const initialA = await request('GET', `/urbus/v1/itineraries/${groupA}`, driverToken);
  const initialB = await request('GET', `/urbus/v1/itineraries/${groupB}`, driverToken);
  assert.equal(initialA.status, 200);
  assert.deepEqual(initialA.payload.data.destination, { lat: 14.6258, lng: -90.536 });
  assert.deepEqual(initialB.payload.data.destination, { lat: 14.6258, lng: -90.536 });
  assert.equal(initialA.payload.data.status, 'PENDIENTE');

  const changed = await request('PUT', `/urbus/v1/itineraries/${groupA}`, driverToken, { destination });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.payload.data.destination, destination);
  const unchanged = await request('GET', `/urbus/v1/itineraries/${groupB}`, driverToken);
  assert.deepEqual(unchanged.payload.data.destination, { lat: 14.6258, lng: -90.536 });
});

test('no oculta una desconexión de MongoDB con el almacenamiento JSON por defecto', async () => {
  const { getRouteConfig } = await import('../src/itinerary/itinerary.store.js');
  const previous = process.env.ITINERARY_JSON_FALLBACK;
  delete process.env.ITINERARY_JSON_FALLBACK;
  try {
    await assert.rejects(
      getRouteConfig(`${prefix}-mongo-disconnected`),
      /MongoDB no está conectado.*no se usará almacenamiento JSON/,
    );
  } finally {
    process.env.ITINERARY_JSON_FALLBACK = previous;
  }
});

test('inicia un recorrido manual con ruta OSRM y rechaza otro activo del grupo', async () => {
  const before = osrmCalls;
  const started = await request('POST', `/urbus/v1/itineraries/${groupA}/trips`, driverToken, { origin });
  assert.equal(started.status, 201);
  assert.equal(started.payload.data.groupId, groupA);
  assert.equal(started.payload.data.driverId, 'driverA');
  assert.equal(started.payload.data.status, 'EN_CURSO');
  assert.deepEqual(started.payload.data.origin, { lat: origin.lat, lng: origin.lng });
  assert.deepEqual(started.payload.data.destination, destination);
  assert.equal(started.payload.data.geometry.type, 'LineString');
  assert.equal(osrmCalls, before + 1);

  const duplicate = await request('POST', `/urbus/v1/itineraries/${groupA}/trips`, driverToken, { origin });
  assert.equal(duplicate.status, 409);

  const passengerView = await request('GET', `/urbus/v1/itineraries/${groupA}`, passengerToken);
  assert.equal(passengerView.status, 200);
  assert.equal(passengerView.payload.data.activeTrip.tripId, started.payload.data.tripId);
});

test('destino actualizado durante el recorrido recalcula la ruta desde el GPS actual', async () => {
  const nextDestination = { lat: 14.65, lng: -90.5 };
  const before = osrmCalls;
  const result = await request('PUT', `/urbus/v1/itineraries/${groupA}`, driverToken, {
    destination: nextDestination,
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload.data.destination, nextDestination);
  assert.equal(result.payload.data.activeTrip.destination.lat, nextDestination.lat);
  assert.equal(osrmCalls, before + 1);
});

test('valida permisos de grupo, métodos de modificación y coordenadas', async () => {
  assert.equal((await request('GET', `/urbus/v1/itineraries/${groupB}`, passengerToken)).status, 403);
  assert.equal((await request('PUT', `/urbus/v1/itineraries/${groupA}`, passengerToken, { destination })).status, 403);
  assert.equal((await request('GET', `/urbus/v1/itineraries/${groupA}`, tokenFor('driverB', 'DRIVER_ROLE'))).status, 403);
  assert.equal((await request('PUT', `/urbus/v1/itineraries/${groupA}`, driverToken, { destination: { lat: null, lng: 0 } })).status, 400);
  assert.equal((await request('GET', `/urbus/v1/itineraries/${groupA}`, null)).status, 401);
});

test('finaliza automáticamente, conserva el historial y permite iniciar otro recorrido', async () => {
  const target = { lat: 14.6258, lng: -90.536 };
  const config = await request('PUT', `/urbus/v1/itineraries/${groupB}`, driverToken, { destination: target });
  assert.equal(config.status, 200);
  const start = await request('POST', `/urbus/v1/itineraries/${groupB}/trips`, driverToken, { origin });
  assert.equal(start.status, 201);
  const firstTimestamp = Date.now() + 1000;
  const firstLocation = await request(
    'POST',
    `/urbus/v1/itineraries/${groupB}/trips/interrupt`,
    driverToken,
  );
  assert.equal(firstLocation.status, 200);

  const historyAfterInterrupt = await request('GET', `/urbus/v1/itineraries/${groupB}/trips`, passengerBToken);
  assert.equal(historyAfterInterrupt.payload.data[0].status, 'INTERRUMPIDO');

  const secondStart = await request('POST', `/urbus/v1/itineraries/${groupB}/trips`, driverToken, { origin });
  assert.equal(secondStart.status, 201);
  const points = [firstTimestamp, firstTimestamp + 2000].map((timestamp) => ({
    lat: target.lat, lng: target.lng, timestamp, accuracy: 8,
  }));
  const { acceptGroupLocation } = await import('../src/itinerary/itinerary.service.js');
  const one = await acceptGroupLocation({ groupId: groupB, point: points[0] });
  const two = await acceptGroupLocation({ groupId: groupB, point: points[1] });
  assert.equal(one.completed, false);
  assert.equal(one.duplicate, false);
  assert.equal(two.duplicate, true);
  assert.equal(two.completed, true);
  assert.equal(two.trip.status, 'COMPLETADO');
  assert.equal(two.trip.track.length, 2);
  assert.ok(two.trip.endedAt);

  const history = await request('GET', `/urbus/v1/itineraries/${groupB}/trips`, passengerBToken);
  assert.equal(history.status, 200);
  assert.equal(history.payload.data.length, 2);
  assert.equal(history.payload.data[0].status, 'COMPLETADO');
  assert.equal(history.payload.data[1].status, 'INTERRUMPIDO');
});
