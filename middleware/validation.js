const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^(\+234|234|0)?[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('referralCode')
    .optional()
    .isLength({ min: 8, max: 8 })
    .withMessage('Referral code must be 8 characters long'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Airtime purchase validation
const validateAirtimePurchase = [
  body('phoneNumber')
    .matches(/^(\+234|234|0)?[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('amount')
    .isFloat({ min: 50, max: 10000 })
    .withMessage('Amount must be between ₦50 and ₦10,000'),
  
  body('network')
    .isIn(['MTN', 'AIRTEL', 'GLO', '9MOBILE'])
    .withMessage('Please select a valid network'),
  
  handleValidationErrors
];

// Data purchase validation
const validateDataPurchase = [
  body('phoneNumber')
    .matches(/^(\+234|234|0)?[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('network')
    .isIn(['MTN', 'AIRTEL', 'GLO', '9MOBILE'])
    .withMessage('Please select a valid network'),
  
  body('dataPlan')
    .notEmpty()
    .withMessage('Please select a data plan'),
  
  handleValidationErrors
];

// Beneficiary validation
const validateBeneficiary = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Beneficiary name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .matches(/^(\+234|234|0)?[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('network')
    .isIn(['MTN', 'AIRTEL', 'GLO', '9MOBILE'])
    .withMessage('Please select a valid network'),
  
  handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Admin registration validation
const validateAdminRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'moderator'])
    .withMessage('Invalid role specified'),
  
  handleValidationErrors
];

// Email verification validation
const validateEmailVerification = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('Verification code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Verification code must contain only numbers'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateAirtimePurchase,
  validateDataPurchase,
  validateBeneficiary,
  validateAdminLogin,
  validateAdminRegistration,
  validateEmailVerification,
  validatePasswordReset,
  handleValidationErrors
};
