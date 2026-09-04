const helmet = require('helmet');

/**
 * Cabeceras de seguridad HTTP.
 * Equivalente al middleware UseSecurityHeaders (paquete NetEscapades.AspNetCore.SecurityHeaders) en .NET:
 *  - Content-Security-Policy
 *  - X-Frame-Options: DENY
 *  - X-Content-Type-Options: nosniff
 *  - Referrer-Policy: strict-origin-when-cross-origin
 *  - Elimina el header "Server"
 *  - Permissions-Policy y Cache-Control personalizados
 */
const securityHeaders = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
  }),
  // Cabeceras adicionales personalizadas (equivalentes a AddCustomHeader en .NET)
  (req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  },
];

module.exports = securityHeaders;
