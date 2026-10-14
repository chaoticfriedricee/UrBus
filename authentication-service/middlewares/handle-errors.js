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

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: mapMulterMessage(err),
      errorCode: err.code || null,
      traceId: req.id || '',
      timestamp: new Date().toISOString(),
    });
  }

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

function mapMulterMessage(err) {
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return `Campo de archivo inesperado: '${err.field}'. El campo debe llamarse 'profilePicture'`;
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return 'El archivo supera el tamaño máximo permitido (10MB)';
  }
  return err.message || 'Error al procesar el archivo';
}

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