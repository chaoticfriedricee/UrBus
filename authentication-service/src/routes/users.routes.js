const express = require('express');
const usersController = require('../controllers/users.controller');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const validate = require('../../middlewares/validate');
const upload = require('../../configs/upload.configuration');
const { ADMIN_ROLE, DRIVER_ROLE } = require('../utils/role-constants');
const {
  updateUserRoleValidator,
  updatePassengerTypeValidator,
  getProfileByIdValidator,
  getUsersByRoleValidator,
} = require('../dtos/auth.validators');

const router = express.Router();

// Todas las rutas requieren estar autenticado. La mayoría además requiere
// ADMIN_ROLE, igual que [Authorize(Roles = "ADMIN_ROLE")] en UserManagmentController.cs
router.use(authenticate);

const adminOnly = authorize(ADMIN_ROLE);

// GET /api/v1/users
router.get('/', adminOnly, usersController.getAllUsers);

// PUT /api/v1/users/:userId/role?roleName=...
router.put('/:userId/role', adminOnly, updateUserRoleValidator, validate, usersController.updateRole);

// PUT /api/v1/users/:userId/passenger-type — solo ADMIN (el tipo no se elige al registrarse ni al editar el perfil)
router.put(
  '/:userId/passenger-type',
  adminOnly,
  updatePassengerTypeValidator,
  validate,
  usersController.updatePassengerType,
);

// PUT /api/v1/users/:userId/verify-email
router.put('/:userId/verify-email', adminOnly, getProfileByIdValidator, validate, usersController.verifyEmailByAdmin);

// GET /api/v1/users/:userId/roles
router.get('/:userId/roles', adminOnly, getProfileByIdValidator, validate, usersController.getUserRoles);

// GET /api/v1/users/by-role?roleName=...
router.get('/by-role', adminOnly, getUsersByRoleValidator, validate, usersController.getUsersByRole);

// El panel admin manda la foto como "ProfilePicture" (DTO .NET) y la app móvil como
// "profilePicture"; se aceptan ambos y se deja en req.file como con upload.single.
const profilePictureUpload = [
  upload.fields([
    { name: 'ProfilePicture', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 },
  ]),
  (req, res, next) => {
    req.file = req.files?.ProfilePicture?.[0] || req.files?.profilePicture?.[0];
    next();
  },
];

// PUT /api/v1/users/:userId/profile (multipart/form-data) — el propio usuario o un admin
router.put(
  '/:userId/profile',
  profilePictureUpload,
  getProfileByIdValidator,
  validate,
  usersController.updateProfile,
);

// GET /api/v1/users/:userId — ADMIN o DRIVER (info de contacto de la cuenta de un pasajero)
router.get(
  '/:userId',
  authorize(ADMIN_ROLE, DRIVER_ROLE),
  getProfileByIdValidator,
  validate,
  usersController.getUserById,
);

module.exports = router;