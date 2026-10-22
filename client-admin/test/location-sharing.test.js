// Ciclo de vida de la ubicación compartida en el navegador, con dobles de prueba para
// el socket, la geolocalización y document/window (no hace falta un navegador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocationSharing, createSocketRecovery, RETRY_DELAYS_MS,
} from '../src/features/location/services/locationSharing.js';

class FakeSocket {
  constructor({ connected = true } = {}) {
    this.connected = connected;
    this.active = connected;
    this.handlers = {};
    this.emitted = [];
    this.connectCalls = 0;
    this.volatile = { emit: (event, payload) => this.emitted.push({ event, payload, volatile: true }) };
  }
  on(event, fn) { (this.handlers[event] ??= []).push(fn); }
  off(event, fn) { this.handlers[event] = (this.handlers[event] ?? []).filter((h) => h !== fn); }
  emit(event, payload) { this.emitted.push({ event, payload }); }
  connect() { this.connectCalls += 1; this.active = true; }
  fire(event, payload) { return Promise.all((this.handlers[event] ?? []).map((fn) => fn(payload))); }
  // Simula la reconexión que hace Socket.IO por su cuenta
  reconnect() { this.connected = true; this.active = true; return this.fire('connect'); }
  drop() { this.connected = false; return this.fire('disconnect'); }
  events(name) { return this.emitted.filter((e) => e.event === name); }
}

class FakeGeolocation {
  constructor() { this.watchers = new Map(); this.nextId = 1; this.created = 0; }
  watchPosition(onPosition, onError, options) {
    const id = this.nextId++;
    this.created += 1;
    this.watchers.set(id, { onPosition, onError, options });
    return id;
  }
  clearWatch(id) { this.watchers.delete(id); }
  get active() { return this.watchers.size; }
  fix(lat, lng, timestamp) {
    for (const w of this.watchers.values()) w.onPosition({ coords: { latitude: lat, longitude: lng }, timestamp });
  }
  fail(code) { for (const w of [...this.watchers.values()]) w.onError({ code, message: 'err' }); }
}

class FakeWakeLock {
  constructor() { this.requests = 0; this.sentinels = []; }
  async request() {
    this.requests += 1;
    const sentinel = new EventTarget();
    sentinel.released = false;
    sentinel.release = async () => { sentinel.released = true; sentinel.dispatchEvent(new Event('release')); };
    this.sentinels.push(sentinel);
    return sentinel;
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup({ connected = true, visible = true, clock = 1_000_000, geolocation = new FakeGeolocation() } = {}) {
  const socket = new FakeSocket({ connected });
  const doc = Object.assign(new EventTarget(), { visibilityState: visible ? 'visible' : 'hidden' });
  const win = new EventTarget();
  const wakeLock = new FakeWakeLock();
  const time = { now: clock };
  const changes = [];
  const sharing = createLocationSharing({
    socket, geolocation, doc, win, wakeLock, now: () => time.now, onChange: (s) => changes.push(s),
  });
  const setVisible = (value) => {
    doc.visibilityState = value ? 'visible' : 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  return { socket, geolocation, doc, win, wakeLock, time, changes, sharing, setVisible };
}

test('iniciar y detener: un solo watcher, startSharing/stopSharing y estado activo', () => {
  const { socket, geolocation, sharing, changes } = setup();

  assert.equal(sharing.start(), true);
  assert.equal(sharing.start(), false); // un doble clic no crea otro watcher
  assert.equal(geolocation.active, 1);
  assert.equal(socket.events('startSharing').length, 1);
  assert.equal(changes.at(-1).active, true);

  sharing.stop();
  assert.equal(geolocation.active, 0);
  assert.equal(socket.events('stopSharing').length, 1);
  assert.equal(changes.at(-1).active, false);
  assert.equal(sharing.isActive(), false);
});

test('solo envía posiciones frescas, nuevas y como máximo una cada 2 s', () => {
  const { socket, geolocation, sharing, time } = setup();
  sharing.start();

  geolocation.fix(14.6, -90.5, time.now - 60_000); // guardada por el GPS hace un minuto
  geolocation.fix(14.61, -90.51, time.now);
  geolocation.fix(14.62, -90.52, time.now + 500); // demasiado seguida
  geolocation.fix(14.63, -90.53, time.now - 1000); // más vieja que la última enviada
  geolocation.fix(14.64, -90.54, time.now + 2500);

  const sent = socket.events('busLocation');
  assert.deepEqual(sent.map((e) => e.payload.lat), [14.61, 14.64]);
  assert.ok(sent.every((e) => e.volatile));
  assert.equal(sent[0].payload.timestamp, time.now);
});

test('cambiar varias veces de app no deja watchers ni conexiones duplicadas', async () => {
  const { socket, geolocation, sharing, setVisible, doc, win } = setup();
  const recovery = createSocketRecovery({ socket, refreshToken: async () => {}, doc, win });
  sharing.start();

  for (let i = 0; i < 5; i++) {
    setVisible(false);
    setVisible(true);
  }
  assert.equal(geolocation.active, 1);
  // Cada regreso pide una posición fresca con un watcher nuevo, reemplazando al anterior
  assert.equal(geolocation.created, 6);
  // Conectado: volver a la pestaña no abre otra conexión
  assert.equal(socket.connectCalls, 0);

  // Desconectado por el servidor (Socket.IO no reintenta solo): un único connect() aunque vuelva muchas veces
  socket.connected = false;
  socket.active = false;
  for (let i = 0; i < 3; i++) setVisible(true);
  assert.equal(socket.connectCalls, 1);
  recovery.dispose();
});

test('tras reconectar vuelve a avisar startSharing y no reenvía lo acumulado sin conexión', async () => {
  const { socket, geolocation, sharing, time } = setup();
  sharing.start();

  await socket.drop();
  geolocation.fix(14.6, -90.5, time.now);
  assert.equal(socket.events('busLocation').length, 0);

  await socket.reconnect();
  assert.equal(socket.events('startSharing').length, 2);

  time.now += 3000;
  geolocation.fix(14.7, -90.6, time.now);
  assert.deepEqual(socket.events('busLocation').map((e) => e.payload.lat), [14.7]);
});

test('iniciar sin conexión avisa startSharing una sola vez, al conectar', async () => {
  const { socket, sharing } = setup({ connected: false });
  sharing.start();
  assert.equal(socket.events('startSharing').length, 0);
  await socket.reconnect();
  assert.equal(socket.events('startSharing').length, 1);
});

test('sin conexión, detener la ruta se entrega al reconectar y no se reanuda', async () => {
  const { socket, sharing } = setup();
  sharing.start();
  await socket.drop();
  sharing.stop();
  // stopSharing no es volatile: Socket.IO lo guarda y lo envía al reconectar
  assert.equal(socket.events('stopSharing').at(-1).volatile, undefined);
  await socket.reconnect();
  assert.equal(socket.events('startSharing').length, 1);
});

test('permiso denegado: deja de compartir y no se reporta como activo', () => {
  const { socket, geolocation, sharing, changes } = setup();
  sharing.start();
  geolocation.fail(1);

  assert.equal(sharing.isActive(), false);
  assert.equal(geolocation.active, 0);
  assert.equal(socket.events('stopSharing').length, 1);
  assert.deepEqual(changes.at(-1), { active: false, error: 'PERMISSION_DENIED', lastSentAt: null });
});

test('GPS sin señal o tiempo agotado: sigue activo, muestra el error y se limpia con la siguiente posición', () => {
  const { geolocation, sharing, changes, time } = setup();
  sharing.start();

  geolocation.fail(2);
  assert.equal(changes.at(-1).error, 'POSITION_UNAVAILABLE');
  geolocation.fail(3);
  assert.equal(changes.at(-1).error, 'TIMEOUT');
  assert.equal(sharing.isActive(), true);
  assert.equal(geolocation.active, 1);

  geolocation.fix(14.6, -90.5, time.now);
  assert.equal(changes.at(-1).error, null);
  assert.equal(changes.at(-1).lastSentAt, time.now);
});

test('sin geolocalización en el navegador no inicia', () => {
  const { socket, sharing, changes } = setup({ geolocation: null });
  assert.equal(sharing.start(), false);
  assert.equal(changes.at(-1).error, 'UNSUPPORTED');
  assert.equal(socket.events('startSharing').length, 0);
});

test('cerrar la página termina la ruta; entrar al bfcache no', () => {
  const { socket, sharing, win } = setup();
  sharing.start();
  win.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
  assert.equal(sharing.isActive(), true);
  win.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }));
  assert.equal(sharing.isActive(), false);
  assert.equal(socket.events('stopSharing').length, 1);
});

test('wake lock: se pide con la pestaña visible, se vuelve a pedir al regresar y se suelta al detener', async () => {
  const { sharing, wakeLock, setVisible } = setup();
  sharing.start();
  sharing.start();
  await tick();
  assert.equal(wakeLock.requests, 1);

  // El navegador lo suelta al ocultar la pestaña
  setVisible(false);
  await wakeLock.sentinels[0].release();
  setVisible(true);
  await tick();
  assert.equal(wakeLock.requests, 2);

  sharing.stop();
  await tick();
  assert.equal(wakeLock.sentinels[1].released, true);
});

test('con la pestaña oculta no se pide wake lock', async () => {
  const { sharing, wakeLock } = setup({ visible: false });
  sharing.start();
  await tick();
  assert.equal(wakeLock.requests, 0);
});

test('dispose deja de escuchar el socket y la página', async () => {
  const { socket, sharing, setVisible, geolocation } = setup();
  sharing.start();
  sharing.dispose();
  assert.equal(socket.events('stopSharing').length, 1);

  await socket.reconnect();
  setVisible(true);
  assert.equal(socket.events('startSharing').length, 1);
  assert.equal(geolocation.active, 0);
});

// --- Reconexión del socket ---

function setupRecovery({ visible = true, refreshToken = async () => 'nuevo' } = {}) {
  const socket = new FakeSocket({ connected: false });
  socket.active = false;
  const doc = Object.assign(new EventTarget(), { visibilityState: visible ? 'visible' : 'hidden' });
  const win = new EventTarget();
  const timers = [];
  let expired = 0;
  const recovery = createSocketRecovery({
    socket, refreshToken, doc, win,
    onSessionExpired: () => { expired += 1; },
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimer: (t) => { t.cleared = true; },
  });
  const runTimers = () => { for (const t of timers.splice(0)) if (!t.cleared) t.fn(); };
  return { socket, doc, win, timers, runTimers, recovery, expired: () => expired };
}

const rejected = (message) => new Error(message);

test('servicio no disponible: reintenta con espera creciente y reinicia al conectar', async () => {
  const { socket, timers, runTimers } = setupRecovery();

  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers[0].ms, RETRY_DELAYS_MS[0]);
  // Un segundo error mientras ya hay un reintento programado no programa otro
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers.length, 1);

  runTimers();
  assert.equal(socket.connectCalls, 1);
  socket.active = false;
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers[0].ms, RETRY_DELAYS_MS[1]);

  runTimers();
  await socket.reconnect();
  socket.connected = false;
  socket.active = false;
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers[0].ms, RETRY_DELAYS_MS[0]);
});

test('un corte de red lo reintenta Socket.IO: no se programa otro reintento', async () => {
  const { socket, timers } = setupRecovery();
  socket.active = true;
  await socket.fire('connect_error', rejected('websocket error'));
  assert.equal(timers.length, 0);
  assert.equal(socket.connectCalls, 0);
});

test('token vencido: se renueva una vez y se reconecta', async () => {
  let refreshes = 0;
  const { socket, expired } = setupRecovery({ refreshToken: async () => { refreshes += 1; return 'nuevo'; } });

  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(refreshes, 1);
  assert.equal(socket.connectCalls, 1);

  // Rechazado otra vez con el token nuevo: la sesión ya no es válida, no se insiste
  socket.active = false;
  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(refreshes, 1);
  assert.equal(socket.connectCalls, 1);
  assert.equal(expired(), 1);
});

test('si el refresh token también venció no se reconecta', async () => {
  const { socket, expired } = setupRecovery({ refreshToken: async () => { throw new Error('401'); } });
  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(socket.connectCalls, 0);
  assert.equal(expired(), 1);
});

test('en segundo plano no reintenta; al volver o recuperar la red reconecta una vez', async () => {
  const { socket, doc, win, timers } = setupRecovery({ visible: false });
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers.length, 0);

  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('online'));
  assert.equal(socket.connectCalls, 1);
});

test('dispose cancela el reintento pendiente', async () => {
  const { socket, timers, recovery } = setupRecovery();
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  recovery.dispose();
  assert.equal(timers[0].cleared, true);
});
