const authService = require('../services/auth.service');
const asyncHandler = require('../utils/async-handler');

/**
 * Equivalente a AuthController.cs.
 *
 * NOTA DE MIGRACIÓN: el AuthController.cs original solo exponía login, register
 * y verify-email, aunque AuthService.cs ya implementaba resend-verification,
 * forgot-password, reset-password y get-user-by-id. Aquí se exponen también esos
 * endpoints porque la lógica de negocio ya existía y forma parte de la
 * funcionalidad real del servicio. Si no los quieres expuestos, elimínalos de
 * src/routes/auth.routes.js sin tocar el servicio.
 */

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const result = await authService.loginAsync(req.body);
  res.status(200).json(result);
});

// POST /api/v1/auth/register (multipart/form-data)
const register = asyncHandler(async (req, res) => {
  const result = await authService.registerAsync(req.body, req.file);
  res.status(201).json(result);
});

// POST /api/v1/auth/verify-email
const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmailAsync(req.body);
  res.status(200).json(result);
});

// POST /api/v1/auth/resend-verification
const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmailAsync(req.body);
  res.status(200).json(result);
});

// POST /api/v1/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPasswordAsync(req.body);
  res.status(200).json(result);
});

// POST /api/v1/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordAsync(req.body);
  res.status(200).json(result);
});

// GET /api/v1/auth/me (usuario autenticado actual)
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getUserByIdAsync(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }
  return res.status(200).json(user);
});

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCurrentUser,
};
