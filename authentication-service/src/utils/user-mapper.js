const cloudinaryService = require('../services/cloudinary.service');
const { USER_ROLE } = require('./role-constants');

function getPrimaryRoleName(user) {
  return user.userRoles?.[0]?.role?.name || USER_ROLE;
}

/**
 * Equivalente a AuthService.MapToUserResponseDto (.NET)
 */
function toUserResponseDto(user, roleNameOverride) {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    username: user.username,
    email: user.email,
    profilePicture: cloudinaryService.getFullImageUrl(user.userProfile?.profilePicture || ''),
    phone: user.userProfile?.phone || '',
    role: roleNameOverride || getPrimaryRoleName(user),
    status: user.status,
    isEmailVerified: user.userEmail?.emailVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Equivalente a AuthService.MapToUserDetailsDto (.NET)
 */
function toUserDetailsDto(user) {
  return {
    id: user.id,
    username: user.username,
    profilePicture: cloudinaryService.getFullImageUrl(user.userProfile?.profilePicture || ''),
    role: getPrimaryRoleName(user),
  };
}

module.exports = { toUserResponseDto, toUserDetailsDto, getPrimaryRoleName };
