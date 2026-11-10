export const NAV_ITEMS = [
  {
    key: 'home',
    path: '/dashboard',
    icon: 'home',
    exact: true,
    labels: { default: 'Inicio' },
  },
  {
    key: 'map',
    path: '/dashboard/location',
    icon: 'map',
    short: 'Mapa',
    labels: { default: 'Mapa en vivo', DRIVER_ROLE: 'Mi ruta' },
  },
  {
    key: 'passengers',
    path: '/dashboard/passengers',
    icon: 'users',
    short: 'Pasajeros',
    labels: {
      default: 'Pasajeros',
      DRIVER_ROLE: 'Mis pasajeros',
      PASSENGER_ROLE: 'Compañeros',
      USER_ROLE: 'Compañeros',
    },
  },
  {
    key: 'posts',
    path: '/dashboard/posts',
    icon: 'megaphone',
    labels: { default: 'Anuncios', PASSENGER_ROLE: 'Avisos', USER_ROLE: 'Avisos' },
  },
  {
    key: 'groups',
    path: '/dashboard/groups',
    icon: 'group',
    short: 'Grupos',
    labels: {
      default: 'Grupos',
      DRIVER_ROLE: 'Mis grupos',
      PASSENGER_ROLE: 'Mi grupo',
      USER_ROLE: 'Mi grupo',
    },
  },
  {
    key: 'users',
    path: '/dashboard/users',
    icon: 'shield',
    adminOnly: true,
    labels: { default: 'Usuarios' },
  },
];

export const navLabel = (role, key) => {
  const item = NAV_ITEMS.find((entry) => entry.key === key);
  return item?.labels[role] ?? item?.labels.default ?? '';
};

export const itemsForRole = (role) =>
  NAV_ITEMS.filter((item) => !item.adminOnly || role === 'ADMIN_ROLE');
