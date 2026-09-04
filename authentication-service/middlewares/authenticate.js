const jwtTokenService = require('../src/services/jwt-token.service');
const { UnauthorizedError } = require('../src/utils/errors');

/**
 * Middleware de autenticación JWT. Equivalente a app.UseAuthentication()
 * con el esquema JwtBearer configurado en AuthenticationExtensions.cs.
 * Extrae el token del header Authorization: Bearer <token>, lo valida
 * (issuer, audience, firma, expiración) y adjunta el payload en req.user.
 */
module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Token de autenticación no proporcionado'));
  }

  try {
    const payload = jwtTokenService.verifyToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      jti: payload.jti,
    };
    return next();
  } catch (err) {
    return next(new UnauthorizedError('Token inválido o expirado'));
  }
};
