const { ForbiddenError } = require('../src/utils/errors');

/**
 * Middleware de autorización por rol. Equivalente a [Authorize(Roles = "ADMIN_ROLE")]
 * en los controllers de .NET. Debe usarse siempre después de `authenticate`.
 *
 * Uso: router.get('/admin-only', authenticate, authorize('ADMIN_ROLE'), handler)
 */
module.exports = function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('No autenticado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permisos para realizar esta acción'));
    }

    return next();
  };
};
