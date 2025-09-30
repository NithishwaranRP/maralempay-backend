const express = require('express');
const router = express.Router();
const flutterwaveDirectController = require('../controllers/flutterwaveDirectController');

// Get data bundles for a specific biller (e.g., MTN data bundles)
// GET /api/flutterwave-direct/data-bundles/:biller_code
router.get('/data-bundles/:biller_code', flutterwaveDirectController.getDataBundles);

// Get airtime products for a specific biller (e.g., MTN airtime)
// GET /api/flutterwave-direct/airtime/:biller_code
router.get('/airtime/:biller_code', flutterwaveDirectController.getAirtimeProducts);

// Get all products (both data and airtime) for a specific biller
// GET /api/flutterwave-direct/products/:biller_code
router.get('/products/:biller_code', flutterwaveDirectController.getAllProducts);

// Get telecom providers list
// GET /api/flutterwave-direct/telecom-providers
router.get('/telecom-providers', flutterwaveDirectController.getTelecomProviders);

// Process bill payment
// POST /api/flutterwave-direct/pay
router.post('/pay', flutterwaveDirectController.processBillPayment);

module.exports = router;
