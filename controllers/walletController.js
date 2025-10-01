const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Transaction = require('../models/Transaction');
const { FlutterwaveService } = require('../utils/flutterwave');

const flutterwaveService = new FlutterwaveService();

/**
 * Get wallet balance and recent transactions
 */
const getWalletInfo = async (req, res) => {
  try {
    const user = req.user;

    // Get recent wallet transactions
    const recentTransactions = await WalletTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        balance: user.walletBalance,
        recentTransactions: recentTransactions.map(tx => ({
          id: tx._id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: tx.balanceAfter,
          description: tx.description,
          category: tx.category,
          status: tx.status,
          createdAt: tx.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Get wallet info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Fund wallet via Flutterwave
 */
const fundWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum funding amount is ₦100'
      });
    }

    // Initialize payment for wallet funding
    const paymentResult = await flutterwaveService.initializeWalletPayment(user, amount);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message
      });
    }

    // Create transaction record in database
    const transaction = await Transaction.create({
      tx_ref: paymentResult.data.tx_ref,
      userId: user._id.toString(),
      phone: user.phone || '',
      biller_code: 'WALLET_FUNDING',
      fullAmount: amount,
      userAmount: amount,
      isSubscriber: user.hasActiveSubscription || false,
      status: 'initialized',
      biller_reference: paymentResult.data.tx_ref,
      idempotency_key: `WALLET_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.log('✅ Wallet funding transaction created:', {
      tx_ref: paymentResult.data.tx_ref,
      userId: user._id,
      amount: amount,
      status: 'initialized'
    });

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        paymentUrl: paymentResult.data.link,
        amount: amount,
        currency: 'NGN',
        reference: paymentResult.data.tx_ref
      }
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize wallet funding',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Verify wallet funding payment
 */
const verifyWalletFunding = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const user = req.user;

    console.log('Verifying wallet funding for user:', user.email, 'with transaction ID:', transactionId);

    // Validate transactionId
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // Check if this transaction has already been processed
    const existingTransaction = await WalletTransaction.findOne({
      reference: transactionId
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been processed'
      });
    }

    // For mock payments, we'll accept any transaction ID that starts with 'MOCK'
    let paymentData;
    if (transactionId.startsWith('MOCK') || transactionId.includes('mock') || transactionId.startsWith('MARALEM')) {
      console.log('Processing mock wallet funding for transaction:', transactionId);
      paymentData = {
        status: 'successful',
        amount: 1000, // Mock amount
        flw_ref: `MOCK_WALLET_REF_${Date.now()}`,
        tx_ref: `MOCK_WALLET_TX_${Date.now()}`
      };
    } else {
      // Verify payment with Flutterwave for real payments
      const verificationResult = await flutterwaveService.verifyPayment(transactionId);

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

      paymentData = verificationResult.data;

      if (paymentData.status !== 'successful') {
        return res.status(400).json({
          success: false,
          message: 'Payment was not successful'
        });
      }
    }

    // Update user wallet balance
    const balanceBefore = user.walletBalance;
    const newBalance = balanceBefore + paymentData.amount;

    await User.findByIdAndUpdate(user._id, {
      walletBalance: newBalance
    });

    // Create wallet transaction record
    const walletTransaction = await WalletTransaction.create({
      user: user._id,
      type: 'credit',
      amount: paymentData.amount,
      balanceBefore: balanceBefore,
      balanceAfter: newBalance,
      description: 'Wallet funding via Flutterwave',
      reference: transactionId,
      category: 'deposit',
      status: 'completed',
      metadata: {
        transactionId: transactionId,
        flutterwaveReference: paymentData.flw_ref
      }
    });

    console.log('Wallet funding completed:', {
      userId: user._id,
      amount: paymentData.amount,
      newBalance: newBalance,
      transactionId: walletTransaction._id
    });

    res.json({
      success: true,
      message: 'Wallet funded successfully',
      data: {
        amount: paymentData.amount,
        newBalance: newBalance,
        transactionId: walletTransaction._id
      }
    });
  } catch (error) {
    console.error('Verify wallet funding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify wallet funding',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get wallet transaction history
 */
const getWalletTransactions = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, category } = req.query;

    const query = { user: user._id };
    if (category) {
      query.category = category;
    }

    const transactions = await WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WalletTransaction.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx._id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: tx.balanceAfter,
          description: tx.description,
          category: tx.category,
          status: tx.status,
          createdAt: tx.createdAt,
          metadata: tx.metadata
        })),
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
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Process wallet payment for airtime/data with discount
 * ENHANCED: Ensures customer is charged from wallet BEFORE Flutterwave Bills API deduction
 */
const processWalletPayment = async (req, res) => {
  try {
    const { amount, service, phoneNumber, network, dataPlan, billerCode, variationCode } = req.body;
    const user = req.user;

    console.log('💳 Processing wallet payment:', {
      user_id: user._id,
      email: user.email,
      service: service,
      amount: amount,
      phoneNumber: phoneNumber,
      network: network
    });

    // Check if user qualifies for discount (minimum N1,000 balance)
    const qualifiesForDiscount = user.qualifiesForDiscount();
    
    if (!qualifiesForDiscount) {
      return res.status(403).json({
        success: false,
        message: 'Minimum wallet balance of N1,000 required for discounts',
        data: {
          currentBalance: user.walletBalance,
          requiredBalance: 1000,
          shortfall: 1000 - user.walletBalance
        }
      });
    }

    // Calculate discounted amount (10% discount)
    const discountPercentage = process.env.WALLET_DISCOUNT_PERCENTAGE || 10;
    const discountAmount = (amount * discountPercentage) / 100;
    const discountedAmount = amount - discountAmount;

    console.log('💰 Wallet payment calculation:', {
      originalAmount: amount,
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
      discountedAmount: discountedAmount,
      userBalance: user.walletBalance
    });

    // STEP 1: Check if user has sufficient wallet balance
    if (user.walletBalance < discountedAmount) {
      console.log('❌ Insufficient wallet balance:', {
        required: discountedAmount,
        available: user.walletBalance,
        shortfall: discountedAmount - user.walletBalance
      });
      
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        data: {
          required: discountedAmount,
          available: user.walletBalance,
          shortfall: discountedAmount - user.walletBalance
        }
      });
    }

    // STEP 2: Deduct from wallet FIRST (charge customer)
    const balanceBefore = user.walletBalance;
    const newBalance = balanceBefore - discountedAmount;

    await User.findByIdAndUpdate(user._id, {
      walletBalance: newBalance
    });

    console.log('✅ Customer charged from wallet:', {
      balanceBefore: balanceBefore,
      chargedAmount: discountedAmount,
      newBalance: newBalance
    });

    // STEP 3: Create wallet transaction record
    const txRef = `WALLET_${service.toUpperCase()}_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const walletTransaction = await WalletTransaction.create({
      user: user._id,
      type: 'debit',
      amount: discountedAmount,
      balanceBefore: balanceBefore,
      balanceAfter: newBalance,
      description: `${service} purchase with wallet discount`,
      reference: txRef,
      category: service === 'airtime' ? 'airtime_purchase' : 'data_purchase',
      status: 'processing', // Set to processing until bill delivery is confirmed
      metadata: {
        phoneNumber: phoneNumber,
        network: network,
        dataPlan: dataPlan,
        originalAmount: amount,
        discountAmount: discountAmount,
        service: service,
        billerCode: billerCode,
        variationCode: variationCode
      }
    });

    // STEP 4: Now process the actual airtime/data purchase via Flutterwave Bills API
    console.log('🔄 Processing bill delivery via Flutterwave Bills API...');
    
    let billResult;
    
    try {
      if (service === 'airtime') {
        // Use airtime-specific purchase method
        billResult = await flutterwaveService.purchaseAirtime({
          phone: phoneNumber,
          amount: amount, // Use original amount for actual service delivery
          network: network,
          txRef: txRef
        });
      } else if (service === 'data') {
        // Use data purchase method
        const billsData = {
          country: 'NG',
          customer: phoneNumber,
          amount: amount, // Use original amount for actual service delivery
          type: billerCode || 'BIL108', // Default to MTN if not provided
          reference: txRef,
          biller_name: network
        };
        
        billResult = await flutterwaveService.purchaseBill(billsData);
      } else {
        throw new Error('Invalid service type. Must be "airtime" or "data"');
      }
      
      if (billResult.success) {
        // STEP 5: Bill delivery successful - Complete transaction
        walletTransaction.status = 'completed';
        walletTransaction.billDetails = billResult.data;
        walletTransaction.completedAt = new Date();
        await walletTransaction.save();
        
        console.log('🎉 Wallet payment completed successfully:', {
          txRef: txRef,
          customerCharged: discountedAmount,
          serviceDelivered: amount,
          discountGiven: discountAmount,
          network: network,
          phoneNumber: phoneNumber
        });

        res.json({
          success: true,
          message: `${service} purchase successful`,
          data: {
            service: service,
            originalAmount: amount,
            discountedAmount: discountedAmount,
            discountAmount: discountAmount,
            newBalance: newBalance,
            transactionId: walletTransaction._id,
            phoneNumber: phoneNumber,
            network: network,
            reference: txRef,
            bill_details: billResult.data,
            payment_summary: {
              customer_charged: discountedAmount,
              service_delivered: amount,
              discount_applied: discountAmount,
              transaction_time: new Date().toISOString()
            }
          }
        });
      } else {
        // Bill delivery failed - Refund wallet and mark transaction as failed
        console.log('❌ Bill delivery failed, refunding wallet:', {
          txRef: txRef,
          refundAmount: discountedAmount,
          billError: billResult.message
        });
        
        // Refund the wallet
        await User.findByIdAndUpdate(user._id, {
          walletBalance: balanceBefore // Restore original balance
        });
        
        // Update transaction status
        walletTransaction.status = 'failed';
        walletTransaction.billError = billResult.message;
        walletTransaction.refundedAt = new Date();
        await walletTransaction.save();
        
        // Create refund transaction
        await WalletTransaction.create({
          user: user._id,
          type: 'credit',
          amount: discountedAmount,
          balanceBefore: newBalance,
          balanceAfter: balanceBefore,
          description: `Refund for failed ${service} purchase`,
          reference: `REFUND_${txRef}`,
          category: 'refund',
          status: 'completed',
          metadata: {
            originalTransaction: walletTransaction._id,
            failureReason: billResult.message,
            phoneNumber: phoneNumber,
            network: network
          }
        });
        
        res.status(400).json({
          success: false,
          message: `${service} purchase failed. Wallet has been refunded.`,
          data: {
            service: service,
            originalAmount: amount,
            refundedAmount: discountedAmount,
            currentBalance: balanceBefore,
            transactionId: walletTransaction._id,
            error: billResult.message,
            refund_status: 'completed'
          }
        });
      }
    } catch (billError) {
      // Exception during bill processing - Refund wallet
      console.error('❌ Exception during bill processing:', billError);
      
      // Refund the wallet
      await User.findByIdAndUpdate(user._id, {
        walletBalance: balanceBefore
      });
      
      // Update transaction status
      walletTransaction.status = 'failed';
      walletTransaction.billError = billError.message;
      walletTransaction.refundedAt = new Date();
      await walletTransaction.save();
      
      // Create refund transaction
      await WalletTransaction.create({
        user: user._id,
        type: 'credit',
        amount: discountedAmount,
        balanceBefore: newBalance,
        balanceAfter: balanceBefore,
        description: `Refund for failed ${service} purchase`,
        reference: `REFUND_${txRef}`,
        category: 'refund',
        status: 'completed',
        metadata: {
          originalTransaction: walletTransaction._id,
          failureReason: billError.message,
          phoneNumber: phoneNumber,
          network: network
        }
      });
      
      res.status(500).json({
        success: false,
        message: `${service} purchase failed due to system error. Wallet has been refunded.`,
        data: {
          service: service,
          refundedAmount: discountedAmount,
          currentBalance: balanceBefore,
          transactionId: walletTransaction._id,
          error: billError.message,
          refund_status: 'completed'
        }
      });
    }
  } catch (error) {
    console.error('❌ Process wallet payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process wallet payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getWalletInfo,
  fundWallet,
  verifyWalletFunding,
  getWalletTransactions,
  processWalletPayment
};
