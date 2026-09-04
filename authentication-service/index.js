const env = require('./configs/env.config');
const logger = require('./configs/logger.configuration');
const createApp = require('./configs/app');
const sequelize = require('./src/models/sequelize');
require('./src/models'); // Registra las asociaciones antes de sincronizar
const { seedAsync } = require('./src/database/seed');

async function bootstrap() {
  try {
    logger.info('Verificando conexión a la base de datos...');
    await sequelize.authenticate();

    // Garantiza que las tablas existan (equivalente a context.Database.EnsureCreatedAsync())
    await sequelize.sync();

    logger.info('Base de datos lista. Ejecutando datos semilla...');
    await seedAsync();

    logger.info('Inicialización de base de datos completada exitosamente');
  } catch (err) {
    logger.error(`Ocurrió un error al inicializar la base de datos: ${err.message}`);
    throw err; // Detener el arranque, igual que el "throw;" en Program.cs
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    const url = `http://localhost:${env.port}`;
    logger.info(`API de AuthService está ejecutándose en ${url}. Endpoint de salud: ${url}/health`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} recibido. Cerrando servidor...`);
    server.close(async () => {
      await sequelize.close();
      logger.info('Servidor cerrado correctamente');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error(`Fallo crítico al iniciar la aplicación: ${err.message}`);
  process.exit(1);
});
