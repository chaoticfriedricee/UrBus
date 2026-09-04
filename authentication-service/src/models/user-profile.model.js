const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateUserId } = require('../utils/uuid-generator');

const UserProfile = sequelize.define('UserProfile', {
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
  profilePicture: {
    type: DataTypes.STRING(250),
    allowNull: true,
    defaultValue: '',
    field: 'profile_picture',
  },
  phone: {
    type: DataTypes.STRING(8),
    allowNull: false,
    validate: {
      len: { args: [8, 8], msg: 'El número de teléfono debe de tener exactamente 8 caracteres.' },
      is: { args: /^\d{8}$/, msg: 'El número de teléfono debe de contener solo números.' },
    },
  },
}, {
  tableName: 'user_profiles',
  timestamps: false,
});

module.exports = UserProfile;
