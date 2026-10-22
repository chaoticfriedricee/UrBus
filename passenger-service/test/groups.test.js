// Pruebas de integración de grupos y membresías. Necesitan un MongoDB accesible
// (TEST_URI_MONGODB, por defecto el de docker compose en localhost:27017); usan
// una base de datos aparte que se elimina al terminar.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ISSUER = 'UrBus';
process.env.JWT_AUDIENCE = 'UrBus';

const { createApp } = await import('../configs/app.js');
const { ensureIndexes } = await import('../configs/db.js');
const { default: Passenger } = await import('../src/passenger/passenger.model.js');
const { default: Group } = await import('../src/group/group.model.js');

const MONGO_URI = process.env.TEST_URI_MONGODB || 'mongodb://localhost:27017/urbus_passenger_test';

let server;
let baseUrl;

const tokenFor = (sub, role) =>
    jwt.sign({ sub, role }, process.env.JWT_SECRET, { issuer: 'UrBus', audience: 'UrBus' });

const ADMIN = tokenFor('admin-1', 'ADMIN_ROLE');
const DRIVER_A = tokenFor('driver-a', 'DRIVER_ROLE');
const DRIVER_B = tokenFor('driver-b', 'DRIVER_ROLE');

// IP distinta por petición para que el rate limit global (100 por IP) no afecte a la suite
let requestCount = 0;

const request = async (method, path, { token, body } = {}) => {
    requestCount += 1;
    const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.${requestCount >> 8}.${requestCount & 255}` };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/urbus/v1${path}`, {
        method,
        headers,
        body: body && JSON.stringify(body)
    });
    return { status: response.status, body: await response.json().catch(() => null) };
};

const setLimit = (driverId, maxGroups) =>
    request('PUT', `/groups/limit/${driverId}`, { token: ADMIN, body: { maxGroups } });

const createGroup = async (token, name) => {
    const res = await request('POST', '/groups', { token, body: { name } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data;
};

// Crea el perfil de pasajero vinculado a una cuenta (lo hace un admin o conductor)
const linkPassenger = async (userId, name = `Pasajero ${userId}`) => {
    const res = await request('POST', '/passengers', { token: ADMIN, body: { name, userId } });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return { ...res.body.data, token: tokenFor(userId, 'USER_ROLE') };
};

before(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, autoIndex: false });
    await mongoose.connection.dropDatabase();
    await ensureIndexes();

    await new Promise((resolve) => {
        server = createApp().listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([Group.deleteMany({}), Passenger.deleteMany({})]);
    await setLimit('driver-a', 5);
    await setLimit('driver-b', 5);
});

test('un conductor crea varios grupos, cada uno con un código único y a su nombre', async () => {
    const g1 = await createGroup(DRIVER_A, 'Ruta mañana');
    const g2 = await createGroup(DRIVER_A, 'Ruta tarde');

    assert.match(g1.code, /^[A-Z2-9]{6}$/);
    assert.notEqual(g1.code, g2.code);
    assert.equal(g1.driverId, 'driver-a');
    assert.equal(g2.driverId, 'driver-a');
});

test('el conductor del grupo sale del token, no del body', async () => {
    const res = await request('POST', '/groups', {
        token: DRIVER_A,
        body: { name: 'Forzado', driverId: 'driver-b', code: 'AAAAAA' }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.driverId, 'driver-a');
    assert.notEqual(res.body.data.code, 'AAAAAA');
});

test('solo un conductor puede crear grupos', async () => {
    for (const token of [ADMIN, tokenFor('u1', 'USER_ROLE'), tokenFor('p1', 'PASSENGER_ROLE')]) {
        const res = await request('POST', '/groups', { token, body: { name: 'X' } });
        assert.equal(res.status, 403);
    }
});

test('un conductor gestiona sus grupos pero no los de otro conductor', async () => {
    const own = await createGroup(DRIVER_A, 'Propio');
    const other = await createGroup(DRIVER_B, 'Ajeno');

    const list = await request('GET', '/groups', { token: DRIVER_A });
    assert.deepEqual(list.body.data.map((g) => g.name), ['Propio']);

    assert.equal((await request('GET', `/groups/${other._id}`, { token: DRIVER_A })).status, 403);
    assert.equal((await request('PATCH', `/groups/${other._id}`, { token: DRIVER_A, body: { name: 'Robado' } })).status, 403);
    assert.equal((await request('DELETE', `/groups/${other._id}`, { token: DRIVER_A })).status, 403);
    assert.equal((await Group.findById(other._id)).name, 'Ajeno');

    const edit = await request('PATCH', `/groups/${own._id}`, { token: DRIVER_A, body: { name: 'Renombrado' } });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.name, 'Renombrado');
});

test('un código válido asocia al pasajero con el grupo correcto', async () => {
    await createGroup(DRIVER_B, 'Otro grupo');
    const group = await createGroup(DRIVER_A, 'Ruta mañana');
    const passenger = await linkPassenger('user-1');

    const res = await request('POST', '/groups/join', {
        token: passenger.token,
        body: { code: ` ${group.code.toLowerCase()} ` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.group._id, group._id);
    // La respuesta no expone el id interno del conductor
    assert.equal(res.body.data.group.driverId, undefined);

    const stored = await Passenger.findById(passenger._id);
    assert.equal(String(stored.groupId), group._id);

    const me = await request('GET', '/passengers/me', { token: passenger.token });
    assert.equal(me.body.data.groupId.name, 'Ruta mañana');
});

test('unirse ignora un groupId enviado en el body: manda el código', async () => {
    const target = await createGroup(DRIVER_A, 'Por código');
    const forged = await createGroup(DRIVER_B, 'Forzado');
    const passenger = await linkPassenger('user-forge');

    const res = await request('POST', '/groups/join', {
        token: passenger.token,
        body: { code: target.code, groupId: forged._id, driverId: 'driver-b' }
    });

    assert.equal(res.status, 200);
    assert.equal(String((await Passenger.findById(passenger._id)).groupId), target._id);
});

test('se rechazan códigos inválidos, vacíos y de grupos inactivos o eliminados', async () => {
    const passenger = await linkPassenger('user-2');

    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: 'ZZZZZZ' } })).status, 404);
    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: '' } })).status, 400);
    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: { $ne: null } } })).status, 400);

    const inactive = await createGroup(DRIVER_A, 'Inactivo');
    await request('PATCH', `/groups/${inactive._id}`, { token: DRIVER_A, body: { isActive: false } });
    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: inactive.code } })).status, 404);

    const deleted = await createGroup(DRIVER_A, 'Eliminado');
    await request('DELETE', `/groups/${deleted._id}`, { token: DRIVER_A });
    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: deleted.code } })).status, 404);

    assert.equal((await Passenger.findById(passenger._id)).groupId, null);
});

test('se rechaza unirse dos veces al mismo grupo', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');
    const passenger = await linkPassenger('user-3');

    assert.equal((await request('POST', '/groups/join', { token: passenger.token, body: { code: group.code } })).status, 200);
    const again = await request('POST', '/groups/join', { token: passenger.token, body: { code: group.code } });
    assert.equal(again.status, 409);
});

test('solo pasajeros con perfil vinculado pueden unirse; conductores y admins no', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');

    const unlinked = await request('POST', '/groups/join', { token: tokenFor('sin-perfil', 'USER_ROLE'), body: { code: group.code } });
    assert.equal(unlinked.status, 404);

    assert.equal((await request('POST', '/groups/join', { token: DRIVER_B, body: { code: group.code } })).status, 403);
    assert.equal((await request('POST', '/groups/join', { token: ADMIN, body: { code: group.code } })).status, 403);
});

test('una cuenta no puede tener dos perfiles de pasajero activos (índice único)', async () => {
    await linkPassenger('user-dup');

    const res = await request('POST', '/passengers', { token: ADMIN, body: { name: 'Otro', userId: 'user-dup' } });
    assert.equal(res.status, 409);

    // Aunque se salte la validación del controlador, la base de datos lo impide
    await assert.rejects(Passenger.create({ name: 'Directo', userId: 'user-dup' }), { code: 11000 });
});

test('el pasajero ve solo a los compañeros de su grupo y sin datos privados', async () => {
    const groupA = await createGroup(DRIVER_A, 'Grupo A');
    const groupB = await createGroup(DRIVER_B, 'Grupo B');

    const ana = await linkPassenger('ana', 'Ana');
    const beto = await linkPassenger('beto', 'Beto');
    const carla = await linkPassenger('carla', 'Carla');
    const sinGrupo = await linkPassenger('dani', 'Dani');

    await request('POST', '/groups/join', { token: ana.token, body: { code: groupA.code } });
    await request('POST', '/groups/join', { token: beto.token, body: { code: groupA.code } });
    await request('POST', '/groups/join', { token: carla.token, body: { code: groupB.code } });
    await request('PUT', `/passengers/${beto._id}/absence-reason`, { token: DRIVER_A, body: { reason: 'SALUD' } });

    const list = await request('GET', '/passengers', { token: ana.token });
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.data.map((p) => p.name), ['Ana', 'Beto']);
    for (const p of list.body.data) {
        assert.deepEqual(Object.keys(p).sort(), ['_id', 'groupId', 'name']);
    }

    // Igual con PASSENGER_ROLE
    const asPassengerRole = await request('GET', '/passengers', { token: tokenFor('carla', 'PASSENGER_ROLE') });
    assert.deepEqual(asPassengerRole.body.data.map((p) => p.name), ['Carla']);

    const none = await request('GET', '/passengers', { token: sinGrupo.token });
    assert.deepEqual(none.body.data, []);

    // Si el grupo se desactiva, sus miembros dejan de ver la lista
    await request('PATCH', `/groups/${groupA._id}`, { token: DRIVER_A, body: { isActive: false } });
    assert.deepEqual((await request('GET', '/passengers', { token: ana.token })).body.data, []);

    // Conductores y admins conservan la lista completa
    const all = await request('GET', '/passengers', { token: ADMIN });
    assert.equal(all.body.data.length, 4);
});

test('un pasajero no puede ver el detalle de un grupo por id', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');
    const passenger = await linkPassenger('user-4');
    await request('POST', '/groups/join', { token: passenger.token, body: { code: group.code } });

    assert.equal((await request('GET', `/groups/${group._id}`, { token: passenger.token })).status, 403);
    assert.equal((await request('GET', '/groups', { token: passenger.token })).status, 403);
});

test('GET /groups/access describe los grupos a los que tiene acceso cada usuario', async () => {
    const g1 = await createGroup(DRIVER_A, 'G1');
    const g2 = await createGroup(DRIVER_A, 'G2');
    const passenger = await linkPassenger('user-5');
    await request('POST', '/groups/join', { token: passenger.token, body: { code: g2.code } });

    const driver = await request('GET', '/groups/access', { token: DRIVER_A });
    assert.equal(driver.status, 200);
    assert.deepEqual(driver.body.data.ownedGroupIds.sort(), [g1._id, g2._id].sort());
    assert.equal(driver.body.data.driverId, 'driver-a');

    const member = await request('GET', '/groups/access', { token: passenger.token });
    assert.equal(member.body.data.memberGroupId, g2._id);
    assert.equal(member.body.data.driverId, 'driver-a');
    assert.deepEqual(member.body.data.ownedGroupIds, []);

    const admin = await request('GET', '/groups/access', { token: ADMIN });
    assert.equal(admin.body.data.memberGroupId, null);
    assert.equal(admin.body.data.driverId, null);

    // Grupo desactivado: el pasajero pierde el acceso
    await request('PATCH', `/groups/${g2._id}`, { token: DRIVER_A, body: { isActive: false } });
    const inactive = await request('GET', '/groups/access', { token: passenger.token });
    assert.equal(inactive.body.data.memberGroupId, null);
    assert.equal(inactive.body.data.driverId, null);

    assert.equal((await request('GET', '/groups/access')).status, 401);
    const refresh = jwt.sign({ sub: 'user-5', type: 'refresh' }, process.env.JWT_SECRET, { issuer: 'UrBus', audience: 'UrBus' });
    assert.equal((await request('GET', '/groups/access', { token: refresh })).status, 401);
});
