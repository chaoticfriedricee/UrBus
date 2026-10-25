// src/features/posts/utils/urgent.js
// Misma regla que client-admin (features/post/store/postStore.js → hasUnreadUrgent).
// Sin dependencias para poder probarlo con node --test.

/** Fecha (ISO) del anuncio urgente activo más reciente, o null. */
export const latestUrgentAt = (posts) =>
  posts
    .filter((p) => p.isUrgent && !p.isDeleted && p.createdAt)
    .map((p) => p.createdAt)
    .reduce((latest, at) => (!latest || new Date(at) > new Date(latest) ? at : latest), null);

/** true si hay un urgente creado después de la última vez que se abrieron los anuncios. */
export const hasUnreadUrgent = (latestAt, lastSeenAt) => {
  if (!latestAt) return false;
  if (!lastSeenAt) return true;
  return new Date(latestAt) > new Date(lastSeenAt);
};
