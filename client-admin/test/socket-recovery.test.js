import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSocketRecovery,
  RETRY_DELAYS_MS,
} from '../src/features/location/services/socketRecovery.js';

class FakeSocket {
  constructor() {
    this.connected = false;
    this.active = false;
    this.handlers = {};
    this.connectCalls = 0;
  }

  on(event, handler) {
    (this.handlers[event] ??= []).push(handler);
  }

  off(event, handler) {
    this.handlers[event] = (this.handlers[event] ?? []).filter((entry) => entry !== handler);
  }

  connect() {
    this.connectCalls += 1;
    this.active = true;
  }

  async fire(event, payload) {
    await Promise.all((this.handlers[event] ?? []).map((handler) => handler(payload)));
  }
}

function setup({ visible = true, refreshToken = async () => {} } = {}) {
  const socket = new FakeSocket();
  const doc = Object.assign(new EventTarget(), { visibilityState: visible ? 'visible' : 'hidden' });
  const win = new EventTarget();
  const timers = [];
  let expired = 0;
  const recovery = createSocketRecovery({
    socket,
    refreshToken,
    doc,
    win,
    onSessionExpired: () => { expired += 1; },
    setTimer: (fn, delay) => {
      const timer = { fn, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => { timer.cleared = true; },
  });
  const runTimers = () => {
    for (const timer of timers.splice(0)) if (!timer.cleared) timer.fn();
  };
  return { socket, doc, win, timers, runTimers, recovery, expired: () => expired };
}

const rejected = (message) => new Error(message);

test('retries with increasing delays and resets after a successful connection', async () => {
  const { socket, timers, runTimers } = setup();

  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers[0].delay, RETRY_DELAYS_MS[0]);
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers.length, 1);

  runTimers();
  assert.equal(socket.connectCalls, 1);
  socket.connected = true;
  socket.active = true;
  await socket.fire('connect');
  socket.connected = false;
  socket.active = false;
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers[0].delay, RETRY_DELAYS_MS[0]);
});

test('leaves network retries to Socket.IO', async () => {
  const { socket, timers } = setup();
  socket.active = true;
  await socket.fire('connect_error', rejected('websocket error'));
  assert.equal(timers.length, 0);
  assert.equal(socket.connectCalls, 0);
});

test('refreshes an expired access token once', async () => {
  let refreshes = 0;
  const { socket, expired } = setup({ refreshToken: async () => { refreshes += 1; } });

  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(refreshes, 1);
  assert.equal(socket.connectCalls, 1);

  socket.active = false;
  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(refreshes, 1);
  assert.equal(socket.connectCalls, 1);
  assert.equal(expired(), 1);
});

test('reports expiration when the refresh token is no longer valid', async () => {
  const { socket, expired } = setup({ refreshToken: async () => { throw new Error('401'); } });
  await socket.fire('connect_error', rejected('UNAUTHORIZED'));
  assert.equal(socket.connectCalls, 0);
  assert.equal(expired(), 1);
});

test('waits until visible or online before retrying', async () => {
  const { socket, doc, win, timers } = setup({ visible: false });
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  assert.equal(timers.length, 0);

  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('online'));
  assert.equal(socket.connectCalls, 1);
});

test('dispose cancels retries and removes listeners', async () => {
  const { socket, doc, timers, recovery } = setup();
  await socket.fire('connect_error', rejected('ACCESS_UNAVAILABLE'));
  recovery.dispose();
  assert.equal(timers[0].cleared, true);

  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(socket.connectCalls, 0);
});
