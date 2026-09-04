const userManagementService = require('../services/user-management.service');
const asyncHandler = require('../utils/async-handler');

/**
 * Equivalente a UserManagementController.cs. Todas las rutas requieren rol ADMIN_ROLE
 * (aplicado en src/routes/users.routes.js con el middleware authorize).
 */

// GET /api/v1/users
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userManagementService.getAllUsersAsync();
  res.status(200).json(users);
});

// PUT /api/v1/users/:userId/role?roleName=...
const updateRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { roleName } = req.query;
  const result = await userManagementService.updateUserRoleAsync(userId, roleName);
  res.status(200).json(result);
});

// GET /api/v1/users/:userId/roles
const getUserRoles = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const roles = await userManagementService.getUserRolesAsync(userId);
  res.status(200).json(roles);
});

// GET /api/v1/users/by-role?roleName=...
const getUsersByRole = asyncHandler(async (req, res) => {
  const { roleName } = req.query;
  const users = await userManagementService.getUsersByRoleAsync(roleName);
  res.status(200).json(users);
});

// PUT /api/v1/users/:userId/verify-email
const verifyEmailByAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await userManagementService.verifyUserEmailByAdminAsync(userId);
  res.status(200).json(result);
});

module.exports = { getAllUsers, updateRole, getUserRoles, getUsersByRole, verifyEmailByAdmin };