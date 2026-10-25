// src/shared/utils/date.js
// Fechas en horario de Guatemala (misma regla que client-admin/src/shared/utils/date.js).
// Guatemala es UTC-6 todo el año (sin horario de verano), así que se calcula con un
// desfase fijo en vez de depender del soporte de zonas horarias de Intl en el teléfono.
const GT_OFFSET_MS = -6 * 60 * 60 * 1000;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Fecha y hora "de pared" en Guatemala, leída con los getters UTC
const toGT = (date) => new Date(date.getTime() + GT_OFFSET_MS);

const dayKeyGT = (date) => toGT(date).toISOString().slice(0, 10);

/** true si la fecha cae hoy en Guatemala (p. ej. el motivo de ausencia se oculta a las 0:00 GT). */
export const isTodayGT = (value, now = new Date()) => {
  const date = toDate(value);
  return Boolean(date) && dayKeyGT(date) === dayKeyGT(now);
};

/** "21 jul 2026, 03:45 p. m. (GMT-6)" */
export const formatDateGT = (value) => {
  const date = toDate(value);
  if (!date) return 'No disponible';
  const gt = toGT(date);
  const hours24 = gt.getUTCHours();
  const hours12 = hours24 % 12 || 12;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(gt.getUTCDate())} ${MONTHS[gt.getUTCMonth()]} ${gt.getUTCFullYear()}, `
    + `${pad(hours12)}:${pad(gt.getUTCMinutes())} ${hours24 < 12 ? 'a. m.' : 'p. m.'} (GMT-6)`;
};
