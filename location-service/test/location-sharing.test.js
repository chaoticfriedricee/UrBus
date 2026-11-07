import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io as connect } from 'socket.io-client';

process.env.JWT_SECRET = 'itinerary-socket-test-secret';
process.env.JWT_ISSUER = 'UrBus';
process.env.JWT_AUDIENCE = 'UrBus';
process.env.ITINERARY_JSON_FALLBACK = 'true';
process.env.GPS_STALE_AFTER_MS = '1000';
const fallbackStoragePath = path.join(tmpdir(), `urbus-itinerary-socket-test-${randomUUID()}.json`);
process.env.ITINERARY_JSON_FALLBACK_PATH = fallbackStoragePath;

const { signToken, verifyToken } = await import('../src/itinerary/itinerary.auth.js');
const { createServer } = await import('../configs/app.js');
const prefix = `socket-${randomUUID()}`;
const groupA = `${prefix}-a`;
const groupB = `${prefix}-b`;
const lifecycleGroupA = `${prefix}-cycle-a`;
const lifecycleGroupB = `${prefix}-cycle-b`;
const accessByUser = {
  driver: {
    userId: 'driver', role: 'DRIVER_ROLE',
    ownedGroupIds: [groupA, groupB, lifecycleGroupA, lifecycleGroupB], memberGroupId: null,
  },
  passengerA: { userId: 'passengerA', role: 'USER_ROLE', ownedGroupIds: [], memberGroupId: groupA },
  passengerB: { userId: 'passengerB', role: 'PASSENGER_ROLE', ownedGroupIds: [], memberGroupId: groupB },
  passengerCycleA: {
    userId: 'passengerCycleA', role: 'USER_ROLE', ownedGroupIds: [], memberGroupId: lifecycleGroupA,
  },
  passengerCycleB: {
    userId: 'passengerCycleB', role: 'PASSENGER_ROLE', ownedGroupIds: [], memberGroupId: lifecycleGroupB,
  },
  otherDriver: {
    userId: 'otherDriver', role: 'DRIVER_ROLE', ownedGroupIds: [`${prefix}-other`], memberGroupId: null,
  },
};

let server;
let io;
let osrm;
let baseUrl;
let osrmCalls = 0;
const sockets = [];

before(async () => {
  osrm = http.createServer((req, res) => {
    osrmCalls += 1;
    const path = new URL(req.url, 'http://localhost').pathname.split('/').pop();
    const coordinates = path.split(';').map((point) => point.split(',').map(Number));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 'Ok',
      routes: [{ geometry: { type: 'LineString', coordinates }, distance: 1000, duration: 300 }],
    }));
  });
  await new Promise((resolve) => osrm.listen(0, '127.0.0.1', resolve));
  process.env.OSRM_URL = `http://127.0.0.1:${osrm.address().port}/route/v1/driving`;

  const created = createServer({
    getAccess: async (token) => {
      try {
        return accessByUser[verifyToken(token).sub] ?? null;
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

afterEach(async () => {
  while (sockets.length) sockets.pop().disconnect();
  await new Promise((resolve) => setTimeout(resolve, 20));
});

after(async () => {
  await new Promise((resolve) => io.close(resolve));
  await new Promise((resolve) => osrm.close(resolve));
  rmSync(fallbackStoragePath, { force: true });
});

const tokenFor = (id, role) => signToken(id, role);

const emitWithAck = (socket, event, payload) => new Promise((resolve) => {
  socket.emit(event, payload, resolve);
});

const connectSocket = async (id, role) => {
  const socket = connect(baseUrl, {
    auth: { token: tokenFor(id, role) },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  const states = [];
  socket.on('itinerary:state', (payload) => states.push(payload));
  const state = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El cliente no recuperó el estado del grupo.')), 2000);
    socket.once('itinerary:state', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  const access = accessByUser[id];
  const groupId = access.memberGroupId ?? access.ownedGroupIds[0];
  const subscription = await emitWithAck(socket, 'itinerary:subscribe', { groupId });
  assert.equal(subscription.success, true);
  return { socket, state: await state, states };
};

const request = async (method, path, token, body) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, payload: await response.json() };
};

const record = (socket, event) => {
  const events = [];
  socket.on(event, (payload) => events.push(payload));
  return events;
};

const waitFor = async (predicate, message, timeoutMs = 2000) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.ok(predicate(), message);
};

test('Socket.IO recupera estado, limita salas al grupo y solo permite GPS al conductor autorizado', async () => {
  const driverToken = tokenFor('driver', 'DRIVER_ROLE');
  const origin = { lat: 14.61, lng: -90.55, accuracy: 10, timestamp: Date.now() };
  const started = await request('POST', `/urbus/v1/itineraries/${groupA}/trips`, driverToken, { origin });
  assert.equal(started.status, 201);

  const driver = await connectSocket('driver', 'DRIVER_ROLE');
  const passenger = await connectSocket('passengerA', 'USER_ROLE');
  const unrelated = await connectSocket('passengerB', 'PASSENGER_ROLE');
  assert.equal(passenger.states.length, 1);
  assert.equal(unrelated.states.length, 1);
  assert.equal(passenger.state.activeTrip.tripId, started.payload.data.tripId);
  assert.equal(unrelated.state.groupId, groupB);

  const passengerLocations = record(passenger.socket, 'itinerary:location');
  const passengerGpsStatuses = record(passenger.socket, 'itinerary:gps-status');
  const unrelatedLocations = record(unrelated.socket, 'itinerary:location');
  const point = { lat: 14.62, lng: -90.54, timestamp: Date.now() + 1000, accuracy: 8 };
  const locationAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: groupA,
    point,
  });
  assert.equal(locationAck.success, true);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(passengerLocations.length, 1);
  assert.equal(passengerLocations[0].groupId, groupA);
  assert.deepEqual(unrelatedLocations, []);

  const repeatedAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: groupA,
    point: { ...point, timestamp: point.timestamp + 2000 },
  });
  assert.equal(repeatedAck.success, true);
  assert.equal(repeatedAck.duplicate, true);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(passengerLocations.length, 1);
  assert.equal(passengerGpsStatuses.at(-1).status, 'CONECTADO');
  assert.ok(passengerGpsStatuses.at(-1).updatedAt);

  const deniedLocation = await emitWithAck(passenger.socket, 'itinerary:location', {
    groupId: groupA,
    point: { lat: 1, lng: 1, timestamp: Date.now() + 2000 },
  });
  const deniedDestination = await emitWithAck(passenger.socket, 'itinerary:destination', {
    groupId: groupA,
    destination: { lat: 14.7, lng: -90.6 },
  });
  const deniedSubscription = await emitWithAck(passenger.socket, 'itinerary:subscribe', { groupId: groupB });
  const deniedSync = await emitWithAck(passenger.socket, 'itinerary:sync', { groupId: groupB });
  const deniedStart = await emitWithAck(passenger.socket, 'itinerary:start', {
    groupId: groupA, origin,
  });
  const deniedInterrupt = await emitWithAck(passenger.socket, 'itinerary:interrupt', { groupId: groupA });
  assert.equal(deniedLocation.success, false);
  assert.equal(deniedDestination.success, false);
  assert.equal(deniedSubscription.success, false);
  assert.equal(deniedSync.success, false);
  assert.equal(deniedStart.success, false);
  assert.equal(deniedInterrupt.success, false);

  const after = await request('GET', `/urbus/v1/itineraries/${groupA}`, tokenFor('passengerA', 'USER_ROLE'));
  assert.equal(after.payload.data.destination.lat, 14.6258);
  assert.equal(after.payload.data.activeTrip.currentLocation.lat, 14.62);
  assert.equal((await request('GET', `/urbus/v1/itineraries/${groupB}`, tokenFor('passengerA', 'USER_ROLE'))).status, 403);
  assert.equal((await request('GET', `/urbus/v1/itineraries/${groupB}/trips`, tokenFor('passengerA', 'USER_ROLE'))).status, 403);

  const otherDriverToken = tokenFor('otherDriver', 'DRIVER_ROLE');
  const otherDriver = await connectSocket('otherDriver', 'DRIVER_ROLE');
  for (const [method, path, body] of [
    ['GET', `/urbus/v1/itineraries/${groupA}`],
    ['PUT', `/urbus/v1/itineraries/${groupA}`, { destination: { lat: 14.7, lng: -90.6 } }],
    ['POST', `/urbus/v1/itineraries/${groupA}/trips`, { origin }],
    ['POST', `/urbus/v1/itineraries/${groupA}/trips/interrupt`],
  ]) {
    assert.equal((await request(method, path, otherDriverToken, body)).status, 403);
  }
  for (const event of ['itinerary:start', 'itinerary:location', 'itinerary:destination', 'itinerary:interrupt']) {
    const result = await emitWithAck(otherDriver.socket, event, {
      groupId: groupA,
      origin,
      point: origin,
      destination: { lat: 14.7, lng: -90.6 },
    });
    assert.equal(result.success, false, `${event} must reject a non-owning driver`);
  }
});

test('recorrido GPS completo, grupos aislados, desvío, reconexión e historial', async () => {
  const driverToken = tokenFor('driver', 'DRIVER_ROLE');
  const destinationA = { lat: 14.6258, lng: -90.536 };
  const destinationB = { lat: 14.65, lng: -90.51 };
  const startTime = Date.now();
  const origin = { lat: 14.61, lng: -90.55, accuracy: 10, timestamp: startTime };
  const originB = { ...origin, lat: 14.6, lng: -90.56 };

  assert.equal((await request(
    'PUT', `/urbus/v1/itineraries/${lifecycleGroupA}`, driverToken, { destination: destinationA },
  )).status, 200);
  assert.equal((await request(
    'PUT', `/urbus/v1/itineraries/${lifecycleGroupB}`, driverToken, { destination: destinationB },
  )).status, 200);

  const driver = await connectSocket('driver', 'DRIVER_ROLE');
  const passengerA = await connectSocket('passengerCycleA', 'USER_ROLE');
  const passengerB = await connectSocket('passengerCycleB', 'PASSENGER_ROLE');
  assert.deepEqual(passengerA.state.destination, destinationA);
  assert.deepEqual(passengerB.state.destination, destinationB);

  assert.equal((await emitWithAck(driver.socket, 'itinerary:subscribe', {
    groupId: lifecycleGroupA,
  })).success, true);
  assert.equal((await emitWithAck(driver.socket, 'itinerary:subscribe', {
    groupId: lifecycleGroupB,
  })).success, true);

  const startedA = record(passengerA.socket, 'itinerary:started');
  const startedB = record(passengerB.socket, 'itinerary:started');
  const locationsA = record(passengerA.socket, 'itinerary:location');
  const locationsB = record(passengerB.socket, 'itinerary:location');
  const routesA = record(passengerA.socket, 'itinerary:route');
  const routesB = record(passengerB.socket, 'itinerary:route');
  const gpsStatusesA = record(passengerA.socket, 'itinerary:gps-status');
  const destinationsA = record(passengerA.socket, 'itinerary:destination');
  const completedA = record(passengerA.socket, 'itinerary:completed');
  const interruptedA = record(passengerA.socket, 'itinerary:interrupted');
  const interruptedB = record(passengerB.socket, 'itinerary:interrupted');

  const osrmBeforeStart = osrmCalls;
  const startAckA = await emitWithAck(driver.socket, 'itinerary:start', {
    groupId: lifecycleGroupA, origin,
  });
  const startAckB = await emitWithAck(driver.socket, 'itinerary:start', {
    groupId: lifecycleGroupB, origin: originB,
  });
  assert.equal(startAckA.success, true);
  assert.equal(startAckB.success, true);
  assert.notEqual(startAckA.data.tripId, startAckB.data.tripId);
  assert.equal(osrmCalls, osrmBeforeStart + 2);
  await waitFor(() => startedA.length === 1 && startedB.length === 1, 'passengers receive trip starts');
  assert.equal(startedA[0].trip.origin.lat, origin.lat);
  assert.equal(startedB[0].trip.origin.lat, originB.lat);

  const deviation = { lat: 14.7, lng: -90.6, accuracy: 8, timestamp: startTime + 1000 };
  const osrmBeforeDeviation = osrmCalls;
  const deviationAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA, point: deviation,
  });
  assert.equal(deviationAck.success, true);
  assert.equal(osrmCalls, osrmBeforeDeviation + 1);
  await waitFor(() => locationsA.length === 1 && routesA.length === 1, 'group A receives location and reroute');
  assert.equal(routesA[0].trip.geometry.coordinates[0][0], deviation.lng);
  assert.equal(locationsB.length, 0);
  assert.equal(routesB.length, 0);

  const staleAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA,
    point: { lat: 14.62, lng: -90.54, accuracy: 5, timestamp: deviation.timestamp - 1 },
  });
  assert.equal(staleAck.success, true);
  assert.equal(staleAck.duplicate, true);
  assert.equal(staleAck.data.currentLocation.lat, deviation.lat);
  assert.equal(locationsA.length, 1);

  const destinationA2 = { lat: 14.6261, lng: -90.535 };
  const osrmBeforeDestinationChange = osrmCalls;
  const destinationAck = await emitWithAck(driver.socket, 'itinerary:destination', {
    groupId: lifecycleGroupA, destination: destinationA2,
  });
  assert.equal(destinationAck.success, true);
  assert.equal(destinationAck.data.activeTrip.destination.lat, destinationA2.lat);
  assert.equal(osrmCalls, osrmBeforeDestinationChange + 1);
  await waitFor(
    () => destinationsA.length === 1 && routesA.length === 2,
    'passenger receives destination and recalculated route',
  );
  assert.equal(destinationsA[0].groupId, lifecycleGroupA);

  const { getActiveTrip, saveTrip } = await import('../src/itinerary/itinerary.store.js');
  const { GPS_STALE_AFTER_MS } = await import('../src/itinerary/itinerary.service.js');
  const active = await getActiveTrip(lifecycleGroupA);
  await saveTrip({ ...active, lastLocationAt: new Date(Date.now() - GPS_STALE_AFTER_MS - 1000) });
  await waitFor(
    () => gpsStatusesA.some((event) => event.status === 'DESCONECTADO'),
    'server reports stale GPS to the group',
    7000,
  );

  const recoveryPoint = {
    lat: deviation.lat + 0.0001,
    lng: deviation.lng + 0.0001,
    accuracy: 10,
    timestamp: startTime + 2000,
  };
  const recoveredAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA, point: recoveryPoint,
  });
  assert.equal(recoveredAck.success, true);
  assert.equal(recoveredAck.data.gpsStatus, 'CONECTADO');
  assert.equal(gpsStatusesA.at(-1).status, 'CONECTADO');
  assert.equal(locationsA.length, 2);

  const tooInaccurate = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA,
    point: { ...destinationA2, accuracy: 36, timestamp: startTime + 3000 },
  });
  assert.equal(tooInaccurate.success, true);
  assert.equal(tooInaccurate.data.arrivalFixes, 0);

  const firstArrival = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA,
    point: { ...destinationA2, accuracy: 35, timestamp: startTime + 4000 },
  });
  assert.equal(firstArrival.success, true);
  assert.equal(firstArrival.data.arrivalFixes, 1);
  const completedAck = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA,
    point: { ...destinationA2, accuracy: 35, timestamp: startTime + 6000 },
  });
  assert.equal(completedAck.success, true);
  assert.equal(completedAck.data.status, 'COMPLETADO');
  await waitFor(() => completedA.length === 1, 'passenger receives one automatic completion');
  assert.equal(completedA[0].trip.tripId, startAckA.data.tripId);
  assert.equal(completedA.length, 1);

  passengerA.socket.disconnect();
  const reconnected = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Passenger socket did not reconnect.')), 2000);
    passengerA.socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    passengerA.socket.once('connect_error', reject);
  });
  passengerA.socket.connect();
  await reconnected;
  const recoveryState = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reconnected passenger did not sync state.')), 2000);
    passengerA.socket.once('itinerary:state', (state) => {
      clearTimeout(timer);
      resolve(state);
    });
  });
  assert.equal((await emitWithAck(passengerA.socket, 'itinerary:subscribe', {
    groupId: lifecycleGroupA,
  })).success, true);
  assert.equal((await recoveryState).lastTrip.status, 'COMPLETADO');

  const previousStartedCount = startedA.length;
  assert.equal((await emitWithAck(passengerA.socket, 'itinerary:unsubscribe', {
    groupId: lifecycleGroupA,
  })).success, true);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const nextOrigin = { ...origin, timestamp: startTime + 8000 };
  const secondTripAck = await emitWithAck(driver.socket, 'itinerary:start', {
    groupId: lifecycleGroupA, origin: nextOrigin,
  });
  assert.equal(secondTripAck.success, true);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(startedA.length, previousStartedCount);

  const historyBeforeInterrupt = await request(
    'GET', `/urbus/v1/itineraries/${lifecycleGroupA}/trips`, tokenFor('passengerCycleA', 'USER_ROLE'),
  );
  assert.equal(historyBeforeInterrupt.status, 200);
  assert.equal(historyBeforeInterrupt.payload.data.length, 2);
  assert.equal(historyBeforeInterrupt.payload.data.find((trip) => trip.tripId === startAckA.data.tripId).status, 'COMPLETADO');

  assert.equal((await emitWithAck(passengerA.socket, 'itinerary:subscribe', {
    groupId: lifecycleGroupA,
  })).success, true);
  assert.equal((await emitWithAck(passengerA.socket, 'itinerary:subscribe', {
    groupId: lifecycleGroupA,
  })).success, true);
  const locationCount = locationsA.length;
  const secondLocation = await emitWithAck(driver.socket, 'itinerary:location', {
    groupId: lifecycleGroupA,
    point: { lat: 14.611, lng: -90.551, accuracy: 10, timestamp: startTime + 9000 },
  });
  assert.equal(secondLocation.success, true);
  await waitFor(() => locationsA.length === locationCount + 1, 'duplicate subscriptions do not duplicate events');

  const interruptionAckA = await emitWithAck(driver.socket, 'itinerary:interrupt', {
    groupId: lifecycleGroupA,
  });
  const interruptionAckB = await emitWithAck(driver.socket, 'itinerary:interrupt', {
    groupId: lifecycleGroupB,
  });
  assert.equal(interruptionAckA.success, true);
  assert.equal(interruptionAckB.success, true);
  await waitFor(
    () => interruptedA.length === 1 && interruptedB.length === 1,
    'each passenger receives only its own interruption',
  );
  assert.equal(interruptedA[0].groupId, lifecycleGroupA);
  assert.equal(interruptedB[0].groupId, lifecycleGroupB);
  assert.equal(routesB.length, 0);
  assert.equal(locationsB.length, 0);

  const finalHistory = await request(
    'GET', `/urbus/v1/itineraries/${lifecycleGroupA}/trips`, tokenFor('passengerCycleA', 'USER_ROLE'),
  );
  assert.equal(finalHistory.payload.data.length, 2);
  assert.equal(finalHistory.payload.data.find((trip) => trip.tripId === startAckA.data.tripId).status, 'COMPLETADO');
  assert.equal(finalHistory.payload.data.find((trip) => trip.tripId === secondTripAck.data.tripId).status, 'INTERRUMPIDO');
});

test('Socket.IO rechaza clientes sin token válido', async () => {
  const socket = connect(baseUrl, { transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  const error = await new Promise((resolve) => socket.once('connect_error', resolve));
  assert.equal(error.message, 'UNAUTHORIZED');
});
