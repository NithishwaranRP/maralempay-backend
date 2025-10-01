const UserTransaction = require('../models/UserTransaction');
const User = require('../models/User');
const { FlutterwaveService, DATA_PLANS } = require('../utils/flutterwave');

const flutterwaveService = new FlutterwaveService();

// Calculate discount
const calculateDiscount = (amount, type) => {
  const discountPercentage = type === 'airtime' 
    ? parseFloat(process.env.AIRTIME_DISCOUNT_PERCENTAGE) || 10
    : parseFloat(process.env.DATA_DISCOUNT_PERCENTAGE) || 10;
  
  const discount = (amount * discountPercentage) / 100;
  const discountedAmount = amount - discount;
  
  return {
    originalAmount: amount,
    discount,
    discountPercentage,
    finalAmount: discountedAmount
  };
};

// Buy airtime
const buyAirtime = async (req, res) => {
  try {
    const { phoneNumber, amount, network } = req.body;
    const user = req.user;
    const discountInfo = req.discountEligibility;

    // Calculate pricing based on discount eligibility
    let pricing;
    if (discountInfo.qualifiesForDiscount) {
      pricing = calculateDiscount(amount, 'airtime');
    } else {
      // No discount - user pays full price
      pricing = {
        originalAmount: amount,
        discount: 0,
        discountPercentage: 0,
        finalAmount: amount
      };
    }

    // Create transaction record
    const transaction = new UserTransaction({
      user: user._id,
      type: 'airtime',
      amount: pricing.finalAmount,
      originalAmount: pricing.originalAmount,
      discount: pricing.discount,
      discountPercentage: pricing.discountPercentage,
      phoneNumber,
      network,
      status: 'pending'
    });

    await transaction.save();

    // Process airtime purchase with Flutterwave
    const purchaseResult = await flutterwaveService.buyAirtime(
      phoneNumber,
      pricing.finalAmount,
      network
    );

    if (!purchaseResult.success) {
      // Update transaction status to failed
      await UserTransaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        errorMessage: purchaseResult.message
      });

      return res.status(400).json({
        success: false,
        message: purchaseResult.message
      });
    }

    // Update transaction with Flutterwave details
    await UserTransaction.findByIdAndUpdate(transaction._id, {
      status: 'successful',
      flutterwaveUserTransactionId: purchaseResult.data.id,
      flutterwaveReference: purchaseResult.data.reference,
      processedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Airtime purchased successfully',
      data: {
        transaction: transaction.getSummary(),
        savings: pricing.discount,
        flutterwaveReference: purchaseResult.data.reference
      }
    });
  } catch (error) {
    console.error('Buy airtime error:', error);
    res.status(500).json({
      success: false,
      message: 'Airtime purchase failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Buy data
const buyData = async (req, res) => {
  try {
    const { phoneNumber, network, dataPlan } = req.body;
    const user = req.user;
    const discountInfo = req.discountEligibility;

    // Find the data plan details
    const planDetails = DATA_PLANS[network]?.find(plan => plan.name === dataPlan);
    
    if (!planDetails) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data plan selected'
      });
    }

    // Calculate pricing based on discount eligibility
    let pricing;
    if (discountInfo.qualifiesForDiscount) {
      pricing = calculateDiscount(planDetails.amount, 'data');
    } else {
      // No discount - user pays full price
      pricing = {
        originalAmount: planDetails.amount,
        discount: 0,
        discountPercentage: 0,
        finalAmount: planDetails.amount
      };
    }

    // Create transaction record
    const transaction = new UserTransaction({
      user: user._id,
      type: 'data',
      amount: pricing.finalAmount,
      originalAmount: pricing.originalAmount,
      discount: pricing.discount,
      discountPercentage: pricing.discountPercentage,
      phoneNumber,
      network,
      dataPlan,
      status: 'pending'
    });

    await transaction.save();

    // Process data purchase with Flutterwave
    const purchaseResult = await flutterwaveService.buyData(
      phoneNumber,
      planDetails,
      network
    );

    if (!purchaseResult.success) {
      // Update transaction status to failed
      await UserTransaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        errorMessage: purchaseResult.message
      });

      return res.status(400).json({
        success: false,
        message: purchaseResult.message
      });
    }

    // Update transaction with Flutterwave details
    await UserTransaction.findByIdAndUpdate(transaction._id, {
      status: 'successful',
      flutterwaveUserTransactionId: purchaseResult.data.id,
      flutterwaveReference: purchaseResult.data.reference,
      processedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Data purchased successfully',
      data: {
        transaction: transaction.getSummary(),
        savings: pricing.discount,
        flutterwaveReference: purchaseResult.data.reference
      }
    });
  } catch (error) {
    console.error('Buy data error:', error);
    res.status(500).json({
      success: false,
      message: 'Data purchase failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get transaction history
const getUserTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;
    const userId = req.user._id;

    // Build filter object
    const filter = { user: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions with pagination
    const transactions = await UserTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('beneficiary', 'name phoneNumber network');

    // Get total count for pagination
    const total = await UserTransaction.countDocuments(filter);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => t.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUserTransactions: total,
          hasNextPage: skip + transactions.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get data plans
const getDataPlans = async (req, res) => {
  try {
    const { network } = req.query;

    if (network && DATA_PLANS[network]) {
      res.json({
        success: true,
        data: {
          network,
          plans: DATA_PLANS[network]
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          plans: DATA_PLANS
        }
      });
    }
  } catch (error) {
    console.error('Get data plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data plans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get transaction statistics
const getUserTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get transaction statistics
    const stats = await UserTransaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalUserTransactions: { $sum: 1 },
          totalSpent: { $sum: '$amount' },
          totalSavings: { $sum: '$discount' },
          airtimeUserTransactions: {
            $sum: { $cond: [{ $eq: ['$type', 'airtime'] }, 1, 0] }
          },
          dataUserTransactions: {
            $sum: { $cond: [{ $eq: ['$type', 'data'] }, 1, 0] }
          },
          successfulUserTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalUserTransactions: 0,
      totalSpent: 0,
      totalSavings: 0,
      airtimeUserTransactions: 0,
      dataUserTransactions: 0,
      successfulUserTransactions: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  buyAirtime,
  buyData,
  getUserTransactionHistory,
  getDataPlans,
  getUserTransactionStats
};
