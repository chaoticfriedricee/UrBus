// Pruebas de la ubicación compartida por Socket.IO. No necesitan bases de datos:
// el acceso que normalmente responde passenger-service se simula por token.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';

const { createServer } = await import('../configs/app.js');

// token -> lo que passenger-service respondería en GET /groups/access
const ACCESS = {
    'driver-a': { userId: 'driver-a', role: 'DRIVER_ROLE', driverId: 'driver-a' },
    'driver-b': { userId: 'driver-b', role: 'DRIVER_ROLE', driverId: 'driver-b' },
    'pass-a': { userId: 'pass-a', role: 'USER_ROLE', driverId: 'driver-a' },
    'pass-a2': { userId: 'pass-a2', role: 'PASSENGER_ROLE', driverId: 'driver-a' },
    'pass-b': { userId: 'pass-b', role: 'USER_ROLE', driverId: 'driver-b' },
    'no-group': { userId: 'no-group', role: 'USER_ROLE', driverId: null },
    admin: { userId: 'admin', role: 'ADMIN_ROLE', driverId: null }
};

let httpServer;
let ioServer;
let url;
const sockets = [];

const SILENCE_MS = 150;

before(async () => {
    const created = createServer({
        getAccess: async (token) => {
            if (token === 'boom') throw new Error('passenger-service caído');
            return ACCESS[token] ?? null;
        }
    });
    httpServer = created.server;
    ioServer = created.io;
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(() => {
    while (sockets.length) sockets.pop().disconnect();
});

after(async () => {
    ioServer.close();
    await new Promise((resolve) => httpServer.close(() => resolve()));
});

const once = (socket, event, timeout = 1000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Sin evento ${event}`)), timeout);
        socket.once(event, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });

// Recoge todo lo que llegue de un evento para comprobar que NO se recibió nada
const record = (socket, event) => {
    const received = [];
    socket.on(event, (payload) => received.push(payload));
    return received;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Conecta y espera el primer locationStatus (que el servidor envía al conectar)
const join = async (token) => {
    const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    const status = await once(socket, 'locationStatus');
    return { socket, status };
};

const connectError = (auth) =>
    new Promise((resolve) => {
        const socket = connect(url, { auth, transports: ['websocket'], reconnection: false });
        sockets.push(socket);
        socket.on('connect_error', (err) => resolve(err.message));
        socket.on('connect', () => resolve('connected'));
    });

test('sin token o con un token inválido no se puede conectar', async () => {
    assert.equal(await connectError({}), 'UNAUTHORIZED');
    assert.equal(await connectError({ token: 'desconocido' }), 'UNAUTHORIZED');
    assert.equal(await connectError({ token: 'boom' }), 'ACCESS_UNAVAILABLE');
});

test('si el conductor no comparte, el pasajero ve "no disponible" y no recibe ubicaciones', async () => {
    const passenger = await join('pass-a');
    assert.deepEqual(passenger.status, { sharing: false });
    const updates = record(passenger.socket, 'updateBus');

    // Enviar coordenadas sin haber iniciado "startSharing" no publica nada
    const driver = await join('driver-a');
    driver.socket.emit('busLocation', { lat: 14.6, lng: -90.5 });
    await wait(SILENCE_MS);

    assert.deepEqual(updates, []);
});

test('la ubicación compartida solo llega a los pasajeros de ese conductor', async () => {
    const driver = await join('driver-a');
    const passA = await join('pass-a');
    const passB = await join('pass-b');
    const noGroup = await join('no-group');
    const admin = await join('admin');

    assert.deepEqual(noGroup.status, { sharing: false, reason: 'NO_GROUP' });
    assert.deepEqual(admin.status, { sharing: false, reason: 'NO_GROUP' });

    const leaks = [passB, noGroup, admin].map(({ socket }) => record(socket, 'updateBus'));
    const leakedStatus = [passB, noGroup, admin].map(({ socket }) => record(socket, 'locationStatus'));

    const started = once(passA.socket, 'locationStatus');
    driver.socket.emit('startSharing');
    assert.deepEqual(await started, { sharing: true });

    const update = once(passA.socket, 'updateBus');
    driver.socket.emit('busLocation', { lat: 14.61, lng: -90.52 });
    const coords = await update;
    assert.equal(coords.lat, 14.61);
    assert.equal(coords.lng, -90.52);

    await wait(SILENCE_MS);
    for (const received of [...leaks, ...leakedStatus]) assert.deepEqual(received, []);
});

test('un pasajero que se conecta tarde recibe la última posición', async () => {
    const driver = await join('driver-a');
    driver.socket.emit('startSharing');
    driver.socket.emit('busLocation', { lat: 14.62, lng: -90.53 });
    await wait(SILENCE_MS);

    const late = await join('pass-a2');
    assert.equal(late.status.sharing, true);
    assert.equal(late.status.lat, 14.62);
    assert.equal(late.status.lng, -90.53);
});

test('un pasajero no puede publicar ubicaciones', async () => {
    const driver = await join('driver-a');
    driver.socket.emit('startSharing');
    const passA = await join('pass-a');
    const passA2 = await join('pass-a2');

    const driverUpdates = record(driver.socket, 'updateBus');
    const peerUpdates = record(passA2.socket, 'updateBus');
    passA.socket.emit('startSharing');
    passA.socket.emit('busLocation', { lat: 1, lng: 1 });
    await wait(SILENCE_MS);

    assert.deepEqual(driverUpdates, []);
    assert.deepEqual(peerUpdates, []);
});

test('se ignoran coordenadas inválidas', async () => {
    const driver = await join('driver-a');
    driver.socket.emit('startSharing');
    const passenger = await join('pass-a');
    const updates = record(passenger.socket, 'updateBus');

    for (const coords of [null, 'texto', { lat: 'a', lng: 2 }, { lat: 200, lng: 0 }, { lat: 0, lng: -500 }]) {
        driver.socket.emit('busLocation', coords);
    }
    await wait(SILENCE_MS);

    assert.deepEqual(updates, []);
});

test('al dejar de compartir o desconectarse, el pasajero pasa a "no disponible"', async () => {
    const driver = await join('driver-a');
    driver.socket.emit('startSharing');
    driver.socket.emit('busLocation', { lat: 14.6, lng: -90.5 });
    const passenger = await join('pass-a');
    assert.equal(passenger.status.sharing, true);

    const stopped = once(passenger.socket, 'locationStatus');
    driver.socket.emit('stopSharing');
    assert.deepEqual(await stopped, { sharing: false });

    // Tras detenerse ya no se publican nuevas posiciones (no se guarda historial)
    const updates = record(passenger.socket, 'updateBus');
    driver.socket.emit('busLocation', { lat: 14.7, lng: -90.6 });
    await wait(SILENCE_MS);
    assert.deepEqual(updates, []);

    driver.socket.emit('startSharing');
    await once(passenger.socket, 'locationStatus');

    const disconnected = once(passenger.socket, 'locationStatus');
    driver.socket.disconnect();
    assert.deepEqual(await disconnected, { sharing: false });

    const rejoined = await join('pass-a2');
    assert.deepEqual(rejoined.status, { sharing: false });
});
