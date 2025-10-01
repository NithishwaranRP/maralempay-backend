const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('❌ Auth: No Authorization header provided');
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, access denied' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token === 'Bearer') {
      console.log('❌ Auth: Invalid token format');
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, access denied' 
      });
    }

    console.log('🔍 Auth: Verifying token for route:', req.path);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('❌ Auth: User not found for token');
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }

    console.log('✅ Auth: User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};

// Middleware to check if user has minimum wallet balance for discounts
const requireMinimumBalance = async (req, res, next) => {
  try {
    const user = req.user; // This should be set by authenticateUser middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user has minimum wallet balance for discounts (N1,000)
    const minimumBalance = 1000;
    const hasMinimumBalance = user.walletBalance >= minimumBalance;
    
    console.log('🔍 Wallet Balance Check:', {
      user_id: user._id,
      email: user.email,
      wallet_balance: user.walletBalance,
      minimum_required: minimumBalance,
      qualifies_for_discount: hasMinimumBalance,
      route: req.path
    });
    
    if (!hasMinimumBalance) {
      return res.status(403).json({
        success: false,
        message: `Minimum wallet balance of ₦${minimumBalance} required for discounted services`,
        data: {
          current_balance: user.walletBalance,
          minimum_required: minimumBalance,
          shortfall: minimumBalance - user.walletBalance
        }
      });
    }

    next();
  } catch (error) {
    console.error('Wallet balance middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to check discount eligibility but allow purchases
const checkDiscountEligibility = async (req, res, next) => {
  try {
    const user = req.user; // This should be set by authenticateUser middleware

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user has minimum wallet balance for discounts (N1,000)
    const minimumBalance = 1000;
    const hasMinimumBalance = user.walletBalance >= minimumBalance;
    
    console.log('🔍 Discount Eligibility Check:', {
      user_id: user._id,
      email: user.email,
      wallet_balance: user.walletBalance,
      minimum_required: minimumBalance,
      qualifies_for_discount: hasMinimumBalance,
      route: req.path
    });
    
    // Add discount eligibility info to request object
    req.discountEligibility = {
      qualifiesForDiscount: hasMinimumBalance,
      currentBalance: user.walletBalance,
      minimumRequired: minimumBalance,
      shortfall: minimumBalance - user.walletBalance
    };

    next();
  } catch (error) {
    console.error('Discount eligibility middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to verify admin JWT token
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, access denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// Middleware to check admin permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const admin = req.admin; // This should be set by authenticateAdmin middleware

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not authenticated'
        });
      }

      // Check if admin has the required permission
      if (!admin.permissions || !admin.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = {
  authenticateUser,
  requireMinimumBalance,
  checkDiscountEligibility,
  authenticateAdmin,
  requirePermission
};