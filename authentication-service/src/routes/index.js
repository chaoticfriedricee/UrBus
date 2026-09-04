const express = require('express');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const healthRoutes = require('./health.routes');

const router = express.Router();

// Prefijo /api/v1, igual que [Route("api/v1/[controller]")] en los controllers .NET
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/health', healthRoutes);

module.exports = router;
