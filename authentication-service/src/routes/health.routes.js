const express = require('express');

const router = express.Router();

/**
 * Equivalente a HealthController.cs + los MapGet("/health") / MapHealthChecks
 * definidos directamente en Program.cs.
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    service: 'UrBus AuthService',
  });
});

module.exports = router;
