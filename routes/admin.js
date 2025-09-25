const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAdminProfile,
  getDashboardAnalytics,
  getAllUsers,
  getUserDetails,
  getAllTransactions
} = require('../controllers/adminController');
const { validateAdminLogin } = require('../middleware/validation');
const { authenticateAdmin, requirePermission } = require('../middleware/auth');

// Public admin routes
router.post('/login', validateAdminLogin, adminLogin);

// Protected admin routes
router.use(authenticateAdmin);

router.get('/profile', getAdminProfile);
router.get('/analytics', requirePermission('viewAnalytics'), getDashboardAnalytics);
router.get('/users', requirePermission('manageUsers'), getAllUsers);
router.get('/users/:userId', requirePermission('manageUsers'), getUserDetails);
router.get('/transactions', requirePermission('manageTransactions'), getAllTransactions);

module.exports = router;
