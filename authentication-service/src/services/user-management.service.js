const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const cloudinaryService = require('./cloudinary.service');
const fileValidator = require('../utils/file-validator');
const { toUserResponseDto } = require('../utils/user-mapper');
const { ArgumentError, BusinessException, ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');
const ErrorCodes = require('../utils/error-codes');
const RoleConstants = require('../utils/role-constants');
const logger = require('../../configs/logger.configuration');

/**
 * Lista todos los usuarios registrados con su rol principal.
 */
async function getAllUsersAsync() {
  const users = await userRepository.getAllAsync();
  return users.map((u) => toUserResponseDto(u));
}

/**
 * Equivalente a UserManagementService.UpdateUserRoleAsync (.NET)
 */
async function updateUserRoleAsync(userId, roleName) {
  const normalizedRoleName = (roleName || '').trim().toUpperCase();

  if (!userId || !userId.trim()) {
    throw new ArgumentError('Invalid userId');
  }
  if (!RoleConstants.ALLOWED_ROLES.includes(normalizedRoleName)) {
    throw new ArgumentError(`Role not allowed. Use ${RoleConstants.ADMIN_ROLE} or ${RoleConstants.USER_ROLE}`);
  }

  let user = await userRepository.getByIdAsync(userId);

  const isUserAdmin = user.userRoles.some((ur) => ur.role.name === RoleConstants.ADMIN_ROLE);
  if (isUserAdmin && normalizedRoleName !== RoleConstants.ADMIN_ROLE) {
    const adminCount = await roleRepository.countUsersInRoleAsync(RoleConstants.ADMIN_ROLE);
    if (adminCount <= 1) {
      throw new ConflictError('Cannot remove the last administrator');
    }
  }

  const role = await roleRepository.getByNameAsync(normalizedRoleName);
  if (!role) {
    throw new NotFoundError(`Role ${normalizedRoleName} not found`);
  }

  await userRepository.updateUserRoleAsync(userId, role.id);

  user = await userRepository.getByIdAsync(userId);

  return toUserResponseDto(user, role.name);
}

/**
 * Equivalente a UserManagementService.GetUserRolesAsync (.NET)
 */
async function getUserRolesAsync(userId) {
  return roleRepository.getUserRoleNamesAsync(userId);
}

/**
 * Equivalente a UserManagementService.GetUsersByRoleAsync (.NET)
 */
async function getUsersByRoleAsync(roleName) {
  const normalizedRoleName = (roleName || '').trim().toUpperCase();
  const usersInRole = await roleRepository.getUsersByRoleAsync(normalizedRoleName);
  return usersInRole.map((u) => toUserResponseDto(u, normalizedRoleName));
}

/**
 * Verifica el email de un usuario directamente por userId (acción de administrador,
 * sin token). Equivalente al flujo de auth.service.js#verifyEmailAsync pero disparado
 * desde el panel de administración en vez de por el enlace que recibe el usuario.
 */
async function verifyUserEmailByAdminAsync(userId) {
  const user = await userRepository.getByIdAsync(userId);

  if (!user.userEmail) {
    throw new NotFoundError('User has no email record to verify');
  }

  user.userEmail.emailVerified = true;
  user.status = true;
  user.userEmail.emailVerificationToken = null;
  user.userEmail.emailVerificationTokenExpiry = null;

  await userRepository.updateUserAsync(user);

  return toUserResponseDto(user);
}

/**
 * Datos de contacto de una cuenta (lo usa el panel para ver la cuenta de un pasajero).
 */
async function getUserByIdAsync(userId) {
  const user = await userRepository.getByIdAsync(userId);
  return toUserResponseDto(user);
}

/**
 * Actualiza nombre, apellido, teléfono y (opcionalmente) la foto de perfil.
 * Solo el propio usuario o un administrador pueden hacerlo.
 * El panel envía los campos en PascalCase (Name, Surname, Phone), igual que el
 * DTO del proyecto .NET original; se aceptan también en camelCase.
 */
async function updateProfileAsync(requester, userId, dto, profilePictureFile) {
  if (requester.id !== userId && requester.role !== RoleConstants.ADMIN_ROLE) {
    throw new ForbiddenError('Solo puedes editar tu propio perfil');
  }

  const name = (dto.name ?? dto.Name ?? '').toString().trim();
  const surname = (dto.surname ?? dto.Surname ?? '').toString().trim();
  const phone = (dto.phone ?? dto.Phone ?? '').toString().trim();

  if (!name || name.length > 25) {
    throw new ArgumentError('El nombre es obligatorio y no debe tener más de 25 caracteres');
  }
  if (!surname || surname.length > 25) {
    throw new ArgumentError('El apellido es obligatorio y no debe tener más de 25 caracteres');
  }
  if (!/^\d{8}$/.test(phone)) {
    throw new ArgumentError('El número de teléfono debe tener exactamente 8 dígitos');
  }

  const user = await userRepository.getByIdAsync(userId);

  if (profilePictureFile && profilePictureFile.size > 0) {
    const { isValid, errorMessage } = fileValidator.validateImage(profilePictureFile);
    if (!isValid) {
      throw new BusinessException(ErrorCodes.INVALID_FILE_FORMAT, errorMessage);
    }

    try {
      const fileName = fileValidator.generateSecureFileName(profilePictureFile.originalname);
      user.userProfile.profilePicture = await cloudinaryService.uploadImageAsync(profilePictureFile, fileName);
    } catch (err) {
      logger.error(`Error uploading profile image: ${err.message}`);
      throw new BusinessException(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Failed to upload profile image');
    }
  }

  user.name = name;
  user.surname = surname;
  user.userProfile.phone = phone;

  const updatedUser = await userRepository.updateUserAsync(user);
  return toUserResponseDto(updatedUser);
}

module.exports = {
  getAllUsersAsync,
  getUserByIdAsync,
  updateProfileAsync,
  updateUserRoleAsync,
  getUserRolesAsync,
  getUsersByRoleAsync,
  verifyUserEmailByAdminAsync,
};