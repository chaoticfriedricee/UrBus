// Antigüedad de la ubicación: una posición vieja nunca se presenta como en vivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeFreshness, formatAge, localTimestamp, shouldSendFix,
  STALE_AFTER_MS, MAX_FIX_AGE_MS, MIN_SEND_INTERVAL_MS,
} from '../src/features/location/services/locationFreshness.js';

const NOW = 10_000_000;

test('una posición reciente se muestra en vivo', () => {
  const result = describeFreshness({ seenAt: NOW - 3000 }, NOW);
  assert.equal(result.state, 'live');
  assert.match(result.label, /^En vivo · actualizada hace unos segundos$/);
});

test('sin posiciones nuevas pasa a "no actualizada" con su antigüedad', () => {
  assert.equal(describeFreshness({ seenAt: NOW - STALE_AFTER_MS }, NOW).state, 'live');
  const result = describeFreshness({ seenAt: NOW - 3 * 60_000 }, NOW);
  assert.equal(result.state, 'stale');
  assert.equal(result.label, 'Ubicación no actualizada · última hace 3 min');
});

test('si el conductor perdió la conexión es la última posición conocida, aunque sea reciente', () => {
  const result = describeFreshness({ seenAt: NOW - 1000, paused: true }, NOW);
  assert.equal(result.state, 'paused');
  assert.match(result.label, /^Conexión con el conductor perdida/);
});

test('al reanudarse vuelve a mostrarse en vivo', () => {
  assert.equal(describeFreshness({ seenAt: NOW - 5 * 60_000, paused: true }, NOW).state, 'paused');
  assert.equal(describeFreshness({ seenAt: NOW, paused: false }, NOW).state, 'live');
});

test('la antigüedad se calcula con ageMs del servidor, no con relojes ajenos', () => {
  assert.equal(localTimestamp({ ageMs: 90_000, updatedAt: '1999-01-01T00:00:00Z' }, NOW), NOW - 90_000);
  assert.equal(localTimestamp({}, NOW), NOW);
});

test('formatAge', () => {
  assert.equal(formatAge(-5), 'hace unos segundos');
  assert.equal(formatAge(25_000), 'hace 25 s');
  assert.equal(formatAge(61_000), 'hace 1 min');
  assert.equal(formatAge(2 * 3_600_000), 'hace 2 h');
});

test('shouldSendFix descarta posiciones viejas, repetidas o demasiado seguidas', () => {
  assert.equal(shouldSendFix({ timestamp: NOW }, null, NOW), true);
  assert.equal(shouldSendFix({ timestamp: NOW - MAX_FIX_AGE_MS - 1 }, null, NOW), false);
  assert.equal(shouldSendFix({}, null, NOW), false);
  const last = { timestamp: NOW };
  assert.equal(shouldSendFix({ timestamp: NOW }, last, NOW), false);
  assert.equal(shouldSendFix({ timestamp: NOW + MIN_SEND_INTERVAL_MS - 1 }, last, NOW), false);
  assert.equal(shouldSendFix({ timestamp: NOW + MIN_SEND_INTERVAL_MS }, last, NOW), true);
});
