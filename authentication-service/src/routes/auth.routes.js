const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const upload = require('../../configs/upload.configuration');
const { authLimiter } = require('../../configs/rateLimit.configuration');
const {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../dtos/auth.validators');

const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// POST /api/v1/auth/register (multipart/form-data, límite de 10MB como en [RequestSizeLimit] .NET)
router.post(
  '/register',
  authLimiter,
  upload.single('profilePicture'),
  registerValidator,
  validate,
  authController.register,
);

// POST /api/v1/auth/verify-email
router.post('/verify-email', authLimiter, verifyEmailValidator, validate, authController.verifyEmail);

// POST /api/v1/auth/resend-verification
router.post(
  '/resend-verification',
  authLimiter,
  resendVerificationValidator,
  validate,
  authController.resendVerification,
);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, resetPasswordValidator, validate, authController.resetPassword);

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
