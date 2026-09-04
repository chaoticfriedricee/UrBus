const { User, Role, UserRole, UserProfile } = require('../models');

async function countUsersInRoleAsync(roleName) {
  const count = await UserRole.count({
    distinct: true,
    col: 'user_id',
    include: [{ model: Role, as: 'role', where: { name: roleName }, attributes: [] }],
  });
  return count;
}

async function getByNameAsync(roleName) {
  return Role.findOne({ where: { name: roleName } });
}

async function getUserRoleNamesAsync(userId) {
  const userRoles = await UserRole.findAll({
    where: { userId },
    include: [{ model: Role, as: 'role' }],
  });
  return userRoles.map((ur) => ur.role.name);
}

async function getUsersByRoleAsync(roleName) {
  return User.findAll({
    include: [
      { model: UserProfile, as: 'userProfile' },
      {
        model: UserRole,
        as: 'userRoles',
        required: true,
        include: [{ model: Role, as: 'role', where: { name: roleName } }],
      },
    ],
  });
}

module.exports = {
  countUsersInRoleAsync,
  getByNameAsync,
  getUserRoleNamesAsync,
  getUsersByRoleAsync,
};
