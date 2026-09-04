const { body, param, query } = require('express-validator');

/**
 * Equivalente a RegisterDto.cs
 */
const registerValidator = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 25 }).withMessage('El nombre no debe de tener más de 25 caracteres'),
  body('surname')
    .notEmpty().withMessage('El apellido es obligatorio')
    .isLength({ max: 25 }).withMessage('El apellido no debe de tener más de 25 caracteres'),
  body('username')
    .notEmpty().withMessage('El username es obligatorio')
    .isLength({ max: 25 }).withMessage('El username no debe de tener más de 25 caracteres'),
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El formato del email no es válido'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatorio')
    .isLength({ min: 8, max: 50 }).withMessage('La contraseña debe tener entre 8 y 50 caracteres'),
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .isLength({ min: 8, max: 8 }).withMessage('El número de teléfono debe de tener exactamente 8 caracteres.')
    .matches(/^\d{8}$/).withMessage('El número de teléfono debe de contener solo números.'),
];

/**
 * Equivalente a LoginDto.cs
 */
const loginValidator = [
  body('emailOrUsername').notEmpty().withMessage('emailOrUsername es requerido'),
  body('password').notEmpty().withMessage('password es requerido'),
];

/**
 * Equivalente a Email/VerifyEmailDto.cs
 */
const verifyEmailValidator = [
  body('token').notEmpty().withMessage('token es requerido'),
];

/**
 * Equivalente a Email/ResendVerificationDto.cs
 */
const resendVerificationValidator = [
  body('email').notEmpty().isEmail().withMessage('email válido es requerido'),
];

/**
 * Equivalente a Email/ForgotPasswordDto.cs
 */
const forgotPasswordValidator = [
  body('email').notEmpty().isEmail().withMessage('email válido es requerido'),
];

/**
 * Equivalente a Email/ResetPasswordDto.cs
 */
const resetPasswordValidator = [
  body('token').notEmpty().withMessage('token es requerido'),
  body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
];

/**
 * Equivalente a GetProfileByIdDto.cs
 */
const getProfileByIdValidator = [
  param('userId').notEmpty().withMessage('El userId es requerido'),
];

/**
 * Equivalente a UpdateUserRoleDto.cs
 */
const updateUserRoleValidator = [
  param('userId').notEmpty().withMessage('El userId es requerido'),
  query('roleName').notEmpty().withMessage('roleName es requerido'),
];

const getUsersByRoleValidator = [
  query('roleName').notEmpty().withMessage('roleName es requerido'),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  getProfileByIdValidator,
  updateUserRoleValidator,
  getUsersByRoleValidator,
};
