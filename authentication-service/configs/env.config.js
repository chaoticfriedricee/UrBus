require('dotenv').config();

/**
 * Configuración centralizada de la aplicación.
 * Equivalente a appsettings.json + IConfiguration en el proyecto .NET original.
 * Todos los valores sensibles se leen desde variables de entorno (.env) y
 * NUNCA deben quedar hardcodeados aquí.
 */
const toBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const toArray = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map((v) => v.trim()).filter(Boolean);
};

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5166,

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5435,
    name: process.env.DB_NAME || 'urbus_users',
    user: process.env.DB_USER || 'UrBus',
    password: process.env.DB_PASSWORD || '',
    logging: toBool(process.env.DB_LOGGING, false),
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    issuer: process.env.JWT_ISSUER || 'UrBus',
    audience: process.env.JWT_AUDIENCE || 'UrBus',
    expirationMinutes: parseInt(process.env.JWT_EXPIRATION_MINUTES, 10) || 60,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    baseUrl: process.env.CLOUDINARY_BASE_URL || 'https://res.cloudinary.com/',
    folder: process.env.CLOUDINARY_FOLDER || 'auth_ks_in6av/profiles',
    defaultAvatarPath: process.env.CLOUDINARY_DEFAULT_AVATAR || 'avatarDefault-1749508519496.png',
  },

  brevo: {
    enabled: toBool(process.env.BREVO_ENABLED, false),
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL,
    fromName: process.env.BREVO_FROM_NAME || process.env.SMTP_FROM_NAME || 'UrBus Support',
  },

  smtp: {
    enabled: toBool(process.env.SMTP_ENABLED, true),
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    useImplicitSsl: toBool(process.env.SMTP_USE_IMPLICIT_SSL, false),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    fromName: process.env.SMTP_FROM_NAME || 'UrBus Support',
    timeoutMs: parseInt(process.env.SMTP_TIMEOUT_MS, 10) || 30000,
    useFallback: toBool(process.env.SMTP_USE_FALLBACK, false),
    ignoreCertificateErrors: toBool(process.env.SMTP_IGNORE_CERTIFICATE_ERRORS, false),
  },

  security: {
    allowedOrigins: toArray(process.env.ALLOWED_ORIGINS, [
      'http://localhost:3000',
      'http://localhost:3001',
    ]),
    adminAllowedOrigins: toArray(process.env.ADMIN_ALLOWED_ORIGINS, ['http://localhost:3000']),
  },

  rateLimit: {
    auth: {
      windowMinutes: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES, 10) || 1,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
    },
    api: {
      windowMinutes: parseInt(process.env.API_RATE_LIMIT_WINDOW_MINUTES, 10) || 1,
      max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 100,
    },
  },
};

if (!config.jwt.secret) {
  throw new Error('JWT_SECRET no está configurado. Define esta variable en tu archivo .env');
}

module.exports = config;