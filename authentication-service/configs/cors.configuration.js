const cors = require('cors');
const env = require('./env.config');

/**
 * Política de CORS por defecto para toda la API.
 * Equivalente a "DefaultCorsPolicy" en AuthenticationExtensions/SecurityExtensions (.NET).
 */
const defaultCorsOptions = {
  origin(origin, callback) {
    // Permitir requests sin origin (curl, health checks, apps móviles, Postman)
    if (!origin) return callback(null, true);

    if (env.security.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} no está permitido por CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-TOKEN'],
  credentials: true,
  maxAge: 600, // 10 minutos, igual que SetPreflightMaxAge en .NET
};

/**
 * Política de CORS restrictiva para endpoints administrativos.
 * Equivalente a "AdminCorsPolicy" (.NET).
 */
const adminCorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (env.security.adminAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} no está permitido por la política admin de CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

module.exports = {
  defaultCors: cors(defaultCorsOptions),
  adminCors: cors(adminCorsOptions),
};
