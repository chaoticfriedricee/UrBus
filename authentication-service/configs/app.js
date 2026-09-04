const express = require('express');
const morgan = require('morgan');
const securityHeaders = require('./helmet.configuration');
const { defaultCors } = require('./cors.configuration');
const { apiLimiter } = require('./rateLimit.configuration');
const routes = require('../src/routes');
const handleErrors = require('../middlewares/handle-errors');
const logger = require('./logger.configuration');

/**
 * Ensambla y configura la aplicación Express.
 * Equivalente al pipeline de middlewares configurado en Program.cs (.NET):
 *   Serilog request logging -> Security Headers -> HTTPS redirect -> CORS ->
 *   Rate Limiter -> Authentication -> Authorization -> Controllers -> Health checks
 */
function createApp() {
  const app = express();

  // Confía en el primer proxy (necesario para IP real detrás de un load balancer / rate limiting)
  app.set('trust proxy', 1);

  // Logging de requests (equivalente a app.UseSerilogRequestLogging())
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );

  // Cabeceras de seguridad (equivalente a app.UseSecurityHeaders(...))
  app.use(securityHeaders);

  // CORS (equivalente a app.UseCors("DefaultCorsPolicy"))
  app.use(defaultCors);

  // Parseo de body JSON y urlencoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting general (equivalente a app.UseRateLimiter() + política "ApiPolicy")
  app.use(apiLimiter);

  // Respuestas en camelCase por defecto: Express + JSON.stringify ya usa las
  // propiedades tal cual se definen en los DTOs, replicando
  // JsonNamingPolicy.CamelCase configurado en Program.cs (.NET).

  // Rutas de la API bajo /api/v1 (equivalente a [Route("api/v1/[controller]")])
  app.use('/api/v1', routes);

  // Endpoints de salud "planos", para compatibilidad con clientes existentes
  // (equivalente a los MapHealthChecks("/health") adicionales en Program.cs)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'Saludable',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 para rutas no encontradas
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    });
  });

  // Manejo global de excepciones (equivalente a app.UseMiddleware<GlobalExceptionMiddleware>())
  // Debe ser el ÚLTIMO middleware registrado.
  app.use(handleErrors);

  return app;
}

module.exports = createApp;
