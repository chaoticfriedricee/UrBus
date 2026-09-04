const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateRoleId } = require('../utils/uuid-generator');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    defaultValue: () => generateRoleId(),
  },
  name: {
    type: DataTypes.STRING(25),
    allowNull: false,
    validate: { notEmpty: { msg: 'El nombre del rol es obligatorio.' } },
  },
}, {
  tableName: 'roles',
});

module.exports = Role;
