const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../configs/env.config');
const { USER_ROLE } = require('../utils/role-constants');

/**
 * Genera un JWT para el usuario. Equivalente a JwtTokenService.cs.
 * Claims: sub, jti, iat, role (se asume un único rol por usuario).
 */
function generateToken(user) {
  const role = user.userRoles?.[0]?.role?.name || USER_ROLE;

  const payload = {
    sub: user.id,
    jti: crypto.randomUUID(),
    role,
  };

  return jwt.sign(payload, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    expiresIn: `${env.jwt.expirationMinutes}m`,
  });
}

function verifyToken(token) {
  const payload = jwt.verify(token, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    clockTolerance: 0,
  });

  if (payload.type === 'refresh') {
    throw new Error('Token type mismatch');
  }

  return payload;
}

function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    jti: crypto.randomUUID(),
    type: 'refresh',
  };

  return jwt.sign(payload, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    expiresIn: `${env.jwt.refreshExpirationDays}d`,
  });
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    clockTolerance: 0,
  });

  if (payload.type !== 'refresh') {
    throw new Error('Token type mismatch');
  }

  return payload;
}

module.exports = { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken };
