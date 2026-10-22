import Group from './group.model.js';
import GroupLimit from './groupLimit.model.js';
import Passenger from '../passenger/passenger.model.js';
import { generateUniqueCode } from './generateCode.js';

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

    const limitDoc = await GroupLimit.findOne({ driverId: req.user.id });
    const maxGroups = limitDoc ? limitDoc.maxGroups : 0;

    const activeGroups = await Group.countDocuments({ driverId: req.user.id, isActive: true });

    if (activeGroups >= maxGroups) {
      return res.status(403).json({
        success: false,
        message: `Ha alcanzado el límite de grupos permitidos (${maxGroups}). Solicite un límite mayor a un administrador`
      });
    }

    const code = await generateUniqueCode();

    const group = await Group.create({
      name: name.trim(),
      code,
      driverId: req.user.id
    });

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

    const filter = req.user.role === 'DRIVER_ROLE' ? { driverId: req.user.id } : {};
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
    const group = await Group.findById(id);

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
    const group = await Group.findById(id);

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

    if (name !== undefined) group.name = name.trim();
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

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
    const group = await Group.findById(id);

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

    const group = await Group.findOne({ code: code.trim().toUpperCase(), isActive: true });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Código de grupo inválido'
      });
    }

    const passenger = await Passenger.findOne({ userId: req.user.id, isActive: true });

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'No tienes un perfil de pasajero vinculado'
      });
    }

    passenger.groupId = group._id;
    await passenger.save();

    res.status(200).json({
      success: true,
      message: 'Te uniste al grupo correctamente',
      data: { group, passenger }
    });

  } catch (err) {
    next(err);
  }
};

export const setGroupLimit = async (req, res, next) => {
  try {

    if (req.user.role !== 'ADMIN_ROLE') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para asignar límites de grupos'
      });
    }

    const { driverId } = req.params;
    const { maxGroups } = req.body;

    if (maxGroups === undefined || maxGroups === null || maxGroups < 0) {
      return res.status(400).json({
        success: false,
        message: 'El límite de grupos es obligatorio y debe ser mayor o igual a 0'
      });
    }

    const limit = await GroupLimit.findOneAndUpdate(
      { driverId },
      { driverId, maxGroups },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Límite de grupos actualizado',
      data: limit
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

    const limit = await GroupLimit.findOne({ driverId });

    res.status(200).json({
      success: true,
      data: { driverId, maxGroups: limit?.maxGroups ?? 0 }
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

    const limit = await GroupLimit.findOne({ driverId: req.user.id });

    res.status(200).json({
      success: true,
      data: { driverId: req.user.id, maxGroups: limit?.maxGroups ?? 0 }
    });

  } catch (err) {
    next(err);
  }
};
