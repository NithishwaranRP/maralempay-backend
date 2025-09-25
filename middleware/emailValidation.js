const { body } = require('express-validator');

// Validation for sending registration verification code
const validateSendRegistrationCode = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
];

// Validation for sending password reset verification code
const validateSendPasswordResetCode = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase()
];

// Validation for verifying registration code
const validateVerifyRegistrationCode = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers')
];

// Validation for verifying password reset code
const validateVerifyPasswordResetCode = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers')
];

// Validation for resending verification code
const validateResendCode = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('type')
    .isIn(['registration', 'password_reset'])
    .withMessage('Type must be either "registration" or "password_reset"')
];

module.exports = {
  validateSendRegistrationCode,
  validateSendPasswordResetCode,
  validateVerifyRegistrationCode,
  validateVerifyPasswordResetCode,
  validateResendCode
};
