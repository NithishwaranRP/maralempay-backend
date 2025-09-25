const Admin = require('../models/Admin');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Beneficiary = require('../models/Beneficiary');
const { generateAdminToken } = require('../utils/jwt');

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin and include password for comparison
    const admin = await Admin.findOne({ username }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: admin.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        admin: req.admin.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get dashboard analytics
const getDashboardAnalytics = async (req, res) => {
  try {
    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          subscribedUsers: { $sum: { $cond: ['$isSubscribed', 1, 0] } },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalReferrals: { $sum: '$totalReferrals' },
          totalReferralRewards: { $sum: '$referralRewards' }
        }
      }
    ]);

    // Get transaction statistics
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          totalSavings: { $sum: '$discount' },
          airtimeTransactions: { $sum: { $cond: [{ $eq: ['$type', 'airtime'] }, 1, 0] } },
          dataTransactions: { $sum: { $cond: [{ $eq: ['$type', 'data'] }, 1, 0] } },
          subscriptionTransactions: { $sum: { $cond: [{ $eq: ['$type', 'subscription'] }, 1, 0] } },
          successfulTransactions: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } },
          failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email phone')
      .populate('beneficiary', 'name phoneNumber network');

    // Get monthly revenue for the last 12 months
    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          status: 'successful',
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get top referrers
    const topReferrers = await User.find({ totalReferrals: { $gt: 0 } })
      .sort({ totalReferrals: -1 })
      .limit(10)
      .select('firstName lastName email totalReferrals referralRewards');

    res.json({
      success: true,
      data: {
        userStats: userStats[0] || {
          totalUsers: 0,
          subscribedUsers: 0,
          activeUsers: 0,
          totalReferrals: 0,
          totalReferralRewards: 0
        },
        transactionStats: transactionStats[0] || {
          totalTransactions: 0,
          totalRevenue: 0,
          totalSavings: 0,
          airtimeTransactions: 0,
          dataTransactions: 0,
          subscriptionTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0
        },
        recentTransactions: recentTransactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          user: t.user ? {
            name: `${t.user.firstName} ${t.user.lastName}`,
            email: t.user.email,
            phone: t.user.phone
          } : null,
          beneficiary: t.beneficiary ? {
            name: t.beneficiary.name,
            phoneNumber: t.beneficiary.phoneNumber,
            network: t.beneficiary.network
          } : null,
          createdAt: t.createdAt
        })),
        monthlyRevenue,
        topReferrers: topReferrers.map(user => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          totalReferrals: user.totalReferrals,
          referralRewards: user.referralRewards
        }))
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, subscriptionStatus } = req.query;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (subscriptionStatus === 'subscribed') {
      filter.isSubscribed = true;
    } else if (subscriptionStatus === 'unsubscribed') {
      filter.isSubscribed = false;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users: users.map(user => user.getPublicProfile()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNextPage: skip + users.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's transactions
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('beneficiary', 'name phoneNumber network');

    // Get user's beneficiaries
    const beneficiaries = await Beneficiary.find({ user: userId });

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile(),
        transactions: transactions.map(t => t.getSummary()),
        beneficiaries: beneficiaries.map(b => b.getPublicProfile())
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      status, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email phone')
      .populate('beneficiary', 'name phoneNumber network');

    // If search is provided, add user search
    if (search) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = users.map(user => user._id);
      filter.user = { $in: userIds };
      query = Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'firstName lastName email phone')
        .populate('beneficiary', 'name phoneNumber network');
    }

    const transactions = await query;

    // Get total count for pagination
    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          originalAmount: t.originalAmount,
          discount: t.discount,
          status: t.status,
          phoneNumber: t.phoneNumber,
          network: t.network,
          dataPlan: t.dataPlan,
          user: t.user ? {
            name: `${t.user.firstName} ${t.user.lastName}`,
            email: t.user.email,
            phone: t.user.phone
          } : null,
          beneficiary: t.beneficiary ? {
            name: t.beneficiary.name,
            phoneNumber: t.beneficiary.phoneNumber,
            network: t.beneficiary.network
          } : null,
          createdAt: t.createdAt,
          processedAt: t.processedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalTransactions: total,
          hasNextPage: skip + transactions.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  getDashboardAnalytics,
  getAllUsers,
  getUserDetails,
  getAllTransactions
};
