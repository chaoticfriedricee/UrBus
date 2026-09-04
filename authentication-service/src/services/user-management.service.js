const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const { toUserResponseDto } = require('../utils/user-mapper');
const { ArgumentError, ConflictError, NotFoundError } = require('../utils/errors');
const RoleConstants = require('../utils/role-constants');

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

module.exports = {
  getAllUsersAsync,
  updateUserRoleAsync,
  getUserRolesAsync,
  getUsersByRoleAsync,
  verifyUserEmailByAdminAsync,
};