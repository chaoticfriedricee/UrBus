const { validationResult } = require('express-validator');

/**
 * Ejecuta las reglas de express-validator y, si fallan, responde 400
 * con el mismo formato unificado de error usado por handle-errors.js.
 * Equivalente a la validación automática de ModelState en los controllers de .NET
 * (los atributos [Required], [MaxLength], [EmailAddress], etc. de los DTOs).
 */
module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Invalid Arguments',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    traceId: req.id || '',
    timestamp: new Date().toISOString(),
  });
};
