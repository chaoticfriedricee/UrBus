/**
 * Errores de dominio/aplicación.
 * Equivalentes a BusinessException + los tipos de excepción nativos de .NET
 * (UnauthorizedAccessException, ArgumentException, InvalidOperationException)
 * que GlobalExceptionMiddleware mapeaba a códigos HTTP.
 */

class BusinessException extends Error {
  constructor(errorCode, message) {
    super(message);
    this.name = 'BusinessException';
    this.errorCode = errorCode;
    this.statusCode = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Credenciales inválidas o permisos insuficientes') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'No tienes permisos para realizar esta acción') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class ArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArgumentError';
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Recurso no encontrado') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

module.exports = {
  BusinessException,
  UnauthorizedError,
  ForbiddenError,
  ArgumentError,
  NotFoundError,
  ConflictError,
};
