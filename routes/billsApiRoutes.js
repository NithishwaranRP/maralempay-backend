const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const {
  getBillsBalance,
  getBillsProviders,
  validateCustomer,
  purchaseBill
} = require('../controllers/billsApiController');

// All bills API routes require authentication
router.use(authenticateUser);

// Get bills balance
router.get('/balance', getBillsBalance);

// Get bills providers
router.get('/providers', getBillsProviders);

// Validate customer
router.post('/validate', validateCustomer);

// Purchase bill
router.post('/purchase', purchaseBill);

module.exports = router;