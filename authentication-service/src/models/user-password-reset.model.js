const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateUserId } = require('../utils/uuid-generator');

const UserPasswordReset = sequelize.define('UserPasswordReset', {
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
  passwordResetToken: {
    type: DataTypes.STRING(256),
    allowNull: true,
    field: 'password_reset_token',
  },
  passwordResetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_token_expiry',
  },
}, {
  tableName: 'user_password_resets',
  timestamps: false,
});

module.exports = UserPasswordReset;
