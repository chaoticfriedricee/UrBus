// Pruebas de integración de publicaciones por grupo. Necesitan un MongoDB accesible
// (TEST_URI_MONGODB, por defecto el de docker compose en localhost:27017); usan una
// base de datos aparte que se elimina al terminar. passenger-service se reemplaza por
// un servidor falso que responde GET /groups/access según el usuario del token.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ISSUER = 'UrBus';
process.env.JWT_AUDIENCE = 'UrBus';

const { createApp } = await import('../configs/app.js');
const { default: Post } = await import('../src/posts/post.model.js');

const MONGO_URI = process.env.TEST_URI_MONGODB || 'mongodb://localhost:27017/urbus_posts_test';

const GROUP_A = '64b000000000000000000001';
const GROUP_B = '64b000000000000000000002';

// Lo que passenger-service respondería para cada usuario
const ACCESS = {
    'driver-a': { role: 'DRIVER_ROLE', ownedGroupIds: [GROUP_A], memberGroupId: null, driverId: 'driver-a' },
    'driver-b': { role: 'DRIVER_ROLE', ownedGroupIds: [GROUP_B], memberGroupId: null, driverId: 'driver-b' },
    'pass-a': { role: 'USER_ROLE', ownedGroupIds: [], memberGroupId: GROUP_A, driverId: 'driver-a' },
    'pass-b': { role: 'PASSENGER_ROLE', ownedGroupIds: [], memberGroupId: GROUP_B, driverId: 'driver-b' },
    'no-group': { role: 'USER_ROLE', ownedGroupIds: [], memberGroupId: null, driverId: null }
};

let server;
let fakePassengerService;
let baseUrl;
let passengerServiceDown = false;
let accessCalls = 0;

const tokenFor = (sub, role) =>
    jwt.sign({ sub, role }, process.env.JWT_SECRET, { issuer: 'UrBus', audience: 'UrBus' });

const ADMIN = tokenFor('admin-1', 'ADMIN_ROLE');
const DRIVER_A = tokenFor('driver-a', 'DRIVER_ROLE');
const DRIVER_B = tokenFor('driver-b', 'DRIVER_ROLE');
const PASS_A = tokenFor('pass-a', 'USER_ROLE');
const PASS_B = tokenFor('pass-b', 'PASSENGER_ROLE');
const NO_GROUP = tokenFor('no-group', 'USER_ROLE');

const request = async (method, path, { token, body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/urbus/v1${path}`, {
        method,
        headers,
        body: body && JSON.stringify(body)
    });
    return { status: response.status, body: await response.json().catch(() => null) };
};

const titles = (posts) => posts.map((p) => p.title).sort();

before(async () => {
    fakePassengerService = http.createServer((req, res) => {
        accessCalls += 1;
        if (passengerServiceDown || req.url !== '/urbus/v1/groups/access') {
            res.writeHead(503).end();
            return;
        }
        const token = (req.headers.authorization || '').split(' ')[1];
        const { sub } = jwt.decode(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: { userId: sub, ...ACCESS[sub] } }));
    });
    await new Promise((resolve) => fakePassengerService.listen(0, '127.0.0.1', resolve));
    process.env.PASSENGER_SERVICE_URL = `http://127.0.0.1:${fakePassengerService.address().port}/urbus/v1`;

    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();

    await new Promise((resolve) => {
        server = createApp().listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => fakePassengerService.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    passengerServiceDown = false;
    await Post.deleteMany({});
});

const seedPosts = async () => {
    // Un post creado antes de existir groupId (sin el campo) sigue siendo general
    await Post.collection.insertOne({
        title: 'Aviso antiguo', content: 'x', createdBy: 'admin-1', isDeleted: false, isUrgent: false,
        createdAt: new Date(), updatedAt: new Date()
    });
    await Post.create([
        { title: 'General', content: 'x', createdBy: 'admin-1' },
        { title: 'Grupo A', content: 'x', createdBy: 'driver-a', groupId: GROUP_A },
        { title: 'Grupo B', content: 'x', createdBy: 'driver-b', groupId: GROUP_B },
        { title: 'Grupo A eliminado', content: 'x', createdBy: 'driver-a', groupId: GROUP_A, isDeleted: true }
    ]);
};

test('un conductor publica en su propio grupo, pero no en el de otro conductor', async () => {
    const own = await request('POST', '/posts', {
        token: DRIVER_A,
        body: { title: 'Salimos 6:30', content: 'Puntual', groupId: GROUP_A }
    });
    assert.equal(own.status, 201);
    assert.equal(own.body.post.groupId, GROUP_A);

    const other = await request('POST', '/posts', {
        token: DRIVER_A,
        body: { title: 'Intruso', content: 'x', groupId: GROUP_B }
    });
    assert.equal(other.status, 403);

    const invalid = await request('POST', '/posts', {
        token: DRIVER_A,
        body: { title: 'x', content: 'x', groupId: 'no-es-un-id' }
    });
    assert.equal(invalid.status, 400);

    const general = await request('POST', '/posts', { token: DRIVER_A, body: { title: 'General', content: 'x' } });
    assert.equal(general.status, 201);
    assert.equal(general.body.post.groupId, null);

    assert.equal(await Post.countDocuments({ groupId: GROUP_B }), 0);
});

test('un conductor no puede mover su post a un grupo ajeno al editarlo', async () => {
    const created = await request('POST', '/posts', {
        token: DRIVER_A,
        body: { title: 'Aviso', content: 'x', groupId: GROUP_A }
    });

    const moved = await request('PUT', `/posts/${created.body.post._id}`, {
        token: DRIVER_A,
        body: { groupId: GROUP_B }
    });
    assert.equal(moved.status, 403);
    assert.equal((await Post.findById(created.body.post._id)).groupId, GROUP_A);

    const toGeneral = await request('PUT', `/posts/${created.body.post._id}`, {
        token: DRIVER_A,
        body: { groupId: '' }
    });
    assert.equal(toGeneral.status, 200);
    assert.equal(toGeneral.body.post.groupId, null);
});

test('los pasajeros no pueden publicar', async () => {
    const res = await request('POST', '/posts', { token: PASS_A, body: { title: 'x', content: 'x', groupId: GROUP_A } });
    assert.equal(res.status, 403);
});

test('el pasajero ve los avisos generales y los de su grupo, no los de otros grupos', async () => {
    await seedPosts();

    const a = await request('GET', '/posts', { token: PASS_A });
    assert.equal(a.status, 200);
    assert.deepEqual(titles(a.body), ['Aviso antiguo', 'General', 'Grupo A']);

    const b = await request('GET', '/posts', { token: PASS_B });
    assert.deepEqual(titles(b.body), ['Aviso antiguo', 'General', 'Grupo B']);

    const none = await request('GET', '/posts', { token: NO_GROUP });
    assert.deepEqual(titles(none.body), ['Aviso antiguo', 'General']);
});

test('cambiar el groupId en la URL no da acceso a los posts de otro grupo', async () => {
    await seedPosts();
    const postB = await Post.findOne({ title: 'Grupo B' });

    const byQuery = await request('GET', `/posts?groupId=${GROUP_B}`, { token: PASS_A });
    assert.equal(byQuery.status, 403);

    const byId = await request('GET', `/posts/${postB._id}`, { token: PASS_A });
    assert.equal(byId.status, 404);

    const ownGroup = await request('GET', `/posts?groupId=${GROUP_A}`, { token: PASS_A });
    assert.equal(ownGroup.status, 200);
    assert.deepEqual(titles(ownGroup.body), ['Grupo A']);

    const postA = await Post.findOne({ title: 'Grupo A' });
    assert.equal((await request('GET', `/posts/${postA._id}`, { token: PASS_A })).status, 200);
});

test('cada conductor ve los avisos generales y los de sus grupos; el admin ve todo', async () => {
    await seedPosts();

    const driverA = await request('GET', '/posts', { token: DRIVER_A });
    assert.deepEqual(titles(driverA.body), ['Aviso antiguo', 'General', 'Grupo A']);

    const admin = await request('GET', '/posts', { token: ADMIN });
    assert.equal(admin.body.length, 5);

    const adminFilter = await request('GET', `/posts?groupId=${GROUP_B}`, { token: ADMIN });
    assert.deepEqual(titles(adminFilter.body), ['Grupo B']);
});

test('si passenger-service no responde se falla cerrado', async () => {
    await seedPosts();
    passengerServiceDown = true;

    const list = await request('GET', '/posts', { token: PASS_A });
    assert.equal(list.status, 200);
    assert.deepEqual(titles(list.body), ['Aviso antiguo', 'General']);

    const create = await request('POST', '/posts', {
        token: DRIVER_A,
        body: { title: 'x', content: 'x', groupId: GROUP_A }
    });
    assert.equal(create.status, 503);
});

test('el admin no consulta passenger-service', async () => {
    const before = accessCalls;
    await request('GET', '/posts', { token: ADMIN });
    assert.equal(accessCalls, before);
});
