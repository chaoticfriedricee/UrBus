// Qué tan reciente es la ubicación del bus. Sin dependencias para poder probarlo con node --test.

// Sin posiciones nuevas por más de esto, la ubicación deja de mostrarse como "en vivo"
export const STALE_AFTER_MS = 45_000;
// El conductor no envía posiciones que el GPS ya tenía guardadas (p. ej. al volver del segundo plano)
export const MAX_FIX_AGE_MS = 30_000;
// Ni más de una cada 2 s: el mapa no lo necesita y ahorra batería y peticiones
export const MIN_SEND_INTERVAL_MS = 2_000;

/**
 * Momento (en el reloj de este dispositivo) en que el servidor recibió la posición.
 * location-service manda ageMs en vez de depender de que los relojes coincidan.
 */
export const localTimestamp = (payload, receivedAt) =>
  receivedAt - (Number.isFinite(payload?.ageMs) ? payload.ageMs : 0);

export const formatAge = (ms) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 10) return 'hace unos segundos';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.floor(minutes / 60)} h`;
};

/**
 * state:
 * - 'live': posición reciente.
 * - 'stale': el conductor sigue conectado pero no llegan posiciones (app en segundo plano, sin GPS...).
 * - 'paused': el conductor perdió la conexión; es solo la última posición conocida.
 */
export const describeFreshness = ({ seenAt, paused }, now) => {
  const ageMs = Math.max(0, now - seenAt);
  const age = formatAge(ageMs);
  if (paused) return { state: 'paused', ageMs, label: `Conexión con el conductor perdida · última ubicación ${age}` };
  if (ageMs > STALE_AFTER_MS) return { state: 'stale', ageMs, label: `Ubicación no actualizada · última ${age}` };
  return { state: 'live', ageMs, label: `En vivo · actualizada ${age}` };
};

/** Si el conductor debe enviar esta posición del GPS (fresca, más nueva y no demasiado seguida). */
export const shouldSendFix = (fix, lastSent, now) => {
  if (!Number.isFinite(fix?.timestamp) || now - fix.timestamp > MAX_FIX_AGE_MS) return false;
  if (!lastSent) return true;
  if (fix.timestamp <= lastSent.timestamp) return false;
  return fix.timestamp - lastSent.timestamp >= MIN_SEND_INTERVAL_MS;
};
