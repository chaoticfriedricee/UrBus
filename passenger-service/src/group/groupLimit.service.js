import Group from './group.model.js';
import GroupLimit from './groupLimit.model.js';
import Setting from '../settings/setting.model.js';

export const DEFAULT_MAX_GROUPS_PER_DRIVER = 2;
export const MAX_GROUPS_UPPER_BOUND = 100;

const MAX_GROUPS_SETTING_KEY = 'maxGroupsPerDriver';

// Acepta enteros (o su texto) entre 0 y MAX_GROUPS_UPPER_BOUND; devuelve null si no es válido
export const parseGroupLimit = (value) => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0 || limit > MAX_GROUPS_UPPER_BOUND) return null;

  return limit;
};

export const getDefaultMaxGroups = async () => {
  const setting = await Setting.findOne({ key: MAX_GROUPS_SETTING_KEY });
  return parseGroupLimit(setting?.value) ?? DEFAULT_MAX_GROUPS_PER_DRIVER;
};

export const setDefaultMaxGroups = async (maxGroups) => {
  await Setting.findOneAndUpdate(
    { key: MAX_GROUPS_SETTING_KEY },
    { key: MAX_GROUPS_SETTING_KEY, value: maxGroups },
    { new: true, upsert: true }
  );
  return maxGroups;
};

// Solo cuentan los grupos activos: uno desactivado o eliminado libera su cupo
// (y reactivarlo vuelve a pasar por el límite)
export const countActiveGroups = (driverId) =>
  Group.countDocuments({ driverId, isActive: true });

// Límite efectivo de un conductor: el asignado a él por un administrador o, si no
// tiene uno, el límite general
export const resolveGroupLimit = async (driverId) => {
  const [custom, defaultMaxGroups, activeGroups] = await Promise.all([
    GroupLimit.findOne({ driverId }),
    getDefaultMaxGroups(),
    countActiveGroups(driverId)
  ]);

  return {
    driverId,
    maxGroups: custom ? custom.maxGroups : defaultMaxGroups,
    isCustom: Boolean(custom),
    defaultMaxGroups,
    activeGroups
  };
};

export const limitReachedResponse = (res, { maxGroups, activeGroups }) =>
  res.status(403).json({
    success: false,
    message: `Alcanzaste el límite de ${maxGroups} grupo${maxGroups === 1 ? '' : 's'} activo${maxGroups === 1 ? '' : 's'} por conductor. Desactiva o elimina un grupo, o solicita a un administrador un límite mayor`,
    error: 'GROUP_LIMIT_REACHED',
    data: { maxGroups, activeGroups }
  });
