const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

// Public routes (no authentication required for testing)
// 1. Endpoint to get the specific products (e.g., 100MB, N500 Airtime) for a biller
router.get('/products/:biller_id', billController.getBillerProducts);

// 2. Endpoint to get biller details
router.get('/billers/:biller_id', billController.getBillerDetails);

// 3. Endpoint to get all billers for a category
router.get('/billers/category/:category', billController.getBillersByCategory);

// Protected routes (authentication required for payment processing)
// 4. Endpoint to process the actual bill payment
router.post('/pay', billController.processBillPayment);

module.exports = router;
