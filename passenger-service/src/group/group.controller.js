import Group from './group.model.js';
import GroupLimit from './groupLimit.model.js';
import Passenger from '../passenger/passenger.model.js';
import { createGroupWithUniqueCode } from './generateCode.js';
import {
  MAX_GROUPS_UPPER_BOUND,
  parseGroupLimit,
  getDefaultMaxGroups,
  setDefaultMaxGroups,
  countActiveGroups,
  resolveGroupLimit,
  limitReachedResponse
} from './groupLimit.service.js';

// Los grupos creados antes de existir isDeleted no tienen el campo
const NOT_DELETED = { isDeleted: { $ne: true } };

export const createGroup = async (req, res, next) => {
  try {

    if (req.user.role !== 'DRIVER_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'Solo un conductor puede crear grupos'
      });
    }

    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del grupo es obligatorio'
      });
    }

    // El dueño del grupo es siempre el conductor del token; driverId/code del body se ignoran
    const driverId = req.user.id;
    const { maxGroups, activeGroups } = await resolveGroupLimit(driverId);

    if (activeGroups >= maxGroups) {
      return limitReachedResponse(res, { maxGroups, activeGroups });
    }

    const group = await createGroupWithUniqueCode({ name: name.trim(), driverId });

    // MongoDB corre sin réplica (no hay transacciones): dos peticiones simultáneas
    // pueden pasar la comprobación anterior. Se vuelve a contar tras insertar y, si
    // se excedió el límite, se deshace la creación; así nunca quedan más grupos de
    // los permitidos (en el peor caso ambas peticiones se rechazan)
    const activeAfter = await countActiveGroups(driverId);

    if (activeAfter > maxGroups) {
      await Group.deleteOne({ _id: group._id });
      return limitReachedResponse(res, { maxGroups, activeGroups: activeAfter - 1 });
    }

    res.status(201).json({
      success: true,
      message: 'Grupo creado correctamente',
      data: group
    });

  } catch (err) {
    next(err);
  }
};

export const getGroups = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE' && req.user.role !== 'DRIVER_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver grupos'
      });
    }

    const filter = req.user.role === 'DRIVER_ROLE' ? { driverId: req.user.id, ...NOT_DELETED } : NOT_DELETED;
    const groups = await Group.find(filter).sort({ createdAt: -1 });

    const data = await Promise.all(
      groups.map(async (group) => {
        const passengerCount = await Passenger.countDocuments({ groupId: group._id, isActive: true });
        return { ...group.toObject(), passengerCount };
      })
    );

    res.status(200).json({
      success: true,
      data
    });

  } catch (err) {
    next(err);
  }
};

export const getGroupById = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE' && req.user.role !== 'DRIVER_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver este grupo'
      });
    }

    const { id } = req.params;
    const group = await Group.findOne({ _id: id, ...NOT_DELETED });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    if (req.user.role === 'DRIVER_ROLE' && group.driverId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos sobre este grupo'
      });
    }

    const passengers = await Passenger.find({ groupId: group._id, isActive: true });

    res.status(200).json({
      success: true,
      data: { ...group.toObject(), passengers }
    });

  } catch (err) {
    next(err);
  }
};

export const updateGroup = async (req, res, next) => {
  try {

    const { id } = req.params;
    const group = await Group.findOne({ _id: id, ...NOT_DELETED });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const isOwner = req.user.role === 'DRIVER_ROLE' && group.driverId === req.user.id;

    if (req.user.role !== 'ADMIN_ROLE' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para editar este grupo'
      });
    }

    const { name, isActive } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del grupo debe ser un texto no vacío'
      });
    }

    // Reactivar un grupo cuenta contra el límite del conductor (el admin puede excederlo)
    const isReactivating = (isActive === true || isActive === 'true') && !group.isActive;

    const checkLimit = isReactivating && req.user.role === 'DRIVER_ROLE';
    let maxGroups;

    if (checkLimit) {
      const limit = await resolveGroupLimit(group.driverId);
      maxGroups = limit.maxGroups;

      if (limit.activeGroups >= maxGroups) {
        return limitReachedResponse(res, limit);
      }
    }

    const previousName = group.name;
    if (name !== undefined) group.name = name.trim();
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

    // Misma verificación posterior que al crear: si otra petición simultánea ocupó
    // el cupo, se revierte este cambio
    if (checkLimit) {
      const activeAfter = await countActiveGroups(group.driverId);

      if (activeAfter > maxGroups) {
        group.isActive = false;
        group.name = previousName;
        await group.save();
        return limitReachedResponse(res, { maxGroups, activeGroups: activeAfter - 1 });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Grupo actualizado',
      data: group
    });

  } catch (err) {
    next(err);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {

    const { id } = req.params;
    const group = await Group.findOne({ _id: id, ...NOT_DELETED });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo no encontrado'
      });
    }

    const isOwner = req.user.role === 'DRIVER_ROLE' && group.driverId === req.user.id;

    if (req.user.role !== 'ADMIN_ROLE' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para eliminar este grupo'
      });
    }

    group.isActive = false;
    group.isDeleted = true;
    await group.save();

    await Passenger.updateMany({ groupId: group._id }, { groupId: null });

    res.status(200).json({
      success: true,
      message: 'Grupo eliminado'
    });

  } catch (err) {
    next(err);
  }
};

const MAX_PASSENGER_NAME_LENGTH = 100;

const passengerDisplayName = (name) =>
  (typeof name === 'string' && name.trim().slice(0, MAX_PASSENGER_NAME_LENGTH)) || 'Pasajero';

export const joinGroup = async (req, res, next) => {
  try {

    if (req.user.role !== 'PASSENGER_ROLE' && req.user.role !== 'USER_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'Solo un pasajero puede unirse a un grupo'
      });
    }

    const { code } = req.body;

    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El código del grupo es obligatorio'
      });
    }

    // El grupo (y con él su conductor) se resuelve solo a partir del código;
    // cualquier groupId o driverId enviado en el body se ignora
    const group = await Group.findOne({ code: code.trim().toUpperCase(), isActive: true, ...NOT_DELETED });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Código de grupo inválido o grupo inactivo'
      });
    }

    // Un pasajero pertenece a un solo grupo (groupId); unirse a otro lo cambia de grupo.
    // La condición groupId != grupo hace la asignación atómica: dos peticiones
    // simultáneas con el mismo código no pueden "unirlo dos veces"
    const assignToGroup = () => Passenger.findOneAndUpdate(
      { userId: req.user.id, isActive: true, groupId: { $ne: group._id } },
      { $set: { groupId: group._id } },
      { new: true }
    );

    let passenger = await assignToGroup();
    let profileCreated = false;

    if (!passenger && !(await Passenger.exists({ userId: req.user.id, isActive: true }))) {
      // Sin perfil de pasajero: el código del conductor sirve como autorización y
      // el perfil se crea aquí, siempre para la cuenta del token. El nombre es solo
      // el que se muestra en la lista del conductor (él puede corregirlo)
      try {
        passenger = await Passenger.create({
          name: passengerDisplayName(req.body.name),
          userId: req.user.id,
          groupId: group._id
        });
        profileCreated = true;
      } catch (err) {
        if (err.code !== 11000) throw err;
        // Otra petición simultánea creó el perfil (índice único por userId activo)
        passenger = await assignToGroup();
      }
    }

    if (!passenger) {
      return res.status(409).json({
        success: false,
        message: `Ya perteneces al grupo ${group.name}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Te uniste al grupo ${group.name}`,
      data: {
        group: { _id: group._id, name: group.name, code: group.code, isActive: group.isActive },
        passenger: { _id: passenger._id, name: passenger.name, groupId: passenger.groupId },
        profileCreated
      }
    });

  } catch (err) {
    next(err);
  }
};

// Busca el grupo activo al que pertenece la cuenta de un pasajero (o null)
export const findActiveMembership = async (userId) => {
  const passenger = await Passenger.findOne({ userId, isActive: true });
  if (!passenger?.groupId) return null;

  const group = await Group.findOne({ _id: passenger.groupId, isActive: true, ...NOT_DELETED });
  if (!group) return null;

  return { passenger, group };
};

// GET /groups/access — resuelve a qué grupos tiene acceso el usuario del token.
// Lo consultan post-service y location-service (reenviando el token del usuario)
// para autorizar publicaciones por grupo y la ubicación compartida del conductor.
export const getGroupAccess = async (req, res, next) => {
  try {

    const { id, role } = req.user;
    const access = {
      userId: id,
      role,
      ownedGroupIds: [],
      memberGroupId: null,
      driverId: null
    };

    if (role === 'DRIVER_ROLE') {
      const groups = await Group.find({ driverId: id, ...NOT_DELETED }).select('_id');
      access.ownedGroupIds = groups.map((g) => String(g._id));
      access.driverId = id;
    } else if (role === 'PASSENGER_ROLE' || role === 'USER_ROLE') {
      const membership = await findActiveMembership(id);
      if (membership) {
        access.memberGroupId = String(membership.group._id);
        access.driverId = membership.group.driverId;
      }
    }

    res.status(200).json({
      success: true,
      data: access
    });

  } catch (err) {
    next(err);
  }
};

const INVALID_LIMIT_MESSAGE = `El límite de grupos debe ser un número entero entre 0 y ${MAX_GROUPS_UPPER_BOUND}`;

export const setGroupLimit = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para asignar límites de grupos'
      });
    }

    const { driverId } = req.params;
    const maxGroups = parseGroupLimit(req.body?.maxGroups);

    if (maxGroups === null) {
      return res.status(400).json({
        success: false,
        message: INVALID_LIMIT_MESSAGE
      });
    }

    // Bajar el límite no toca los grupos existentes: solo impide crear o reactivar
    // más hasta que el conductor tenga menos grupos activos que el nuevo límite
    await GroupLimit.findOneAndUpdate(
      { driverId },
      { driverId, maxGroups },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Límite de grupos actualizado',
      data: await resolveGroupLimit(driverId)
    });

  } catch (err) {
    next(err);
  }
};

// DELETE /groups/limit/:driverId — quita el límite propio del conductor y vuelve al general
export const resetGroupLimit = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para asignar límites de grupos'
      });
    }

    const { driverId } = req.params;
    await GroupLimit.deleteOne({ driverId });

    res.status(200).json({
      success: true,
      message: 'El conductor usa ahora el límite general',
      data: await resolveGroupLimit(driverId)
    });

  } catch (err) {
    next(err);
  }
};

export const getGroupLimit = async (req, res, next) => {
  try {

    const { driverId } = req.params;

    if (req.user.role !== 'ADMIN_ROLE' && req.user.id !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver este límite'
      });
    }

    res.status(200).json({
      success: true,
      data: await resolveGroupLimit(driverId)
    });

  } catch (err) {
    next(err);
  }
};

export const getMyGroupLimit = async (req, res, next) => {
  try {

    if (req.user.role !== 'DRIVER_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver este límite'
      });
    }

    res.status(200).json({
      success: true,
      data: await resolveGroupLimit(req.user.id)
    });

  } catch (err) {
    next(err);
  }
};

// GET /groups/settings — configuración general de grupos (solo ADMIN)
export const getGroupSettings = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver la configuración de grupos'
      });
    }

    res.status(200).json({
      success: true,
      data: { maxGroupsPerDriver: await getDefaultMaxGroups() }
    });

  } catch (err) {
    next(err);
  }
};

// PUT /groups/settings — cambia el límite general de grupos por conductor (solo ADMIN)
export const updateGroupSettings = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para cambiar la configuración de grupos'
      });
    }

    const maxGroupsPerDriver = parseGroupLimit(req.body?.maxGroupsPerDriver);

    if (maxGroupsPerDriver === null) {
      return res.status(400).json({
        success: false,
        message: INVALID_LIMIT_MESSAGE
      });
    }

    await setDefaultMaxGroups(maxGroupsPerDriver);

    res.status(200).json({
      success: true,
      message: 'Límite general de grupos actualizado',
      data: { maxGroupsPerDriver }
    });

  } catch (err) {
    next(err);
  }
};
