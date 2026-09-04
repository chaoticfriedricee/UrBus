/**
 * Envuelve un controlador async y reenvía cualquier excepción a next(),
 * donde handle-errors.js la transforma en la respuesta unificada de error.
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
