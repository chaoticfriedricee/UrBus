const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateUserId } = require('../utils/uuid-generator');

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    defaultValue: () => generateUserId(),
  },
  userId: {
    type: DataTypes.STRING(16),
    allowNull: false,
    field: 'user_id',
  },
  roleId: {
    type: DataTypes.STRING(16),
    allowNull: false,
    field: 'role_id',
  },
}, {
  tableName: 'user_roles',
});

module.exports = UserRole;
