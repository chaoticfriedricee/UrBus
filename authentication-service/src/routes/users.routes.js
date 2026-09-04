const express = require('express');
const usersController = require('../controllers/users.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const { ADMIN_ROLE } = require('../utils/role-constants');
const {
  updateUserRoleValidator,
  getProfileByIdValidator,
  getUsersByRoleValidator,
} = require('../dtos/auth.validators');

const router = express.Router();

// Todas las rutas requieren estar autenticado y tener rol ADMIN_ROLE,
// igual que [Authorize(Roles = "ADMIN_ROLE")] en UserManagmentController.cs
router.use(authenticate, authorize(ADMIN_ROLE));

// GET /api/v1/users
router.get('/', usersController.getAllUsers);

// PUT /api/v1/users/:userId/role?roleName=...
router.put('/:userId/role', updateUserRoleValidator, validate, usersController.updateRole);

// PUT /api/v1/users/:userId/verify-email
router.put('/:userId/verify-email', getProfileByIdValidator, validate, usersController.verifyEmailByAdmin);

// GET /api/v1/users/:userId/roles
router.get('/:userId/roles', getProfileByIdValidator, validate, usersController.getUserRoles);

// GET /api/v1/users/by-role?roleName=...
router.get('/by-role', getUsersByRoleValidator, validate, usersController.getUsersByRole);

module.exports = router;