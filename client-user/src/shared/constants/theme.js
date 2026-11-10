export const COLORS = {
  primary: '#005691',
  primaryDark: '#00406d',
  primarySoft: '#e0ecf5',
  accent: '#ffc107',
  accentDark: '#d99e00',
  accentSoft: '#fff0b8',
  accentInk: '#6e5000',
  secondary: '#647081',
  background: '#f6f1e7',
  backgroundAlt: '#ece4d3',
  surface: '#fffdf8',
  text: '#1d2733',
  textLight: '#46515f',
  textMuted: '#647081',
  error: '#b83a2d',
  errorSoft: '#fadfda',
  success: '#2c7a4f',
  successSoft: '#dcefe3',
  presentGreen: '#2c7a4f',
  warning: '#c2570a',
  warningSoft: '#ffe5cd',
  delay: '#b83a2d',
  border: '#e6dfcf',
  borderStrong: '#cdc2aa',
  headerBlueStart: '#0a609f',
  headerBlueEnd: '#00497d',
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const FONT_SIZE = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 };
export const RADIUS = { sm: 7, md: 10, lg: 14, xl: 16, pill: 999 };

export const FONTS = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
};

export const SHADOWS = {
  card: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  soft: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
};

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

export const ROLE_PANEL = {
  USER_ROLE: 'Panel del usuario',
  PASSENGER_ROLE: 'Panel del pasajero',
  DRIVER_ROLE: 'Panel del conductor',
  ADMIN_ROLE: 'Panel de administración',
};

export const ROLE_TONES = {
  ADMIN_ROLE: { bg: '#e0ecf5', color: '#005691' },
  DRIVER_ROLE: { bg: '#fff0b8', color: '#6e5000' },
  PASSENGER_ROLE: { bg: '#dcefe3', color: '#2c7a4f' },
  USER_ROLE: { bg: '#ece4d3', color: '#46515f' },
};

export const MANAGER_ROLES = [ROLES.DRIVER, ROLES.ADMIN];

export const AVATAR_PALETTE = [
  { bg: '#f6d9c9', color: '#8f3f1d' },
  { bg: '#cfe3f2', color: '#1c5a8a' },
  { bg: '#d3ead9', color: '#1f6a43' },
  { bg: '#fbe6b6', color: '#7a5200' },
  { bg: '#e4d8f0', color: '#53307f' },
  { bg: '#f3d4dc', color: '#8a2c47' },
];
