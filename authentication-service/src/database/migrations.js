const sequelize = require('../models/sequelize');
const logger = require('../../configs/logger.configuration');

/**
 * sequelize.sync() solo crea tablas que no existen; no agrega columnas nuevas a
 * tablas ya creadas. Estas migraciones son idempotentes y se ejecutan en cada
 * arranque, después de sync().
 */
async function migrateAsync() {
  const queryInterface = sequelize.getQueryInterface();
  const userColumns = await queryInterface.describeTable('users');

  // El tipo de pasajero (fijo/eventual) se eliminó; se quita la columna de las bases que la tengan.
  if (userColumns.passenger_type) {
    await queryInterface.removeColumn('users', 'passenger_type');
    logger.info('Migración: columna users.passenger_type eliminada');
  }
}

module.exports = { migrateAsync };
