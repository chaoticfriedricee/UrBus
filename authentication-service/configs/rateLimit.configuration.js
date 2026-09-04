const rateLimit = require('express-rate-limit');
const env = require('./env.config');

/**
 * Rate limiting para endpoints de autenticación (login, register, verify-email, etc).
 * Equivalente a la política "AuthPolicy" (FixedWindowRateLimiter) en .NET: 5 intentos/minuto.
 */
const authLimiter = rateLimit({
  windowMs: env.rateLimit.auth.windowMinutes * 60 * 1000,
  max: env.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too Many Requests. Please try again later.',
  },
  handler: (req, res) => {
    res.status(429).send('Too Many Requests. Please try again later.');
  },
});

/**
 * Rate limiting general para el resto de la API.
 * Equivalente a la política "ApiPolicy" (TokenBucketRateLimiter) en .NET: 100 tokens, reposición de 20/min.
 */
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.api.windowMinutes * 60 * 1000,
  max: env.rateLimit.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too Many Requests. Please try again later.',
  },
});

module.exports = { authLimiter, apiLimiter };
