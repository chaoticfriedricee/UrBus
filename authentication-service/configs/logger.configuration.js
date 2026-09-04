const winston = require('winston');
require('winston-daily-rotate-file');
const env = require('./env.config');

/**
 * Logger de la aplicación. Equivalente a la configuración de Serilog en appsettings.json:
 *  - Console sink con timestamp
 *  - File sink con rotación diaria y retención de 30 días (logs/auth-service-*.txt)
 */
const fileTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/auth-service-%DATE%.txt',
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d',
  level: 'info',
});

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp} ${level.toUpperCase()}] ${stack || message}${metaString}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    fileTransport,
  ],
});

module.exports = logger;
