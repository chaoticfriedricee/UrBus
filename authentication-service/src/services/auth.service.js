const userRepository = require('../repositories/user.repository');
const roleRepository = require('../repositories/role.repository');
const passwordHashService = require('./password-hash.service');
const jwtTokenService = require('./jwt-token.service');
const cloudinaryService = require('./cloudinary.service');
const emailService = require('./email.service');
const tokenGenerator = require('../utils/token-generator');
const { generateUserId } = require('../utils/uuid-generator');
const fileValidator = require('../utils/file-validator');
const { toUserResponseDto, toUserDetailsDto } = require('../utils/user-mapper');
const { BusinessException, UnauthorizedError } = require('../utils/errors');
const ErrorCodes = require('../utils/error-codes');
const RoleConstants = require('../utils/role-constants');
const env = require('../../configs/env.config');
const logger = require('../../configs/logger.configuration');

/**
 * Registro de usuario. Equivalente a AuthService.RegisterAsync (.NET).
 */
async function registerAsync(registerDto, profilePictureFile) {
  if (await userRepository.existsByEmailAsync(registerDto.email)) {
    logger.warn('Registration rejected: email already exists');
    throw new BusinessException(ErrorCodes.EMAIL_ALREADY_EXISTS, 'Email already exists');
  }

  if (await userRepository.existsByUsernameAsync(registerDto.username)) {
    logger.warn('Registration rejected: username already exists');
    throw new BusinessException(ErrorCodes.USERNAME_ALREADY_EXISTS, 'Username already exists');
  }

  // Validar y manejar la imagen de perfil
  let profilePicturePath;
  if (profilePictureFile && profilePictureFile.size > 0) {
    const { isValid, errorMessage } = fileValidator.validateImage(profilePictureFile);
    if (!isValid) {
      logger.warn(`File validation failed: ${errorMessage}`);
      throw new BusinessException(ErrorCodes.INVALID_FILE_FORMAT, errorMessage);
    }

    try {
      const fileName = fileValidator.generateSecureFileName(profilePictureFile.originalname);
      profilePicturePath = await cloudinaryService.uploadImageAsync(profilePictureFile, fileName);
    } catch (err) {
      logger.error('Error uploading profile image');
      throw new BusinessException(ErrorCodes.IMAGE_UPLOAD_FAILED, 'Failed to upload profile image');
    }
  } else {
    profilePicturePath = cloudinaryService.getDefaultAvatarUrl();
  }

  const emailVerificationToken = tokenGenerator.generateEmailVerificationToken();
  const userId = generateUserId();

  const defaultRole = await roleRepository.getByNameAsync(RoleConstants.USER_ROLE);
  if (!defaultRole) {
    throw new Error(`Default role '${RoleConstants.USER_ROLE}' not found. Ensure seeding runs before registration.`);
  }

  const createdUser = await userRepository.createUserAsync({
    id: userId,
    name: registerDto.name,
    surname: registerDto.surname,
    username: registerDto.username,
    email: registerDto.email.toLowerCase(),
    password: await passwordHashService.hashPassword(registerDto.password),
    status: false,
    userProfile: {
      profilePicture: profilePicturePath,
      phone: registerDto.phone,
    },
    userEmail: {
      emailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    userPasswordReset: {
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    },
    roleId: defaultRole.id,
  });

  logger.info(`User ${createdUser.username} registered successfully`);

  // Enviar email de verificación en background (no bloquea la respuesta)
  emailService
    .sendEmailVerificationAsync(createdUser.email, createdUser.username, emailVerificationToken)
    .then(() => logger.info('Verification email sent'))
    .catch((err) => logger.error(`Failed to send verification email: ${err.message}`));

  return {
    success: true,
    user: toUserResponseDto(createdUser, RoleConstants.USER_ROLE),
    message: 'Usuario registrado exitosamente. Por favor, verifica tu email para activar la cuenta.',
    emailVerificationRequired: true,
  };
}

/**
 * Login. Equivalente a AuthService.LoginAsync (.NET).
 */
async function loginAsync(loginDto) {
  let user;

  if (loginDto.emailOrUsername.includes('@')) {
    user = await userRepository.getByEmailAsync(loginDto.emailOrUsername.toLowerCase());
  } else {
    user = await userRepository.getByUserAsync(loginDto.emailOrUsername);
  }

  if (!user) {
    logger.warn('Failed login attempt');
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.status) {
    logger.warn('Failed login attempt');
    throw new UnauthorizedError('User account is disabled');
  }

  const passwordMatches = await passwordHashService.verifyPassword(loginDto.password, user.password);
  if (!passwordMatches) {
    logger.warn('Failed login attempt');
    throw new UnauthorizedError('Invalid credentials');
  }

  logger.info('User login succeeded');

  const token = jwtTokenService.generateToken(user);

  return {
    success: true,
    message: 'Login exitoso',
    token,
    userDetails: toUserDetailsDto(user),
    expiresAt: new Date(Date.now() + env.jwt.expirationMinutes * 60 * 1000),
  };
}

/**
 * Verificación de email. Equivalente a AuthService.VerifyEmailAsync (.NET).
 */
async function verifyEmailAsync(verifyEmailDto) {
  const user = await userRepository.getByEmailVerificationTokenAsync(verifyEmailDto.token);
  if (!user || !user.userEmail) {
    return { success: false, message: 'Invalid or expired verification token' };
  }

  user.userEmail.emailVerified = true;
  user.status = true;
  user.userEmail.emailVerificationToken = null;
  user.userEmail.emailVerificationTokenExpiry = null;

  await userRepository.updateUserAsync(user);

  try {
    await emailService.sendWelcomeEmailAsync(user.email, user.username);
  } catch (err) {
    logger.error(`Failed to send welcome email to ${user.email}: ${err.message}`);
  }

  logger.info(`Email verified successfully for user ${user.username}`);

  return {
    success: true,
    message: 'Email verificado exitosamente',
    data: { email: user.email, verified: true },
  };
}

/**
 * Reenvío de verificación. Equivalente a AuthService.ResendVerificationEmailAsync (.NET).
 */
async function resendVerificationEmailAsync(resendDto) {
  const user = await userRepository.getByEmailAsync(resendDto.email);
  if (!user || !user.userEmail) {
    return { success: false, message: 'Usuario no encontrado', data: { email: resendDto.email, sent: false } };
  }

  if (user.userEmail.emailVerified) {
    return { success: false, message: 'El email ya ha sido verificado', data: { email: user.email, verified: true } };
  }

  const newToken = tokenGenerator.generateEmailVerificationToken();
  user.userEmail.emailVerificationToken = newToken;
  user.userEmail.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await userRepository.updateUserAsync(user);

  try {
    await emailService.sendEmailVerificationAsync(user.email, user.username, newToken);
    return {
      success: true,
      message: 'Email de verificación enviado exitosamente',
      data: { email: user.email, sent: true },
    };
  } catch (err) {
    logger.error(`Failed to resend verification email to ${user.email}: ${err.message}`);
    return { success: false, message: 'Error al enviar el email de verificación', data: { email: user.email, sent: false } };
  }
}

/**
 * Solicitud de recuperación de contraseña. Equivalente a AuthService.ForgotPasswordAsync (.NET).
 */
async function forgotPasswordAsync(forgotPasswordDto) {
  const user = await userRepository.getByEmailAsync(forgotPasswordDto.email);
  if (!user) {
    // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
    return {
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación',
      data: { email: forgotPasswordDto.email, initiated: true },
    };
  }

  const resetToken = tokenGenerator.generatePasswordResetToken();

  if (!user.userPasswordReset) {
    const { UserPasswordReset } = require('../models');
    user.userPasswordReset = await UserPasswordReset.create({
      userId: user.id,
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    });
  } else {
    user.userPasswordReset.passwordResetToken = resetToken;
    user.userPasswordReset.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  }

  await userRepository.updateUserAsync(user);

  try {
    await emailService.sendPasswordResetAsync(user.email, user.username, resetToken);
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (err) {
    logger.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
  }

  return {
    success: true,
    message: 'Si el email existe, se ha enviado un enlace de recuperación',
    data: { email: forgotPasswordDto.email, initiated: true },
  };
}

/**
 * Reseteo de contraseña. Equivalente a AuthService.ResetPasswordAsync (.NET).
 */
async function resetPasswordAsync(resetPasswordDto) {
  const user = await userRepository.getByPasswordResetTokenAsync(resetPasswordDto.token);
  if (!user || !user.userPasswordReset) {
    return {
      success: false,
      message: 'Token de reset inválido o expirado',
      data: { token: resetPasswordDto.token, reset: false },
    };
  }

  user.password = await passwordHashService.hashPassword(resetPasswordDto.newPassword);
  user.userPasswordReset.passwordResetToken = null;
  user.userPasswordReset.passwordResetTokenExpiry = null;

  await userRepository.updateUserAsync(user);

  logger.info(`Password reset successfully for user ${user.username}`);

  return {
    success: true,
    message: 'Contraseña actualizada exitosamente',
    data: { email: user.email, reset: true },
  };
}

/**
 * Equivalente a AuthService.GetUserByIdAsync (.NET).
 */
async function getUserByIdAsync(userId) {
  const user = await userRepository.getByIdAsync(userId);
  if (!user) return null;
  return toUserResponseDto(user);
}

module.exports = {
  registerAsync,
  loginAsync,
  verifyEmailAsync,
  resendVerificationEmailAsync,
  forgotPasswordAsync,
  resetPasswordAsync,
  getUserByIdAsync,
};
