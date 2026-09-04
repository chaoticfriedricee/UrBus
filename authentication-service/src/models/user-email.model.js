const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateUserId } = require('../utils/uuid-generator');

const UserEmail = sequelize.define('UserEmail', {
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
  emailVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'email_verified',
  },
  emailVerificationToken: {
    type: DataTypes.STRING(256),
    allowNull: true,
    field: 'email_verification_token',
  },
  emailVerificationTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'email_verification_token_expiry',
  },
}, {
  tableName: 'user_emails',
  timestamps: false,
});

module.exports = UserEmail;
