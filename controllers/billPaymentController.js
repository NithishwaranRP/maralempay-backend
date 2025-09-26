const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { createFlutterwavePayment } = require('../utils/flutterwave');
const emailService = require('../utils/emailService');
const axios = require('axios');

/**
 * Initiate discounted bill payment
 * POST /api/bill/purchase/initiate
 */
const initiateBillPurchase = async (req, res) => {
  try {
    const userId = req.user._id;
    const { billerCode, itemCode, customerId, amount, productName, productType } = req.body;
    
    // Validate required fields
    if (!billerCode || !itemCode || !customerId || !amount || !productName || !productType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: billerCode, itemCode, customerId, amount, productName, productType'
      });
    }

    // Check if user has active subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSubscribed = user.isSubscriber && 
                        user.subscriptionExpiry && 
                        new Date(user.subscriptionExpiry) > new Date();

    if (!isSubscribed) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required for discounted purchases'
      });
    }

    // Calculate prices
    const fullPrice = parseFloat(amount);
    const discountPercentage = 10; // 10% discount
    const customerAmount = fullPrice * (1 - discountPercentage / 100);
    
    // Generate unique transaction reference
    const txRef = `BILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    const transaction = new Transaction({
      userId: userId,
      txRef: txRef,
      billerCode: billerCode,
      itemCode: itemCode,
      customerId: customerId,
      productName: productName,
      productType: productType,
      fullPrice: fullPrice,
      customerAmount: customerAmount,
      discountAmount: fullPrice - customerAmount,
      discountPercentage: discountPercentage,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending'
    });

    await transaction.save();

    // Create Flutterwave payment for discounted amount
    const paymentData = {
      tx_ref: txRef,
      amount: customerAmount,
      currency: 'NGN',
      customer: {
        email: user.email,
        phone_number: user.phoneNumber || '08000000000',
        name: user.fullName || user.email.split('@')[0]
      },
      payment_options: 'card,mobilemoney,ussd',
      redirect_url: `${process.env.FRONTEND_URL}/bill-payment/callback`,
      meta: {
        user_id: userId.toString(),
        transaction_id: transaction._id.toString(),
        payment_type: 'bill_purchase',
        biller_code: billerCode,
        item_code: itemCode,
        customer_id: customerId,
        full_price: fullPrice,
        customer_amount: customerAmount
      },
      customizations: {
        title: `MaralemPay - ${productName}`,
        description: `Purchase ${productName} for ${customerId} (Discounted)`,
        logo: 'https://maralempay.com.ng/logo.png'
      }
    };

    console.log('💳 Initiating discounted bill payment:', {
      userId: userId.toString(),
      txRef: txRef,
      fullPrice: fullPrice,
      customerAmount: customerAmount,
      discount: fullPrice - customerAmount,
      productName: productName,
      customerId: customerId
    });

    const flutterwaveResponse = await createFlutterwavePayment(paymentData);
    
    if (flutterwaveResponse.status === 'success') {
      res.json({
        success: true,
        message: 'Bill payment initiated successfully',
        data: {
          checkoutUrl: flutterwaveResponse.data.link,
          txRef: txRef,
          transactionId: transaction._id,
          pricing: {
            fullPrice: fullPrice,
            customerAmount: customerAmount,
            discountAmount: fullPrice - customerAmount,
            discountPercentage: discountPercentage
          }
        }
      });
    } else {
      // Update transaction status to failed
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        paymentStatus: 'failed',
        errorMessage: flutterwaveResponse.message
      });

      res.status(400).json({
        success: false,
        message: flutterwaveResponse.message || 'Failed to initiate bill payment'
      });
    }
  } catch (error) {
    console.error('❌ Error initiating bill purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify bill payment and process fulfillment
 * POST /api/bill/purchase/verify
 */
const verifyBillPurchase = async (req, res) => {
  try {
    const { txRef } = req.body;
    const userId = req.user._id;
    
    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying bill payment:', { txRef, userId });

    // Find transaction record
    const transaction = await Transaction.findOne({ txRef: txRef, userId: userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify payment with Flutterwave
    const verificationResponse = await verifyFlutterwaveTransaction(txRef);
    
    if (!verificationResponse.success) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        paymentStatus: 'failed',
        errorMessage: verificationResponse.message
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: verificationResponse.message
      });
    }

    const paymentData = verificationResponse.data;
    
    // Verify payment amount matches expected customer amount
    if (paymentData.amount !== transaction.customerAmount) {
      console.error('❌ Amount mismatch:', {
        expected: transaction.customerAmount,
        received: paymentData.amount
      });
      
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        paymentStatus: 'failed',
        errorMessage: 'Payment amount mismatch'
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount'
      });
    }

    // Update payment status
    await Transaction.findByIdAndUpdate(transaction._id, {
      paymentStatus: 'completed',
      flutterwaveTransactionId: paymentData.id,
      paymentCompletedAt: new Date()
    });

    // Process bill fulfillment with full amount
    const fulfillmentResult = await processBillFulfillment(transaction);
    
    if (fulfillmentResult.success) {
      // Update transaction status to completed
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'completed',
        fulfillmentStatus: 'completed',
        fulfillmentCompletedAt: new Date(),
        flutterwaveBillPaymentId: fulfillmentResult.billPaymentId
      });

      // Send success email
      try {
        const user = await User.findById(userId);
        await emailService.sendBillPurchaseSuccessEmail({
          to: user.email,
          name: user.fullName || user.email.split('@')[0],
          productName: transaction.productName,
          customerId: transaction.customerId,
          amount: transaction.customerAmount,
          discountAmount: transaction.discountAmount,
          transactionId: transaction._id
        });
      } catch (emailError) {
        console.error('❌ Error sending success email:', emailError);
      }

      res.json({
        success: true,
        message: 'Bill payment completed successfully',
        data: {
          transactionId: transaction._id,
          status: 'completed',
          fulfillment: fulfillmentResult
        }
      });
    } else {
      // Update transaction status to fulfillment failed
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'fulfillment_failed',
        fulfillmentStatus: 'failed',
        errorMessage: fulfillmentResult.error
      });

      // Send failure email
      try {
        const user = await User.findById(userId);
        await emailService.sendBillPurchaseFailureEmail({
          to: user.email,
          name: user.fullName || user.email.split('@')[0],
          productName: transaction.productName,
          customerId: transaction.customerId,
          amount: transaction.customerAmount,
          transactionId: transaction._id,
          error: fulfillmentResult.error
        });
      } catch (emailError) {
        console.error('❌ Error sending failure email:', emailError);
      }

      res.status(500).json({
        success: false,
        message: 'Bill fulfillment failed',
        error: fulfillmentResult.error
      });
    }
  } catch (error) {
    console.error('❌ Error verifying bill purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Process bill fulfillment using Flutterwave Bill Payment API
 */
const processBillFulfillment = async (transaction) => {
  try {
    console.log('🔄 Processing bill fulfillment:', {
      transactionId: transaction._id,
      billerCode: transaction.billerCode,
      itemCode: transaction.itemCode,
      customerId: transaction.customerId,
      fullPrice: transaction.fullPrice
    });

    const billPaymentData = {
      country: 'NG',
      customer: transaction.customerId,
      amount: transaction.fullPrice, // Use full price for fulfillment
      recurrence: 'ONCE',
      type: transaction.productType.toUpperCase(),
      reference: transaction.txRef,
      biller_name: transaction.billerCode
    };

    const response = await axios.post(
      'https://api.flutterwave.com/v3/bills',
      billPaymentData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      console.log('✅ Bill fulfillment successful:', {
        transactionId: transaction._id,
        billPaymentId: response.data.data.id
      });

      return {
        success: true,
        billPaymentId: response.data.data.id,
        message: 'Bill fulfillment completed successfully'
      };
    } else {
      console.error('❌ Bill fulfillment failed:', response.data.message);
      return {
        success: false,
        error: response.data.message || 'Bill fulfillment failed'
      };
    }
  } catch (error) {
    console.error('❌ Bill fulfillment error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Bill fulfillment failed'
    };
  }
};

/**
 * Verify Flutterwave transaction
 */
const verifyFlutterwaveTransaction = async (txRef) => {
  try {
    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${txRef}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Transaction verification failed'
      };
    }
  } catch (error) {
    console.error('❌ Flutterwave verification error:', error);
    return {
      success: false,
      message: 'Transaction verification failed',
      error: error.message
    };
  }
};

/**
 * Get transaction history
 * GET /api/bill/transactions
 */
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    
    const transactions = await Transaction.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments({ userId: userId });

    res.json({
      success: true,
      data: {
        transactions: transactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTransactions: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  initiateBillPurchase,
  verifyBillPurchase,
  getTransactionHistory,
  processBillFulfillment,
  verifyFlutterwaveTransaction
};
