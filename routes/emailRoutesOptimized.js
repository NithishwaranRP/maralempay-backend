const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const emailController = require('../controllers/emailControllerOptimized');
const { body } = require('express-validator');

// Validation middleware
const validateEmail = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const validateResendCode = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('type').isIn(['registration', 'password_reset']).withMessage('Type must be registration or password_reset'),
];

// Email verification (public) - optimized for Vercel
router.post('/verify', validateEmail, emailController.sendRegistrationCode);

// Password reset (public) - optimized for Vercel
router.post('/reset-password', validateEmail, emailController.sendPasswordResetCode);

// Test email service (public)
router.post('/test', emailController.testEmailService);

// Test Resend configuration (public)
router.post('/test-resend', emailController.testResendConfiguration);

// Resend verification code (public) - optimized for Vercel
router.post('/resend', validateResendCode, emailController.resendCode);

module.exports = router;
