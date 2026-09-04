const { Sequelize } = require('sequelize');
const env = require('../../configs/env.config');
const logger = require('../../configs/logger.configuration');

/**
 * Instancia de Sequelize.
 * `underscored: true` aplica snake_case a tablas y columnas automáticamente,
 * igual que el método ToSnakeCase() del ApplicationDbContext original.
 */
const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  dialect: 'postgres',
  logging: env.database.logging ? (msg) => logger.debug(msg) : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = sequelize;
