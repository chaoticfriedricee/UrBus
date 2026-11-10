export const ROLE_LABELS = {
  ADMIN_ROLE: 'Administrador',
  DRIVER_ROLE: 'Conductor',
  PASSENGER_ROLE: 'Pasajero',
  USER_ROLE: 'Usuario',
};

export const ROLE_PANEL = {
  ADMIN_ROLE: 'Panel de administración',
  DRIVER_ROLE: 'Panel del conductor',
  PASSENGER_ROLE: 'Panel del pasajero',
  USER_ROLE: 'Panel del usuario',
};

export const isAdminRole = (role) => role === 'ADMIN_ROLE';
export const isDriverRole = (role) => role === 'DRIVER_ROLE';
export const isManagerRole = (role) => role === 'ADMIN_ROLE' || role === 'DRIVER_ROLE';

export const getInitials = (name) =>
  name
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
    : '?';

export const getTone = (name) => `tone-${name ? name.charCodeAt(0) % 6 : 0}`;
