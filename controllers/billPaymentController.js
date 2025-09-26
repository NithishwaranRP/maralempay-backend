const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { sendEmail } = require('../utils/emailService');

// Flutterwave configuration
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const DISCOUNT_PERCENTAGE = 10; // 10% discount for subscribers

/**
 * Initialize discounted bill payment
 * POST /api/bill/purchase/initiate
 */
const initiateBillPayment = async (req, res) => {
  try {
    const user = req.user;
    const { billerCode, itemCode, customerId, amount, productName, productType } = req.body;

    // Validate required fields
    if (!billerCode || !itemCode || !customerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: billerCode, itemCode, customerId, amount'
      });
    }

    // Check if user is subscribed
    if (!user.isSubscriber) {
      return res.status(403).json({
        success: false,
        message: 'Subscription required for discounted purchases'
      });
    }

    // Calculate full price and discounted amount
    const fullPrice = parseFloat(amount);
    const discountedAmount = fullPrice * (1 - DISCOUNT_PERCENTAGE / 100);
    const discountAmount = fullPrice - discountedAmount;

    // Generate unique transaction reference
    const txRef = `MARALEM_BILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('💳 Initiating discounted bill payment:');
    console.log('   User:', user.email);
    console.log('   Product:', productName);
    console.log('   Full Price: ₦' + fullPrice);
    console.log('   Discounted Price: ₦' + discountedAmount.toFixed(2));
    console.log('   Discount: ₦' + discountAmount.toFixed(2));
    console.log('   TX Ref:', txRef);

    // Prepare Flutterwave payment payload
    const paymentPayload = {
      tx_ref: txRef,
      amount: discountedAmount,
      currency: 'NGN',
      customer: {
        email: user.email,
        phone_number: user.phoneNumber || '08000000000',
        name: user.fullName || user.email.split('@')[0],
      },
      payment_options: 'card,mobilemoney,ussd',
      redirect_url: `${process.env.FRONTEND_URL}/bill/callback?tx_ref=${txRef}`,
      meta: {
        user_id: user._id.toString(),
        payment_type: 'bill_payment',
        biller_code: billerCode,
        item_code: itemCode,
        customer_id: customerId,
        full_price: fullPrice,
        discounted_amount: discountedAmount,
        discount_amount: discountAmount,
        product_name: productName,
        product_type: productType,
      },
      customizations: {
        title: `MaralemPay - ${productName}`,
        description: `Purchase ${productName} for ${customerId} (Discounted)`,
        logo: 'https://maralempay.com.ng/logo.png',
      },
    };

    // Initialize payment with Flutterwave
    const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/payments`, paymentPayload, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status === 'success') {
      const data = response.data.data;
      
      // Create transaction record
      const transaction = new Transaction({
        user: user._id,
        txRef: txRef,
        type: 'bill_payment',
        productName: productName,
        productType: productType,
        billerCode: billerCode,
        itemCode: itemCode,
        customerId: customerId,
        fullPrice: fullPrice,
        discountedAmount: discountedAmount,
        discountAmount: discountAmount,
        currency: 'NGN',
        status: 'pending',
        flutterwaveId: data.id,
        checkoutUrl: data.link,
        createdAt: new Date(),
      });
      
      await transaction.save();

      console.log('✅ Bill payment initialized successfully');
      console.log('   Flutterwave ID:', data.id);
      console.log('   Checkout URL:', data.link);

      res.json({
        success: true,
        message: 'Bill payment initialized successfully',
        data: {
          txRef: txRef,
          fullPrice: fullPrice,
          discountedAmount: discountedAmount,
          discountAmount: discountAmount,
          discountPercentage: DISCOUNT_PERCENTAGE,
          currency: 'NGN',
          checkoutUrl: data.link,
          flutterwaveId: data.id,
        },
      });
    } else {
      console.log('❌ Failed to initialize bill payment:', response.data.message);
      res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to initialize bill payment',
        error: response.data.data,
      });
    }
  } catch (error) {
    console.error('❌ Error initiating bill payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

/**
 * Verify bill payment and process fulfillment
 * POST /api/bill/purchase/verify
 */
const verifyBillPayment = async (req, res) => {
  try {
    const { txRef } = req.body;
    const user = req.user;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    console.log('🔍 Verifying bill payment:', txRef);

    // Find transaction record
    const transaction = await Transaction.findOne({ txRef, user: user._id });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction record not found'
      });
    }

    // Verify payment with Flutterwave
    const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/transactions/${txRef}/verify`, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
    });

    if (response.data.status === 'success') {
      const paymentData = response.data.data;
      
      // Check if payment is successful
      if (paymentData.status === 'successful' && 
          paymentData.amount === transaction.discountedAmount &&
          paymentData.currency === 'NGN') {
        
        console.log('✅ Customer payment verified, processing bill fulfillment...');
        
        // Process bill payment with full amount
        const billPaymentResult = await processBillPayment(transaction);
        
        if (billPaymentResult.success) {
          // Update transaction status
          transaction.status = 'completed';
          transaction.verifiedAt = new Date();
          transaction.paymentData = paymentData;
          transaction.billPaymentData = billPaymentResult.data;
          await transaction.save();

          console.log('✅ Bill payment completed successfully');
          console.log('   Product:', transaction.productName);
          console.log('   Customer:', transaction.customerId);
          console.log('   Amount:', transaction.fullPrice);

          // Send success email
          try {
            await sendEmail({
              to: user.email,
              subject: '🎉 Your Purchase is Complete!',
              template: 'bill_payment_success',
              data: {
                userName: user.fullName || user.email.split('@')[0],
                productName: transaction.productName,
                customerId: transaction.customerId,
                fullPrice: transaction.fullPrice,
                discountAmount: transaction.discountAmount,
                discountedAmount: transaction.discountedAmount,
                transactionId: transaction._id,
                completedAt: new Date(),
              }
            });
            console.log('✅ Bill payment success email sent to:', user.email);
          } catch (emailError) {
            console.error('❌ Failed to send bill payment success email:', emailError);
          }

          res.json({
            success: true,
            message: 'Bill payment completed successfully',
            data: {
              transactionId: transaction._id,
              productName: transaction.productName,
              customerId: transaction.customerId,
              fullPrice: transaction.fullPrice,
              discountAmount: transaction.discountAmount,
              discountedAmount: transaction.discountedAmount,
              status: 'completed',
              completedAt: new Date(),
            },
          });
        } else {
          // Bill payment failed
          transaction.status = 'failed';
          transaction.verifiedAt = new Date();
          transaction.paymentData = paymentData;
          transaction.errorMessage = billPaymentResult.message;
          await transaction.save();

          console.log('❌ Bill payment failed:', billPaymentResult.message);

          // Send failure email
          try {
            await sendEmail({
              to: user.email,
              subject: '⚠️ Issue with your Purchase',
              template: 'bill_payment_failed',
              data: {
                userName: user.fullName || user.email.split('@')[0],
                productName: transaction.productName,
                customerId: transaction.customerId,
                errorMessage: billPaymentResult.message,
                transactionId: transaction._id,
                supportEmail: 'support@maralempay.com.ng',
              }
            });
            console.log('✅ Bill payment failure email sent to:', user.email);
          } catch (emailError) {
            console.error('❌ Failed to send bill payment failure email:', emailError);
          }

          res.status(400).json({
            success: false,
            message: 'Bill payment failed: ' + billPaymentResult.message,
            error: billPaymentResult.error,
          });
        }
      } else {
        console.log('❌ Payment verification failed:', paymentData.status);
        res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          error: 'Payment status: ' + paymentData.status,
        });
      }
    } else {
      console.log('❌ Flutterwave verification failed:', response.data.message);
      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        error: response.data.message,
      });
    }
  } catch (error) {
    console.error('❌ Error verifying bill payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

/**
 * Process bill payment with Flutterwave Bill Payment API
 * This is the critical function that pays the full amount from your wallet
 */
const processBillPayment = async (transaction) => {
  try {
    console.log('💳 Processing bill payment with full amount:');
    console.log('   Biller Code:', transaction.billerCode);
    console.log('   Item Code:', transaction.itemCode);
    console.log('   Customer ID:', transaction.customerId);
    console.log('   Full Amount: ₦' + transaction.fullPrice);

    const requestData = {
      country: 'NG',
      customer: transaction.customerId,
      amount: transaction.fullPrice,
      recurrence: 'ONCE',
      type: transaction.productType === 'airtime' ? 'AIRTIME' : 'DATA',
      reference: transaction.txRef,
      biller_name: transaction.billerCode,
    };

    const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/bills`, requestData, {
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.status === 'success') {
      const data = response.data.data;
      
      console.log('✅ Bill payment processed successfully');
      console.log('   Flutterwave Bill ID:', data.id);
      console.log('   Status:', data.status);

      return {
        success: true,
        data: {
          billId: data.id,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
          customer: data.customer,
          billerName: data.biller_name,
          createdAt: data.created_at,
        },
      };
    } else {
      console.log('❌ Bill payment failed:', response.data.message);
      return {
        success: false,
        message: response.data.message || 'Bill payment failed',
        error: response.data.data,
      };
    }
  } catch (error) {
    console.error('❌ Error processing bill payment:', error);
    return {
      success: false,
      message: 'Bill payment processing failed: ' + error.message,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * Get user's transaction history
 * GET /api/bill/transactions
 */
const getTransactionHistory = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;

    const transactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments({ user: user._id });

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          txRef: t.txRef,
          productName: t.productName,
          productType: t.productType,
          customerId: t.customerId,
          fullPrice: t.fullPrice,
          discountedAmount: t.discountedAmount,
          discountAmount: t.discountAmount,
          status: t.status,
          createdAt: t.createdAt,
          completedAt: t.verifiedAt,
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total: total,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
};

module.exports = {
  initiateBillPayment,
  verifyBillPayment,
  getTransactionHistory,
};
