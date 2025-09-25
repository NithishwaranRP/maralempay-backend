const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Get referral statistics for the current user
 * GET /api/referrals/stats
 */
const getReferralStats = async (req, res) => {
  try {
    const user = req.user;

    // Get referral statistics
    const stats = {
      totalReferrals: user.totalReferrals || 0,
      referralRewards: user.referralRewards || 0,
      referralCode: user.referralCode,
      totalEarnings: user.referralRewards || 0
    };

    res.json({
      success: true,
      data: stats,
      message: 'Referral statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get recent referrals for the current user
 * GET /api/referrals/recent
 */
const getRecentReferrals = async (req, res) => {
  try {
    const user = req.user;
    const { limit = 10 } = req.query;

    // Find users referred by this user
    const referrals = await User.find({ referredBy: user._id })
      .select('firstName lastName email phone createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: referrals,
      message: 'Recent referrals retrieved successfully'
    });
  } catch (error) {
    console.error('Get recent referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent referrals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all referrals for the current user
 * GET /api/referrals
 */
const getAllReferrals = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find users referred by this user with pagination
    const referrals = await User.find({ referredBy: user._id })
      .select('firstName lastName email phone createdAt isSubscribed')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReferrals = await User.countDocuments({ referredBy: user._id });

    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalReferrals / parseInt(limit)),
          totalReferrals,
          hasNextPage: skip + referrals.length < totalReferrals,
          hasPrevPage: parseInt(page) > 1
        }
      },
      message: 'All referrals retrieved successfully'
    });
  } catch (error) {
    console.error('Get all referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getReferralStats,
  getRecentReferrals,
  getAllReferrals
};

