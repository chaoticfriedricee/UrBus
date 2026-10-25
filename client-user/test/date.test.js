import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTodayGT, formatDateGT } from '../src/shared/utils/date.js';

test('isTodayGT compara el día calendario en Guatemala (UTC-6)', () => {
  const now = new Date('2026-10-24T20:00:00Z'); // 14:00 en Guatemala
  assert.equal(isTodayGT('2026-10-24T06:30:00Z', now), true); // 00:30 GT del mismo día
  assert.equal(isTodayGT('2026-10-24T05:59:00Z', now), false); // 23:59 GT del día anterior
  assert.equal(isTodayGT('2026-10-25T05:00:00Z', now), true); // 23:00 GT, aún es hoy en GT
  assert.equal(isTodayGT('2026-10-25T06:00:00Z', now), false); // ya es mañana en GT
  assert.equal(isTodayGT(null, now), false);
  assert.equal(isTodayGT('no es fecha', now), false);
});

test('formatDateGT muestra la hora de Guatemala en formato de 12 h', () => {
  assert.equal(formatDateGT('2026-07-21T21:45:00Z'), '21 jul 2026, 03:45 p. m. (GMT-6)');
  assert.equal(formatDateGT('2026-01-02T06:05:00Z'), '02 ene 2026, 12:05 a. m. (GMT-6)');
  assert.equal(formatDateGT(undefined), 'No disponible');
});
