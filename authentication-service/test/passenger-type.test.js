// Pruebas de integración del tipo de pasajero. Necesitan un PostgreSQL accesible
// con las credenciales de .env (por ejemplo el de docker compose); se crea y se
// elimina una base de datos aparte (TEST_DB_NAME, por defecto urbus_users_test).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'urbus_users_test';

// Debe definirse antes de cargar configs/env.config (dotenv no sobrescribe variables ya definidas)
process.env.DB_NAME = TEST_DB_NAME;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SMTP_ENABLED = 'false';
process.env.BREVO_ENABLED = 'false';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.API_RATE_LIMIT_MAX = '1000';
process.env.NODE_ENV = 'test';

const env = require('../configs/env.config');

const adminClient = () => new Client({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: 'postgres',
});

let server;
let baseUrl;
let sequelize;
let models;
let jwtTokenService;

const tokenFor = (id, role) => jwtTokenService.generateToken({ id, userRoles: [{ role: { name: role } }] });

const request = async (method, path, { token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

const registerForm = (suffix, extra = {}) => {
  const form = new FormData();
  const fields = {
    name: 'Ana',
    surname: 'Pérez',
    username: `ana_${suffix}`,
    email: `ana_${suffix}@test.local`,
    password: 'Password123!',
    phone: '12345678',
    ...extra,
  };
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
};

before(async () => {
  const client = adminClient();
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
  await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  await client.end();

  sequelize = require('../src/models/sequelize');
  models = require('../src/models');
  jwtTokenService = require('../src/services/jwt-token.service');
  const { seedAsync } = require('../src/database/seed');
  const { migrateAsync } = require('../src/database/migrations');
  const createApp = require('../configs/app');

  await sequelize.sync();
  await migrateAsync();
  await seedAsync();

  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();

  const client = adminClient();
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
  await client.end();
});

const getAdmin = () => models.User.findOne({ where: { username: 'admin' } });

test('un usuario nuevo se registra como pasajero fijo', async () => {
  const res = await request('POST', '/auth/register', { body: registerForm('default') });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.passengerType, 'FIXED_PASSENGER');
  assert.equal(res.body.user.role, 'USER_ROLE');

  const stored = await models.User.findByPk(res.body.user.id);
  assert.equal(stored.passengerType, 'FIXED_PASSENGER');
});

test('el registro ignora el tipo de pasajero y el rol enviados por el cliente', async () => {
  const res = await request('POST', '/auth/register', {
    body: registerForm('forged', { passengerType: 'OCCASIONAL_PASSENGER', role: 'ADMIN_ROLE' }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.passengerType, 'FIXED_PASSENGER');
  assert.equal(res.body.user.role, 'USER_ROLE');
});

test('solo un administrador puede cambiar el tipo de pasajero, sin tocar el rol', async () => {
  const reg = await request('POST', '/auth/register', { body: registerForm('change') });
  const userId = reg.body.user.id;
  const admin = await getAdmin();

  const asSelf = await request('PUT', `/users/${userId}/passenger-type`, {
    token: tokenFor(userId, 'USER_ROLE'),
    body: { passengerType: 'OCCASIONAL_PASSENGER' },
  });
  assert.equal(asSelf.status, 403);

  const asDriver = await request('PUT', `/users/${userId}/passenger-type`, {
    token: tokenFor('driver-1', 'DRIVER_ROLE'),
    body: { passengerType: 'OCCASIONAL_PASSENGER' },
  });
  assert.equal(asDriver.status, 403);

  const asPassenger = await request('PUT', `/users/${userId}/passenger-type`, {
    token: tokenFor('passenger-1', 'PASSENGER_ROLE'),
    body: { passengerType: 'OCCASIONAL_PASSENGER' },
  });
  assert.equal(asPassenger.status, 403);

  const unauthenticated = await request('PUT', `/users/${userId}/passenger-type`, {
    body: { passengerType: 'OCCASIONAL_PASSENGER' },
  });
  assert.equal(unauthenticated.status, 401);

  assert.equal((await models.User.findByPk(userId)).passengerType, 'FIXED_PASSENGER');

  const asAdmin = await request('PUT', `/users/${userId}/passenger-type`, {
    token: tokenFor(admin.id, 'ADMIN_ROLE'),
    body: { passengerType: 'occasional_passenger' },
  });
  assert.equal(asAdmin.status, 200);
  assert.equal(asAdmin.body.passengerType, 'OCCASIONAL_PASSENGER');
  // Cambiar el tipo de pasajero no concede permisos
  assert.equal(asAdmin.body.role, 'USER_ROLE');
});

test('el administrador no puede asignar un tipo de pasajero inexistente', async () => {
  const reg = await request('POST', '/auth/register', { body: registerForm('invalid') });
  const admin = await getAdmin();

  const res = await request('PUT', `/users/${reg.body.user.id}/passenger-type`, {
    token: tokenFor(admin.id, 'ADMIN_ROLE'),
    body: { passengerType: 'ADMIN_ROLE' },
  });
  assert.equal(res.status, 400);

  const missing = await request('PUT', '/users/no-existe/passenger-type', {
    token: tokenFor(admin.id, 'ADMIN_ROLE'),
    body: { passengerType: 'FIXED_PASSENGER' },
  });
  assert.equal(missing.status, 404);
});

test('editar el propio perfil no cambia el tipo de pasajero', async () => {
  const reg = await request('POST', '/auth/register', { body: registerForm('profile') });
  const userId = reg.body.user.id;

  const form = new FormData();
  form.append('name', 'Ana María');
  form.append('surname', 'Pérez');
  form.append('phone', '87654321');
  form.append('passengerType', 'OCCASIONAL_PASSENGER');

  const res = await request('PUT', `/users/${userId}/profile`, {
    token: tokenFor(userId, 'USER_ROLE'),
    body: form,
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Ana María');
  assert.equal(res.body.passengerType, 'FIXED_PASSENGER');
});

test('la migración agrega la columna a usuarios existentes sin sobrescribir asignaciones', async () => {
  const { migrateAsync } = require('../src/database/migrations');
  const queryInterface = sequelize.getQueryInterface();

  // Simula una base de datos anterior a esta funcionalidad
  await queryInterface.removeColumn('users', 'passenger_type');
  await migrateAsync();

  const admin = await getAdmin();
  assert.equal(admin.passengerType, 'FIXED_PASSENGER');

  // Con la columna ya creada, volver a migrar no toca los valores asignados
  await admin.update({ passengerType: 'OCCASIONAL_PASSENGER' });
  await migrateAsync();
  assert.equal((await getAdmin()).passengerType, 'OCCASIONAL_PASSENGER');
});
