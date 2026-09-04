const logger = require('../configs/logger.configuration');

/**
 * Manejador global de errores. Equivalente a GlobalExceptionMiddleware.cs.
 * Debe registrarse como el ÚLTIMO middleware (después de las rutas).
 * Traduce cada tipo de error a un código HTTP + una respuesta unificada:
 *   { success, message, errorCode, traceId, timestamp }
 */
// eslint-disable-next-line no-unused-vars
module.exports = function handleErrors(err, req, res, next) {
  logger.error(err.stack || err.message || 'An unhandled exception occurred');

  const statusCode = err.statusCode || mapErrorNameToStatus(err) || 500;

  const response = {
    success: false,
    message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
    errorCode: err.errorCode || null,
    traceId: req.id || '',
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Réplica de MapInvalidOperation (.NET): infiere el código HTTP a partir
 * del mensaje cuando el error no trae un statusCode explícito.
 */
function mapErrorNameToStatus(err) {
  const message = (err.message || '').toLowerCase();

  if (err.name === 'SequelizeUniqueConstraintError') return 409;
  if (err.name === 'SequelizeValidationError') return 400;

  if (message.includes('not found')) return 404;
  if (message.includes('last administrator') || message.includes('conflict')) return 409;

  return null;
}