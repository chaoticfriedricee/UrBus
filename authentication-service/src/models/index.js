const sequelize = require('./sequelize');
const User = require('./user.model');
const Role = require('./role.model');
const UserRole = require('./user-role.model');
const UserProfile = require('./user-profile.model');
const UserEmail = require('./user-email.model');
const UserPasswordReset = require('./user-password-reset.model');

// User 1:1 UserProfile
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'userProfile', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User 1:1 UserEmail
User.hasOne(UserEmail, { foreignKey: 'userId', as: 'userEmail', onDelete: 'CASCADE' });
UserEmail.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User 1:1 UserPasswordReset
User.hasOne(UserPasswordReset, { foreignKey: 'userId', as: 'userPasswordReset', onDelete: 'CASCADE' });
UserPasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User 1:N UserRole, Role 1:N UserRole
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles', onDelete: 'CASCADE' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  UserProfile,
  UserEmail,
  UserPasswordReset,
};
