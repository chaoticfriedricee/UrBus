import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestUrgentAt, hasUnreadUrgent } from '../src/features/posts/utils/urgent.js';

const posts = [
  { isUrgent: false, createdAt: '2026-10-24T12:00:00Z' },
  { isUrgent: true, createdAt: '2026-10-24T10:00:00Z' },
  { isUrgent: true, createdAt: '2026-10-24T11:00:00Z' },
  { isUrgent: true, isDeleted: true, createdAt: '2026-10-24T13:00:00Z' },
];

test('latestUrgentAt ignora los no urgentes y los eliminados', () => {
  assert.equal(latestUrgentAt(posts), '2026-10-24T11:00:00Z');
  assert.equal(latestUrgentAt([{ isUrgent: false, createdAt: '2026-10-24T12:00:00Z' }]), null);
  assert.equal(latestUrgentAt([]), null);
});

test('hasUnreadUrgent compara con la última vez que se abrieron los anuncios', () => {
  assert.equal(hasUnreadUrgent(null, null), false);
  assert.equal(hasUnreadUrgent('2026-10-24T11:00:00Z', null), true);
  assert.equal(hasUnreadUrgent('2026-10-24T11:00:00Z', '2026-10-24T10:59:00Z'), true);
  assert.equal(hasUnreadUrgent('2026-10-24T11:00:00Z', '2026-10-24T11:30:00Z'), false);
});
