/**
 * Tipo de pasajero. Es independiente del rol: el rol define permisos
 * (ADMIN_ROLE, DRIVER_ROLE, ...) y el tipo de pasajero solo clasifica al
 * usuario como pasajero. Cambiar el tipo nunca otorga permisos.
 */
const FIXED_PASSENGER = 'FIXED_PASSENGER';
const OCCASIONAL_PASSENGER = 'OCCASIONAL_PASSENGER';

// Todo usuario nuevo se registra como pasajero fijo
const DEFAULT_PASSENGER_TYPE = FIXED_PASSENGER;

const ALLOWED_PASSENGER_TYPES = [FIXED_PASSENGER, OCCASIONAL_PASSENGER];

module.exports = {
  FIXED_PASSENGER,
  OCCASIONAL_PASSENGER,
  DEFAULT_PASSENGER_TYPE,
  ALLOWED_PASSENGER_TYPES,
};
