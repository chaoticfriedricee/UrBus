const { Op } = require('sequelize');
const sequelize = require('../models/sequelize');
const { User, UserProfile, UserEmail, UserPasswordReset, UserRole, Role } = require('../models');
const { generateUserId } = require('../utils/uuid-generator');
const { NotFoundError } = require('../utils/errors');

const FULL_INCLUDE = [
  { model: UserProfile, as: 'userProfile' },
  { model: UserEmail, as: 'userEmail' },
  { model: UserPasswordReset, as: 'userPasswordReset' },
  {
    model: UserRole,
    as: 'userRoles',
    include: [{ model: Role, as: 'role' }],
  },
];

async function getAllAsync() {
  return User.findAll({
    include: FULL_INCLUDE,
    order: [[sequelize.literal('"User"."created_at"'), 'DESC']],
  });
}

async function getByIdAsync(id) {
  const user = await User.findByPk(id, { include: FULL_INCLUDE });
  if (!user) {
    throw new NotFoundError(`User with id ${id} not found.`);
  }
  return user;
}

async function getByEmailAsync(email) {
  return User.findOne({
    where: { email: { [Op.iLike]: email } },
    include: FULL_INCLUDE,
  });
}

async function getByUserAsync(username) {
  return User.findOne({
    where: { username: { [Op.iLike]: username } },
    include: FULL_INCLUDE,
  });
}

async function getByEmailVerificationTokenAsync(token) {
  return User.findOne({
    include: [
      ...FULL_INCLUDE.filter((i) => i.as !== 'userEmail'),
      {
        model: UserEmail,
        as: 'userEmail',
        required: true,
        where: {
          emailVerificationToken: token,
          emailVerificationTokenExpiry: { [Op.gt]: new Date() },
        },
      },
    ],
  });
}

async function getByPasswordResetTokenAsync(token) {
  return User.findOne({
    include: [
      ...FULL_INCLUDE.filter((i) => i.as !== 'userPasswordReset'),
      {
        model: UserPasswordReset,
        as: 'userPasswordReset',
        required: true,
        where: {
          passwordResetToken: token,
          passwordResetTokenExpiry: { [Op.gt]: new Date() },
        },
      },
    ],
  });
}

/**
 * Crea un usuario junto con sus entidades relacionadas (perfil, email, rol, password reset)
 * dentro de una única transacción. Equivalente a CreateUserAsync + el grafo de entidades
 * anidado que EF Core insertaba automáticamente en el .NET original.
 */
async function createUserAsync(userData) {
  const sequelize = User.sequelize;
  return sequelize.transaction(async (t) => {
    const user = await User.create(
      {
        id: userData.id,
        name: userData.name,
        surname: userData.surname,
        username: userData.username,
        email: userData.email,
        password: userData.password,
        status: userData.status,
      },
      { transaction: t },
    );

    await UserProfile.create(
      { ...userData.userProfile, userId: user.id },
      { transaction: t },
    );

    await UserEmail.create(
      { ...userData.userEmail, userId: user.id },
      { transaction: t },
    );

    await UserPasswordReset.create(
      { ...userData.userPasswordReset, userId: user.id },
      { transaction: t },
    );

    await UserRole.create(
      {
        id: generateUserId(),
        userId: user.id,
        roleId: userData.roleId,
      },
      { transaction: t },
    );

    return user.id;
  }).then((userId) => getByIdAsync(userId));
}

/**
 * Persiste los cambios realizados sobre una instancia de User ya cargada
 * (y opcionalmente sus asociaciones userProfile/userEmail/userPasswordReset).
 * Equivalente a UpdateUserAsync, donde EF Core ya tenía la entidad trackeada.
 */
async function updateUserAsync(user) {
  await user.save();
  if (user.userProfile) await user.userProfile.save();
  if (user.userEmail) await user.userEmail.save();
  if (user.userPasswordReset) await user.userPasswordReset.save();
  return getByIdAsync(user.id);
}

async function deleteUserAsync(id) {
  const user = await getByIdAsync(id);
  await user.destroy();
  return true;
}

async function existsByEmailAsync(email) {
  const count = await User.count({ where: { email: { [Op.iLike]: email } } });
  return count > 0;
}

async function existsByUsernameAsync(username) {
  const count = await User.count({ where: { username: { [Op.iLike]: username } } });
  return count > 0;
}

async function updateUserRoleAsync(userId, roleId) {
  const sequelize = User.sequelize;
  await sequelize.transaction(async (t) => {
    await UserRole.destroy({ where: { userId }, transaction: t });
    await UserRole.create(
      { id: generateUserId(), userId, roleId },
      { transaction: t },
    );
  });
}

module.exports = {
  getAllAsync,
  getByIdAsync,
  getByEmailAsync,
  getByUserAsync,
  getByEmailVerificationTokenAsync,
  getByPasswordResetTokenAsync,
  createUserAsync,
  updateUserAsync,
  deleteUserAsync,
  existsByEmailAsync,
  existsByUsernameAsync,
  updateUserRoleAsync,
};