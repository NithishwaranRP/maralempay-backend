const express = require('express');
const router = express.Router();

// Debug routes for development
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.get('/env', (req, res) => {
  // Only show non-sensitive environment variables
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI ? '***configured***' : 'not set',
    JWT_SECRET: process.env.JWT_SECRET ? '***configured***' : 'not set'
  };
  res.json(safeEnv);
});

module.exports = router;