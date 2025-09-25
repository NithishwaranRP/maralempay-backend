const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const emailController = require('../controllers/emailController');

// Email verification (public)
router.post('/verify', emailController.sendRegistrationCode);

// Password reset (public)
router.post('/reset-password', emailController.sendPasswordResetCode);

// Test email service (public)
router.post('/test', emailController.testEmailService);

// Resend verification code (public)
router.post('/resend', emailController.resendCode);

module.exports = router;