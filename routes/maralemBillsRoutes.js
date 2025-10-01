const express = require('express');
const router = express.Router();
const { authenticateUser, checkDiscountEligibility } = require('../middleware/auth');
const { 
  initiateMaralemPurchase, 
  calculateDiscountedAmount, 
  calculateSubsidyAmount,
  verifyMaralemPayment,
  getBillCategories,
  getBillers,
  DISCOUNT_RATE 
} = require('../services/maralemBillsService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// All routes require authentication
router.use(authenticateUser);

/**
 * Get bill categories (public route - no authentication required)
 * GET /api/maralem-bills/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await getBillCategories();
    
    if (result.status === 'success') {
      res.json({
        success: true,
        message: 'Bill categories fetched successfully',
        data: result.categories
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Get bill categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get billers for a specific category
 * GET /api/maralem-bills/billers/:category
 */
router.get('/billers/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await getBillers(category);
    
    if (result.status === 'success') {
      res.json({
        success: true,
        message: 'Billers fetched successfully',
        data: result.billers
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Get billers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Calculate discount for a given amount
 * POST /api/maralem-bills/calculate-discount
 * Body: { amount: number }
 */
router.post('/calculate-discount', checkDiscountEligibility, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;
    const discountInfo = req.discountEligibility;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (discountInfo.qualifiesForDiscount) {
      // User qualifies for discount
      const discountedAmount = calculateDiscountedAmount(amount);
      const subsidyAmount = calculateSubsidyAmount(amount);
      
      res.json({
        success: true,
        message: 'Discount calculated successfully',
        data: {
          original_amount: amount,
          discounted_amount: discountedAmount,
          discount_amount: subsidyAmount,
          discount_percentage: DISCOUNT_RATE * 100,
          qualifies_for_discount: true,
          current_balance: user.walletBalance,
          minimum_required: discountInfo.minimumRequired,
          savings: subsidyAmount
        }
      });
    } else {
      // User doesn't qualify for discount, but can still purchase at full price
      res.json({
        success: true,
        message: 'Full price calculation - no discount available',
        data: {
          original_amount: amount,
          discounted_amount: amount,
          discount_amount: 0,
          discount_percentage: 0,
          qualifies_for_discount: false,
          current_balance: user.walletBalance,
          minimum_required: discountInfo.minimumRequired,
          shortfall: discountInfo.shortfall,
          can_purchase_full_price: true
        }
      });
    }
  } catch (error) {
    console.error('Calculate discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate discount',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Purchase airtime or data with MaralemPay discount
 * POST /api/maralem-bills/purchase
 * Body: { 
 *   type: 'AIRTIME' | 'DATA',
 *   customer: string (phone number),
 *   amount: number,
 *   biller_name: string (MTN, Airtel, etc.),
 *   biller_code: string (BIL108, etc.),
 *   tx_ref: string (optional, will be generated if not provided)
 * }
 */
router.post('/purchase', checkDiscountEligibility, async (req, res) => {
  try {
    const { 
      type, 
      customer, 
      amount, 
      biller_name, 
      biller_code, 
      tx_ref 
    } = req.body;
    
    const user = req.user;
    const discountInfo = req.discountEligibility;
    
    console.log('🔍 MaralemPay Purchase Request:', {
      type,
      customer,
      amount,
      biller_name,
      biller_code,
      user_email: user.email,
      qualifies_for_discount: discountInfo.qualifiesForDiscount
    });
    
    // 1. Validate required fields
    if (!type || !customer || !amount || !biller_name || !biller_code) {
      return res.status(400).json({
        success: false,
        message: 'type, customer, amount, biller_name, and biller_code are required'
      });
    }
    
    // 2. Validate type
    if (!['AIRTIME', 'DATA'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'type must be either AIRTIME or DATA'
      });
    }
    
    // 3. Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be greater than 0'
      });
    }
    
    // 4. Generate transaction reference if not provided
    const finalTxRef = tx_ref || `MARALEM_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 5. Prepare bill details
    const billDetails = {
      type: type.toUpperCase(),
      customer: customer,
      amount: amount,
      biller_name: biller_name,
      biller_code: biller_code,
      tx_ref: finalTxRef
    };
    
    // 6. Calculate amounts based on discount eligibility
    let userAmount, discountAmount, subsidyAmount;
    
    if (discountInfo.qualifiesForDiscount) {
      // User qualifies for discount
      userAmount = calculateDiscountedAmount(amount);
      subsidyAmount = calculateSubsidyAmount(amount);
      discountAmount = subsidyAmount;
      
      console.log('💰 MaralemPay Discount Calculation:', {
        original_amount: amount,
        user_pays: userAmount,
        subsidy_amount: subsidyAmount,
        discount_percentage: DISCOUNT_RATE * 100
      });
    } else {
      // User pays full price (no discount)
      userAmount = amount;
      subsidyAmount = 0;
      discountAmount = 0;
      
      console.log('💰 MaralemPay Full Price Purchase:', {
        original_amount: amount,
        user_pays: userAmount,
        discount_amount: 0,
        discount_percentage: 0
      });
    }
    
    // 7. Create transaction record (pending status)
    const transaction = new Transaction({
      user: user._id,
      type: 'maralem_purchase',
      amount: userAmount, // Amount user pays
      originalAmount: amount,   // Full amount for service delivery
      discountAmount: discountAmount,
      status: 'pending',
      txRef: finalTxRef,
      billerCode: biller_code,
      phoneNumber: customer,
      planName: `${biller_name} ${type} - ₦${amount}`,
      metadata: {
        biller_code: biller_code,
        biller_name: biller_name,
        service_type: type.toUpperCase(),
        original_amount: amount,
        discount_amount: discountAmount,
        user_paid_amount: userAmount,
        discount_percentage: discountInfo.qualifiesForDiscount ? DISCOUNT_RATE * 100 : 0,
        qualifies_for_discount: discountInfo.qualifiesForDiscount,
        current_balance: user.walletBalance,
        minimum_required: discountInfo.minimumRequired
      }
    });
    
    await transaction.save();
    
    // 9. Initiate MaralemPay purchase
    const result = await initiateMaralemPurchase(billDetails, user);
    
    if (result.status === 'success') {
      // Update transaction with success details
      transaction.status = 'completed';
      transaction.flwRef = result.flw_reference;
      transaction.flwTransactionId = result.flw_transaction_id;
      transaction.billDetails = result.transaction_details;
      transaction.completedAt = new Date();
      await transaction.save();
      
      console.log('🎉 MaralemPay Purchase Successful:', {
        tx_ref: finalTxRef,
        user_paid: userAmount,
        service_delivered: amount,
        discount: discountAmount,
        qualifies_for_discount: discountInfo.qualifiesForDiscount
      });
      
      res.json({
        success: true,
        message: result.message,
        data: {
          transaction_id: transaction._id,
          tx_ref: finalTxRef,
          status: 'completed',
          original_amount: amount,
          user_paid_amount: userAmount,
          discount_amount: discountAmount,
          qualifies_for_discount: discountInfo.qualifiesForDiscount,
          discount_details: result.discount_details,
          transaction_details: result.transaction_details,
          flw_reference: result.flw_reference,
          flw_transaction_id: result.flw_transaction_id
        }
      });
    } else {
      // Update transaction with error details
      transaction.status = 'failed';
      transaction.errorMessage = result.message;
      transaction.errorDetails = result.details;
      await transaction.save();
      
      console.log('❌ MaralemPay Purchase Failed:', {
        tx_ref: finalTxRef,
        error: result.message,
        details: result.details
      });
      
      res.status(500).json({
        success: false,
        message: result.message,
        data: {
          transaction_id: transaction._id,
          tx_ref: finalTxRef,
          status: 'failed',
          error_details: result.details,
          discount_details: result.discount_details
        }
      });
    }
  } catch (error) {
    console.error('❌ MaralemPay Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process MaralemPay purchase',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Verify a MaralemPay transaction
 * GET /api/maralem-bills/verify/:reference
 */
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const user = req.user;
    
    console.log('🔍 Verifying MaralemPay transaction:', reference);
    
    // Find transaction in database
    const transaction = await Transaction.findOne({
      txRef: reference,
      user: user._id,
      type: 'maralem_purchase'
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Verify with Flutterwave
    const verificationResult = await verifyMaralemPayment(reference);
    
    if (verificationResult.status === 'success') {
      // Update transaction if needed
      if (transaction.status === 'pending') {
        transaction.status = 'completed';
        transaction.billDetails = verificationResult.transaction;
        transaction.completedAt = new Date();
        await transaction.save();
      }
      
      res.json({
        success: true,
        message: 'Transaction verified successfully',
        data: {
          transaction_id: transaction._id,
          tx_ref: reference,
          status: 'completed',
          amount: transaction.amount,
          original_amount: transaction.originalAmount,
          discount_amount: transaction.discountAmount,
          phone_number: transaction.phoneNumber,
          plan_name: transaction.planName,
          verification_details: verificationResult.transaction
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: verificationResult.message,
        data: {
          transaction_id: transaction._id,
          tx_ref: reference,
          status: transaction.status,
          error_details: verificationResult.details
        }
      });
    }
  } catch (error) {
    console.error('❌ Verify MaralemPay transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get MaralemPay transaction history
 * GET /api/maralem-bills/history
 */
router.get('/history', async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {
      user: user._id,
      type: 'maralem_purchase'
    };
    
    if (status) {
      query.status = status;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-billDetails -errorDetails');
    
    const total = await Transaction.countDocuments(query);
    
    // Calculate total savings
    const totalSavings = await Transaction.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$discountAmount' } } }
    ]);
    
    res.json({
      success: true,
      message: 'MaralemPay transaction history fetched successfully',
      data: {
        transactions,
        total_savings: totalSavings[0]?.total || 0,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_transactions: total,
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get MaralemPay history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get MaralemPay statistics for user
 * GET /api/maralem-bills/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const user = req.user;
    
    // Get transaction statistics
    const stats = await Transaction.aggregate([
      { $match: { user: user._id, type: 'maralem_purchase' } },
      {
        $group: {
          _id: null,
          total_transactions: { $sum: 1 },
          total_amount_paid: { $sum: '$amount' },
          total_original_amount: { $sum: '$originalAmount' },
          total_savings: { $sum: '$discountAmount' },
          completed_transactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failed_transactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const result = stats[0] || {
      total_transactions: 0,
      total_amount_paid: 0,
      total_original_amount: 0,
      total_savings: 0,
      completed_transactions: 0,
      failed_transactions: 0
    };
    
    // Calculate success rate
    const successRate = result.total_transactions > 0 
      ? (result.completed_transactions / result.total_transactions) * 100 
      : 0;
    
    res.json({
      success: true,
      message: 'MaralemPay statistics fetched successfully',
      data: {
        ...result,
        success_rate: Math.round(successRate * 100) / 100,
        average_savings_per_transaction: result.total_transactions > 0 
          ? Math.round((result.total_savings / result.total_transactions) * 100) / 100 
          : 0,
        is_subscriber: user.isActiveSubscriber(),
        subscription_status: user.subscriptionStatus,
        discount_percentage: DISCOUNT_RATE * 100
      }
    });
  } catch (error) {
    console.error('Get MaralemPay stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

