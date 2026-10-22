const { DataTypes } = require('sequelize');
const sequelize = require('../models/sequelize');
const { DEFAULT_PASSENGER_TYPE } = require('../utils/passenger-type-constants');
const logger = require('../../configs/logger.configuration');

/**
 * sequelize.sync() solo crea tablas que no existen; no agrega columnas nuevas a
 * tablas ya creadas. Estas migraciones son idempotentes y se ejecutan en cada
 * arranque, después de sync().
 */
async function migrateAsync() {
  const queryInterface = sequelize.getQueryInterface();
  const userColumns = await queryInterface.describeTable('users');

  // Los usuarios existentes quedan como pasajeros fijos (el valor por defecto).
  // Si la columna ya existe no se toca, para no sobrescribir asignaciones válidas.
  if (!userColumns.passenger_type) {
    await queryInterface.addColumn('users', 'passenger_type', {
      type: DataTypes.STRING(25),
      allowNull: false,
      defaultValue: DEFAULT_PASSENGER_TYPE,
    });
    logger.info('Migración: columna users.passenger_type agregada');
  }
}

module.exports = { migrateAsync };
