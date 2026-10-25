const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');
const { generateUserId } = require('../utils/uuid-generator');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    defaultValue: () => generateUserId(),
  },
  name: {
    type: DataTypes.STRING(25),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El nombre es obligatorio' },
      len: { args: [1, 25], msg: 'El nombre no debe de tener más de 25 caracteres' },
    },
  },
  surname: {
    type: DataTypes.STRING(25),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El apellido es obligatorio' },
      len: { args: [1, 25], msg: 'El apellido no debe de tener más de 25 caracteres' },
    },
  },
  username: {
    type: DataTypes.STRING(25),
    allowNull: false,
    unique: true,
    validate: { notEmpty: { msg: 'El username es obligatorio' } },
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'El email es obligatorio' },
      isEmail: { msg: 'El formato del email no es válido' },
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: { msg: 'La contraseña es obligatorio' } },
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'users',
  indexes: [
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['email'] },
  ],
});

module.exports = User;
