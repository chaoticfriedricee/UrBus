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
  return jwt.verify(token, env.jwt.secret, {
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    clockTolerance: 0,
  });
}

module.exports = { generateToken, verifyToken };
