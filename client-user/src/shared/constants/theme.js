// src/shared/constants/theme.js

export const COLORS = {
  primary: '#005691',
  primaryDark: '#003b64',
  accent: '#F5C518',
  accentDark: '#E6A800',
  secondary: '#64748b',
  background: '#f4f6fb',
  surface: '#ffffff',
  text: '#111827',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  error: '#dc2626',
  success: '#16a34a',
  presentGreen: '#4ade80',
  warning: '#d97706',
  delay: '#ef4444',
  border: '#e5e7eb',
  headerBlueStart: '#8FC1E3',
  headerBlueEnd: '#4F8FC0',
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const FONT_SIZE = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 };
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};

// Roles permitidos por el sistema (compartidos con client-admin)
export const ROLES = {
  USER: 'USER_ROLE',
  PASSENGER: 'PASSENGER_ROLE',
  DRIVER: 'DRIVER_ROLE',
  ADMIN: 'ADMIN_ROLE',
};

export const ROLE_LABELS = {
  USER_ROLE: 'Usuario',
  PASSENGER_ROLE: 'Pasajero',
  DRIVER_ROLE: 'Conductor',
  ADMIN_ROLE: 'Administrador',
};

// Roles que pueden gestionar pasajeros y anuncios (funciones antes exclusivas de client-admin)
export const MANAGER_ROLES = [ROLES.DRIVER, ROLES.ADMIN];

// Paleta de avatares por iniciales (igual que client-admin)
export const AVATAR_PALETTE = [
  { bg: '#f9d4c8', color: '#b85c3a' },
  { bg: '#d4e8f9', color: '#2e6fa3' },
  { bg: '#d4f0e0', color: '#2e7d52' },
  { bg: '#f9e8d4', color: '#a06030' },
  { bg: '#e8d4f9', color: '#6030a0' },
  { bg: '#f9f0d4', color: '#8a7020' },
];