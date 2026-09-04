const { Role, User, UserProfile, UserEmail, UserRole } = require('../models');
const passwordHashService = require('../services/password-hash.service');
const RoleConstants = require('../utils/role-constants');
const { generateUserId } = require('../utils/uuid-generator');
const logger = require('../../configs/logger.configuration');

/**
 * Siembra roles base y un usuario administrador si la base de datos está vacía.
 * Equivalente a Persistence/Data/DataSeeder.cs.
 */
async function seedAsync() {
  const roleCount = await Role.count();
  if (roleCount === 0) {
    await Role.bulkCreate([
      { name: RoleConstants.ADMIN_ROLE },
      { name: RoleConstants.DRIVER_ROLE },
      { name: RoleConstants.PASSENGER_ROLE },
      { name: RoleConstants.USER_ROLE },
    ]);
    logger.info('Roles semilla creados');
  }

  const userCount = await User.count();
  if (userCount === 0) {
    const adminRole = await Role.findOne({ where: { name: RoleConstants.ADMIN_ROLE } });
    if (adminRole) {
      const userId = generateUserId();

      const adminUser = await User.create({
        id: userId,
        name: 'Admin User',
        surname: 'Admin Surname',
        username: 'admin',
        email: 'admin@local.com',
        password: await passwordHashService.hashPassword('UrBus!'),
        status: true,
      });

      await UserProfile.create({
        userId,
        profilePicture: '',
        phone: '00000000',
      });

      await UserEmail.create({
        userId,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      });

      await UserRole.create({
        userId,
        roleId: adminRole.id,
      });

      logger.info(`Usuario administrador semilla creado: ${adminUser.username}`);
    }
  }
}

module.exports = { seedAsync };

// Permite ejecutar `npm run db:seed` de forma independiente
if (require.main === module) {
  const sequelize = require('../models/sequelize');
  sequelize
    .authenticate()
    .then(() => seedAsync())
    .then(() => {
      logger.info('Seed completado');
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`Error al ejecutar el seed: ${err.message}`);
      process.exit(1);
    });
}
