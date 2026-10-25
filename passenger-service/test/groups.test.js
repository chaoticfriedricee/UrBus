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
const { default: GroupLimit } = await import('../src/group/groupLimit.model.js');
const { default: Setting } = await import('../src/settings/setting.model.js');

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
    await Promise.all([Group.deleteMany({}), Passenger.deleteMany({}), GroupLimit.deleteMany({}), Setting.deleteMany({})]);
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

test('un pasajero sin perfil se vincula con el código; conductores y admins no pueden unirse', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');

    const unlinked = await request('POST', '/groups/join', {
        token: tokenFor('sin-perfil', 'PASSENGER_ROLE'),
        body: { code: group.code, name: '  Diego Pérez  ', userId: 'otra-cuenta' }
    });
    assert.equal(unlinked.status, 200);
    assert.equal(unlinked.body.data.profileCreated, true);
    assert.equal(unlinked.body.message, 'Te uniste al grupo Ruta');

    // El perfil es de la cuenta del token, no del userId enviado
    const created = await Passenger.findOne({ userId: 'sin-perfil', isActive: true });
    assert.equal(created.name, 'Diego Pérez');
    assert.equal(String(created.groupId), group._id);
    assert.equal(await Passenger.countDocuments({ userId: 'otra-cuenta' }), 0);

    const me = await request('GET', '/passengers/me', { token: tokenFor('sin-perfil', 'PASSENGER_ROLE') });
    assert.equal(me.body.data.groupId.name, 'Ruta');
    const detail = await request('GET', `/groups/${group._id}`, { token: DRIVER_A });
    assert.deepEqual(detail.body.data.passengers.map((p) => p.name), ['Diego Pérez']);

    // Sin nombre válido se usa uno genérico; un código inválido no crea perfil
    await request('POST', '/groups/join', { token: tokenFor('sin-nombre', 'USER_ROLE'), body: { code: group.code, name: { $ne: 1 } } });
    assert.equal((await Passenger.findOne({ userId: 'sin-nombre' })).name, 'Pasajero');
    assert.equal((await request('POST', '/groups/join', { token: tokenFor('sin-grupo', 'USER_ROLE'), body: { code: 'ZZZZZZ' } })).status, 404);
    assert.equal(await Passenger.countDocuments({ userId: 'sin-grupo' }), 0);

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

// ── Límite de grupos por conductor ────────────────────────────────────────────
// driver-a y driver-b tienen un límite propio de 5 (beforeEach); los demás
// conductores usan el límite general.

const setDefaultLimit = (maxGroupsPerDriver, token = ADMIN) =>
    request('PUT', '/groups/settings', { token, body: { maxGroupsPerDriver } });

const activeGroupsOf = (driverId) => Group.countDocuments({ driverId, isActive: true });

test('el límite general de grupos por conductor es 2 por defecto', async () => {
    const driverC = tokenFor('driver-c', 'DRIVER_ROLE');

    const settings = await request('GET', '/groups/settings', { token: ADMIN });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.data.maxGroupsPerDriver, 2);

    const me = await request('GET', '/groups/limit/me', { token: driverC });
    assert.deepEqual(me.body.data, {
        driverId: 'driver-c', maxGroups: 2, isCustom: false, defaultMaxGroups: 2, activeGroups: 0
    });

    await createGroup(driverC, 'Uno');
    await createGroup(driverC, 'Dos');

    const third = await request('POST', '/groups', { token: driverC, body: { name: 'Tres' } });
    assert.equal(third.status, 403);
    assert.equal(third.body.error, 'GROUP_LIMIT_REACHED');
    assert.match(third.body.message, /límite de 2 grupos activos/);
    assert.deepEqual(third.body.data, { maxGroups: 2, activeGroups: 2 });
    assert.equal(await activeGroupsOf('driver-c'), 2);
});

test('un administrador cambia el límite general y los conductores pueden crear hasta él', async () => {
    const driverC = tokenFor('driver-c', 'DRIVER_ROLE');

    const update = await setDefaultLimit(3);
    assert.equal(update.status, 200);
    assert.equal(update.body.data.maxGroupsPerDriver, 3);
    assert.equal((await request('GET', '/groups/settings', { token: ADMIN })).body.data.maxGroupsPerDriver, 3);

    for (const name of ['Uno', 'Dos', 'Tres']) await createGroup(driverC, name);
    assert.equal((await request('POST', '/groups', { token: driverC, body: { name: 'Cuatro' } })).status, 403);

    const me = await request('GET', '/groups/limit/me', { token: driverC });
    assert.equal(me.body.data.maxGroups, 3);
    assert.equal(me.body.data.activeGroups, 3);
});

test('el límite general solo lo ve y lo cambia un administrador, y debe ser un entero válido', async () => {
    for (const token of [DRIVER_A, tokenFor('u1', 'USER_ROLE'), tokenFor('p1', 'PASSENGER_ROLE')]) {
        assert.equal((await setDefaultLimit(50, token)).status, 403);
        assert.equal((await request('GET', '/groups/settings', { token })).status, 403);
    }
    assert.equal((await request('PUT', '/groups/settings', { body: { maxGroupsPerDriver: 50 } })).status, 401);

    for (const invalid of [-1, 1.5, 'abc', 101, null, true, '', { $gt: 0 }]) {
        const res = await setDefaultLimit(invalid);
        assert.equal(res.status, 400, `valor ${JSON.stringify(invalid)}`);
    }
    assert.equal((await request('PUT', '/groups/settings', { token: ADMIN })).status, 400);

    assert.equal((await request('GET', '/groups/settings', { token: ADMIN })).body.data.maxGroupsPerDriver, 2);
});

test('el límite propio de un conductor tiene prioridad y se puede quitar para volver al general', async () => {
    await setDefaultLimit(3);
    assert.equal((await setLimit('driver-c', 1)).body.data.maxGroups, 1);

    const limit = await request('GET', '/groups/limit/driver-c', { token: ADMIN });
    assert.equal(limit.body.data.maxGroups, 1);
    assert.equal(limit.body.data.isCustom, true);
    assert.equal(limit.body.data.defaultMaxGroups, 3);

    const reset = await request('DELETE', '/groups/limit/driver-c', { token: ADMIN });
    assert.equal(reset.status, 200);
    assert.equal(reset.body.data.maxGroups, 3);
    assert.equal(reset.body.data.isCustom, false);

    // Valores inválidos en el límite propio
    for (const invalid of [-1, 'abc', 2.5, null]) {
        assert.equal((await setLimit('driver-c', invalid)).status, 400);
    }
});

test('un conductor no ve ni modifica límites ajenos ni el suyo', async () => {
    assert.equal((await request('GET', '/groups/limit/driver-b', { token: DRIVER_A })).status, 403);
    assert.equal((await request('PUT', '/groups/limit/driver-a', { token: DRIVER_A, body: { maxGroups: 99 } })).status, 403);
    assert.equal((await request('DELETE', '/groups/limit/driver-a', { token: DRIVER_A })).status, 403);
    assert.equal((await request('GET', '/groups/limit/me', { token: tokenFor('u1', 'USER_ROLE') })).status, 403);

    assert.equal((await request('GET', '/groups/limit/me', { token: DRIVER_A })).body.data.maxGroups, 5);
});

test('el límite no se puede saltar con peticiones directas', async () => {
    const driverC = tokenFor('driver-c', 'DRIVER_ROLE');
    await createGroup(driverC, 'Uno');
    await createGroup(driverC, 'Dos');

    // Parámetros manipulados en el body
    const forged = await request('POST', '/groups', {
        token: driverC,
        body: { name: 'Tres', maxGroups: 99, driverId: 'driver-z', isActive: true }
    });
    assert.equal(forged.status, 403);

    // Desactivar uno libera el cupo, pero reactivarlo cuando ya se ocupó se rechaza
    const [first] = (await request('GET', '/groups', { token: driverC })).body.data;
    await request('PATCH', `/groups/${first._id}`, { token: driverC, body: { isActive: false } });
    await createGroup(driverC, 'Reemplazo');

    for (const isActive of [true, 'true']) {
        const reactivate = await request('PATCH', `/groups/${first._id}`, { token: driverC, body: { isActive, name: 'Cambiado' } });
        assert.equal(reactivate.status, 403);
        assert.equal(reactivate.body.error, 'GROUP_LIMIT_REACHED');
    }
    const stored = await Group.findById(first._id);
    assert.equal(stored.isActive, false);
    assert.equal(stored.name, first.name);

    assert.equal(await activeGroupsOf('driver-c'), 2);
    assert.equal(await Group.countDocuments({ driverId: 'driver-z' }), 0);
});

test('peticiones simultáneas no superan el límite', async () => {
    const driverC = tokenFor('driver-c', 'DRIVER_ROLE');
    await createGroup(driverC, 'Existente');

    const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) => request('POST', '/groups', { token: driverC, body: { name: `Carrera ${i}` } }))
    );

    assert.ok(results.every((r) => r.status === 201 || r.status === 403));
    assert.ok(await activeGroupsOf('driver-c') <= 2);
    // Los rechazados no dejan grupos a medio crear
    assert.equal(await Group.countDocuments({ driverId: 'driver-c' }), await activeGroupsOf('driver-c'));
});

test('bajar el límite conserva los grupos y membresías existentes, pero impide crear más', async () => {
    const groups = [];
    for (const name of ['G1', 'G2', 'G3']) groups.push(await createGroup(DRIVER_A, name));
    const passenger = await linkPassenger('user-lower');
    await request('POST', '/groups/join', { token: passenger.token, body: { code: groups[0].code } });

    await setLimit('driver-a', 1);

    const list = await request('GET', '/groups', { token: DRIVER_A });
    assert.equal(list.body.data.length, 3);
    assert.ok(list.body.data.every((g) => g.isActive));
    assert.equal(String((await Passenger.findById(passenger._id)).groupId), groups[0]._id);

    const me = await request('GET', '/groups/limit/me', { token: DRIVER_A });
    assert.equal(me.body.data.maxGroups, 1);
    assert.equal(me.body.data.activeGroups, 3);

    // Sigue gestionando sus grupos (editar nombre), pero no puede crear
    assert.equal((await request('PATCH', `/groups/${groups[1]._id}`, { token: DRIVER_A, body: { name: 'G2 bis' } })).status, 200);
    assert.equal((await request('POST', '/groups', { token: DRIVER_A, body: { name: 'G4' } })).status, 403);

    // Con 1 activo (= límite) todavía no puede; con 0 (< límite), sí
    await request('PATCH', `/groups/${groups[1]._id}`, { token: DRIVER_A, body: { isActive: false } });
    await request('DELETE', `/groups/${groups[2]._id}`, { token: DRIVER_A });
    assert.equal((await request('POST', '/groups', { token: DRIVER_A, body: { name: 'G4' } })).status, 403);

    await request('PATCH', `/groups/${groups[0]._id}`, { token: DRIVER_A, body: { isActive: false } });
    await createGroup(DRIVER_A, 'G4');

    // El mismo comportamiento al bajar el límite general
    const driverC = tokenFor('driver-c', 'DRIVER_ROLE');
    await createGroup(driverC, 'C1');
    await createGroup(driverC, 'C2');
    await setDefaultLimit(0);
    assert.equal(await activeGroupsOf('driver-c'), 2);
    assert.equal((await request('POST', '/groups', { token: driverC, body: { name: 'C3' } })).status, 403);
});

test('cada grupo recibe un código único, también garantizado por la base de datos', async () => {
    await setLimit('driver-a', 20);
    await setLimit('driver-b', 20);

    const created = await Promise.all([
        ...Array.from({ length: 10 }, (_, i) => request('POST', '/groups', { token: DRIVER_A, body: { name: `A${i}` } })),
        ...Array.from({ length: 10 }, (_, i) => request('POST', '/groups', { token: DRIVER_B, body: { name: `B${i}` } }))
    ]);
    assert.ok(created.every((r) => r.status === 201));

    const codes = created.map((r) => r.body.data.code);
    assert.equal(new Set(codes).size, codes.length);

    await assert.rejects(
        Group.create({ name: 'Duplicado', code: codes[0], driverId: 'driver-b' }),
        { code: 11000 }
    );
});

test('el conductor ve los pasajeros separados por cada uno de sus grupos', async () => {
    const morning = await createGroup(DRIVER_A, 'Mañana');
    const afternoon = await createGroup(DRIVER_A, 'Tarde');
    const empty = await createGroup(DRIVER_A, 'Vacío');
    const foreign = await createGroup(DRIVER_B, 'Ajeno');

    const ana = await linkPassenger('ana', 'Ana');
    const beto = await linkPassenger('beto', 'Beto');
    const carla = await linkPassenger('carla', 'Carla');
    const dani = await linkPassenger('dani', 'Dani');
    await request('POST', '/groups/join', { token: ana.token, body: { code: morning.code } });
    await request('POST', '/groups/join', { token: beto.token, body: { code: morning.code } });
    await request('POST', '/groups/join', { token: carla.token, body: { code: afternoon.code } });
    await request('POST', '/groups/join', { token: dani.token, body: { code: foreign.code } });

    const list = await request('GET', '/groups', { token: DRIVER_A });
    const counts = Object.fromEntries(list.body.data.map((g) => [g.name, g.passengerCount]));
    assert.deepEqual(counts, { 'Mañana': 2, 'Tarde': 1, 'Vacío': 0 });

    const names = async (group) =>
        (await request('GET', `/groups/${group._id}`, { token: DRIVER_A })).body.data.passengers.map((p) => p.name).sort();
    assert.deepEqual(await names(morning), ['Ana', 'Beto']);
    assert.deepEqual(await names(afternoon), ['Carla']);
    assert.deepEqual(await names(empty), []);

    // Los pasajeros del grupo ajeno no son accesibles
    const other = await request('GET', `/groups/${foreign._id}`, { token: DRIVER_A });
    assert.equal(other.status, 403);
    assert.equal(other.body.data, undefined);
});

test('unirse con un código válido devuelve el nombre del grupo y no permite suplantar a otro pasajero', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta norte');
    const ana = await linkPassenger('ana', 'Ana');
    const beto = await linkPassenger('beto', 'Beto');

    const res = await request('POST', '/groups/join', {
        token: ana.token,
        body: { code: group.code, userId: 'beto', passengerId: beto._id }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Te uniste al grupo Ruta norte');
    assert.equal(res.body.data.group.name, 'Ruta norte');
    assert.equal(res.body.data.passenger._id, ana._id);

    assert.equal(String((await Passenger.findById(ana._id)).groupId), group._id);
    assert.equal((await Passenger.findById(beto._id)).groupId, null);

    // Su rol no cambia por unirse: sigue sin poder gestionar grupos
    assert.equal((await request('GET', '/groups', { token: ana.token })).status, 403);
    assert.equal((await request('POST', '/groups', { token: ana.token, body: { name: 'Mío' } })).status, 403);
    assert.equal((await request('PATCH', `/groups/${group._id}`, { token: ana.token, body: { name: 'Mío' } })).status, 403);
    assert.equal((await request('DELETE', `/groups/${group._id}`, { token: ana.token })).status, 403);
});

test('unirse varias veces a la vez al mismo grupo deja una sola membresía', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');
    const passenger = await linkPassenger('user-race');

    const results = await Promise.all(
        Array.from({ length: 5 }, () => request('POST', '/groups/join', { token: passenger.token, body: { code: group.code } }))
    );

    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409, 409, 409]);
    assert.match(results.find((r) => r.status === 409).body.message, /Ya perteneces al grupo Ruta/);
    assert.equal(await Passenger.countDocuments({ userId: 'user-race', isActive: true }), 1);
});

test('unirse a otro grupo cambia la membresía (un pasajero pertenece a un solo grupo)', async () => {
    const first = await createGroup(DRIVER_A, 'Primero');
    const second = await createGroup(DRIVER_B, 'Segundo');
    const passenger = await linkPassenger('user-move');

    await request('POST', '/groups/join', { token: passenger.token, body: { code: first.code } });
    const move = await request('POST', '/groups/join', { token: passenger.token, body: { code: second.code } });
    assert.equal(move.status, 200);

    assert.equal(String((await Passenger.findById(passenger._id)).groupId), second._id);
    const firstDetail = await request('GET', `/groups/${first._id}`, { token: DRIVER_A });
    assert.deepEqual(firstDetail.body.data.passengers, []);
});

test('varias uniones simultáneas de una cuenta sin perfil crean un solo perfil', async () => {
    const group = await createGroup(DRIVER_A, 'Ruta');
    const token = tokenFor('nuevo', 'PASSENGER_ROLE');

    const results = await Promise.all(
        Array.from({ length: 5 }, () => request('POST', '/groups/join', { token, body: { code: group.code, name: 'Nuevo' } }))
    );

    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.ok(results.every((r) => r.status === 200 || r.status === 409));
    assert.equal(await Passenger.countDocuments({ userId: 'nuevo', isActive: true }), 1);
});

// ── Lista de pasajeros filtrada por grupo ─────────────────────────────────────

test('el conductor elige qué grupo de pasajeros ver con ?groupId', async () => {
    const morning = await createGroup(DRIVER_A, 'Mañana');
    const afternoon = await createGroup(DRIVER_A, 'Tarde');
    const empty = await createGroup(DRIVER_A, 'Vacío');

    const beto = await linkPassenger('beto', 'Beto');
    const ana = await linkPassenger('ana', 'Ana');
    const carla = await linkPassenger('carla', 'Carla');
    await linkPassenger('sin-grupo', 'Sin grupo');
    await request('POST', '/groups/join', { token: beto.token, body: { code: morning.code } });
    await request('POST', '/groups/join', { token: ana.token, body: { code: morning.code } });
    await request('POST', '/groups/join', { token: carla.token, body: { code: afternoon.code } });

    const names = async (group, token = DRIVER_A) => {
        const res = await request('GET', `/passengers?groupId=${group._id}`, { token });
        assert.equal(res.status, 200);
        return res.body.data.map((p) => p.name);
    };
    assert.deepEqual(await names(morning), ['Ana', 'Beto']);
    assert.deepEqual(await names(afternoon), ['Carla']);
    assert.deepEqual(await names(empty), []);
    assert.deepEqual(await names(morning, ADMIN), ['Ana', 'Beto']);

    // Sin filtro se conserva la lista completa
    assert.equal((await request('GET', '/passengers', { token: DRIVER_A })).body.data.length, 4);

    // Un grupo inactivo del propio conductor también se puede consultar
    await request('PATCH', `/groups/${afternoon._id}`, { token: DRIVER_A, body: { isActive: false } });
    assert.deepEqual(await names(afternoon), ['Carla']);
});

test('el filtro por grupo no deja ver grupos ajenos, eliminados o inválidos', async () => {
    const foreign = await createGroup(DRIVER_B, 'Ajeno');
    const passenger = await linkPassenger('dani', 'Dani');
    await request('POST', '/groups/join', { token: passenger.token, body: { code: foreign.code } });

    const other = await request('GET', `/passengers?groupId=${foreign._id}`, { token: DRIVER_A });
    assert.equal(other.status, 403);
    assert.equal(other.body.data, undefined);

    const deleted = await createGroup(DRIVER_A, 'Eliminado');
    await request('DELETE', `/groups/${deleted._id}`, { token: DRIVER_A });
    assert.equal((await request('GET', `/passengers?groupId=${deleted._id}`, { token: DRIVER_A })).status, 404);

    assert.equal((await request('GET', '/passengers?groupId=no-es-un-id', { token: DRIVER_A })).status, 400);
    assert.equal((await request('GET', `/passengers?groupId=${foreign._id}&groupId=${deleted._id}`, { token: DRIVER_A })).status, 400);

    // Un pasajero sigue viendo solo a su grupo, sin importar el filtro
    const own = await request('GET', `/passengers?groupId=${deleted._id}`, { token: passenger.token });
    assert.deepEqual(own.body.data.map((p) => p.name), ['Dani']);
});
