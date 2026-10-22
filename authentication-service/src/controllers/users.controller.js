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

// PUT /api/v1/users/:userId/passenger-type  { passengerType }
const updatePassengerType = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await userManagementService.updatePassengerTypeAsync(userId, req.body.passengerType);
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

// GET /api/v1/users/:userId
const getUserById = asyncHandler(async (req, res) => {
  const user = await userManagementService.getUserByIdAsync(req.params.userId);
  res.status(200).json(user);
});

// PUT /api/v1/users/:userId/profile (multipart/form-data)
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userManagementService.updateProfileAsync(req.user, req.params.userId, req.body, req.file);
  res.status(200).json(user);
});

module.exports = {
  getAllUsers,
  updateRole,
  updatePassengerType,
  getUserRoles,
  getUsersByRole,
  verifyEmailByAdmin,
  getUserById,
  updateProfile,
};