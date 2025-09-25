const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WalletTransaction = require('../models/WalletTransaction');
const Subscription = require('../models/Subscription');
const { FlutterwaveService } = require('../utils/flutterwave');

const flutterwaveService = new FlutterwaveService();

/**
 * Get bill categories (telecom providers like MTN, Airtel, etc.)
 * GET /api/bills/categories?type=airtime (get airtime categories)
 * GET /api/bills/categories?type=data (get data categories)
 * GET /api/bills/categories (get all categories)
 */
const getBillCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const user = req.user; // This might be undefined for public routes
    
    console.log('🔍 Debug: getBillCategories called with type:', type, 'for user:', user?.email || 'anonymous');
    
    const result = await flutterwaveService.getBillCategories(type);
    
    if (result.success) {
      console.log('✅ Debug: Bill categories fetched successfully:', result.data?.length || 0);
      res.json({
        success: true,
        message: 'Bill categories fetched successfully',
        data: result.data
      });
    } else {
      console.log('❌ Debug: Failed to fetch bill categories:', result.message);
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error in getBillCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get bill items for a specific biller (data plans, airtime amounts, etc.)
 * GET /api/bills/items/BIL108 (get MTN data plans)
 * GET /api/bills/items/BIL109 (get Airtel data plans)
 */
const getBillItemsForBiller = async (req, res) => {
  try {
    const { biller_code } = req.params;
    const user = req.user;
    
    console.log('🔍 Debug: getBillItemsForBiller called for biller:', biller_code, 'for user:', user.email);
    
    if (!biller_code) {
      return res.status(400).json({
        success: false,
        message: 'Biller code is required'
      });
    }
    
    const result = await flutterwaveService.getBillItems(biller_code);
    
    if (result.success) {
      console.log('✅ Debug: Bill items fetched successfully:', result.data?.length || 0);
      res.json({
        success: true,
        message: 'Bill items fetched successfully',
        data: result.data
      });
    } else {
      console.log('❌ Debug: Failed to fetch bill items for', biller_code, ':', result.message);
      
      // Provide helpful error message for invalid biller codes
      let errorMessage = result.message;
      if (result.message && result.message.includes('400')) {
        errorMessage = `Biller code ${biller_code} is not valid or has no available items. Please try a different network.`;
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        biller_code: biller_code,
        hint: 'Try using BIL108 (MTN), BIL099 (Airtel), BIL100 (Glo), or BIL101 (9Mobile) for airtime'
      });
    }
  } catch (error) {
    console.error('❌ Error in getBillItemsForBiller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get bill categories and items (legacy endpoint for backward compatibility)
 * GET /api/bills
 */
const getBillItems = async (req, res) => {
  try {
    const { category, biller_code } = req.query;
    
    let result;
    
    if (biller_code) {
      // Get specific biller items
      result = await flutterwaveService.getBillItems(biller_code);
    } else if (category) {
      // Get billers for a specific category
      result = await flutterwaveService.getBillers(category);
    } else {
      // Get all bill categories
      result = await flutterwaveService.getBillCategories();
    }
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get bill items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Create bill payment session and return hosted link
 * POST /api/bills/pay
 * Body: { biller_code, variation_code, amount, phone_number, plan_name?, customer_name? }
 */
const createBillPayment = async (req, res) => {
  try {
    const { 
      biller_code, 
      variation_code, 
      amount, 
      phone_number, 
      plan_name, 
      customer_name 
    } = req.body;
    
    const user = req.user;
    
    console.log('🔍 Debug: createBillPayment called:', {
      biller_code,
      variation_code,
      amount,
      phone_number,
      user_email: user.email
    });
    
    // Validate required fields
    if (!biller_code || !variation_code || !amount || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'biller_code, variation_code, amount, and phone_number are required'
      });
    }

    // TEMPORARY: Return pending status for bill payments (data/airtime)
    // This prevents users from being charged while system is being updated
    return res.status(200).json({
      success: false,
      message: 'Bill payments (airtime and data) are temporarily unavailable. Please try again later.',
      status: 'pending',
      error_code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      data: {
        tx_ref: `PENDING_${user._id}_${Date.now()}`,
        biller_code,
        variation_code,
        amount,
        phone_number,
        plan_name,
        customer_name,
        message: 'Our bill payment services are currently being updated. No charges will be made to your account. Please check back later.'
      }
    });
    
    // Check if user has active subscription for discount
    const activeSubscription = await Subscription.getActiveSubscription(user._id);
    const hasActiveSubscription = !!activeSubscription;
    
    // Calculate discounted amount (10% off if subscription exists)
    const discountPercentage = hasActiveSubscription ? (activeSubscription.discountPercentage || 10) : 0;
    const discountAmount = (amount * discountPercentage) / 100;
    const discountedAmount = amount - discountAmount;
    
    console.log('💰 Discount calculation:', {
      originalAmount: amount,
      discountPercentage,
      discountAmount,
      discountedAmount,
      hasActiveSubscription
    });
    
    // Generate unique transaction reference
    const txRef = `BILL_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment session with Flutterwave
    const paymentData = {
      tx_ref: txRef,
      amount: discountedAmount,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL || 'https://maralempay.com'}/payment/callback?status=successful`,
      payment_options: 'card,ussd',
      customer: {
        email: user.email,
        phone_number: phone_number,
        name: customer_name || `${user.firstName} ${user.lastName}`
      },
      customizations: {
        title: 'MaralemPay Bill Payment',
        description: plan_name || `Payment for ${biller_code} - ${variation_code}`,
        logo: 'https://maralempay.com/logo.png'
      },
      meta: {
        biller_code: biller_code,
        variation_code: variation_code,
        original_amount: amount,
        discount_amount: discountAmount,
        discounted_amount: discountedAmount,
        user_id: user._id,
        payment_type: 'bill_payment'
      }
    };
    
    // Initialize payment with Flutterwave
    const paymentResult = await flutterwaveService.initializePayment(paymentData);
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message
      });
    }
    
    // Save transaction record
    const transaction = new Transaction({
      user: user._id,
      type: 'bill_payment',
      amount: discountedAmount,
      originalAmount: amount,
      discountAmount: discountAmount,
      status: 'pending',
      txRef: txRef,
      flwRef: paymentResult.data.flw_ref,
      billerCode: biller_code,
      variationCode: variation_code,
      phoneNumber: phone_number,
      planName: plan_name,
      paymentLink: paymentResult.data.link,
      metadata: {
        biller_code: biller_code,
        variation_code: variation_code,
        original_amount: amount,
        discount_amount: discountAmount,
        discounted_amount: discountedAmount,
        has_subscription: hasActiveSubscription,
        discount_percentage: discountPercentage,
        subscription_id: activeSubscription?._id
      }
    });
    
    await transaction.save();
    
    console.log('✅ Debug: Payment session created successfully:', {
      tx_ref: txRef,
      amount: discountedAmount,
      user_email: user.email
    });
    
    res.json({
      success: true,
      message: 'Payment session created successfully',
      data: {
        payment_link: paymentResult.data.link,
        tx_ref: txRef,
        amount: discountedAmount,
        original_amount: amount,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        transaction_id: transaction._id,
        phone_number: phone_number,
        plan_name: plan_name
      }
    });
  } catch (error) {
    console.error('❌ Error in createBillPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment session',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Verify bill payment transaction and process bill delivery
 * GET /api/bills/verify/:tx_ref
 * ENHANCED: Ensures customer payment is confirmed before Flutterwave Bills API deduction
 */
const verifyBillPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const user = req.user;
    
    console.log('🔍 Debug: verifyBillPayment called for tx_ref:', tx_ref, 'for user:', user.email);
    
    // Find the transaction by tx_ref
    const transaction = await Transaction.findOne({
      txRef: tx_ref,
      user: user._id,
      type: { $in: ['bill_payment', 'airtime_purchase'] }
    });
    
    if (!transaction) {
      console.log('❌ Debug: Transaction not found for tx_ref:', tx_ref);
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Prevent double processing
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Transaction already completed',
        data: {
          transaction_id: transaction._id,
          status: 'completed',
          amount: transaction.amount,
          original_amount: transaction.originalAmount,
          discount_amount: transaction.discountAmount,
          phone_number: transaction.phoneNumber,
          plan_name: transaction.planName,
          biller_code: transaction.billerCode,
          variation_code: transaction.variationCode
        }
      });
    }
    
    // STEP 1: Verify customer payment with Flutterwave FIRST
    console.log('💳 Step 1: Verifying customer payment with Flutterwave...');
    const verificationResult = await flutterwaveService.verifyPayment(transaction.txRef);
    
    if (!verificationResult.success) {
      console.log('❌ Customer payment verification failed:', verificationResult.message);
      return res.status(400).json({
        success: false,
        message: 'Customer payment verification failed: ' + verificationResult.message
      });
    }
    
    const paymentData = verificationResult.data;
    console.log('✅ Customer payment verification result:', {
      status: paymentData.status,
      amount: paymentData.amount,
      tx_ref: tx_ref
    });
    
    // STEP 2: Only proceed if customer payment is successful
    if (paymentData.status === 'successful') {
      // Update transaction to 'paid' status
      transaction.status = 'paid';
      transaction.paymentDetails = paymentData;
      transaction.paidAt = new Date();
      await transaction.save();
      
      console.log('💰 Customer payment confirmed. Amount charged: ₦' + paymentData.amount);
      
      // STEP 3: Now charge Flutterwave account via Bills API
      console.log('🔄 Step 2: Processing bill delivery via Flutterwave Bills API...');
      
      let billResult;
      const network = transaction.metadata?.network || 'MTN';
      
      if (transaction.type === 'airtime_purchase') {
        // Use airtime-specific purchase method
        billResult = await flutterwaveService.purchaseAirtime({
          phone: transaction.phoneNumber,
          amount: transaction.originalAmount, // Use original amount for actual service delivery
          network: network,
          txRef: transaction.txRef
        });
      } else {
        // Use generic bill purchase method
        const billsData = {
          country: 'NG',
          customer: transaction.phoneNumber,
          amount: transaction.originalAmount, // Use original amount for actual service delivery
          type: transaction.billerCode,
          reference: transaction.txRef,
          biller_name: network
        };
        
        billResult = await flutterwaveService.purchaseBill(billsData);
      }
      
      if (billResult.success) {
        // STEP 4: Bill delivery successful - Complete transaction
        transaction.status = 'completed';
        transaction.billDetails = billResult.data;
        transaction.completedAt = new Date();
        await transaction.save();
        
        console.log('🎉 Transaction completed successfully:', {
          tx_ref: tx_ref,
          customer_charged: paymentData.amount,
          service_delivered: transaction.originalAmount,
          profit: paymentData.amount - transaction.originalAmount, // This should typically be 0 for direct bills
          discount_given: transaction.discountAmount || 0
        });
        
        res.json({
          success: true,
          message: 'Bill payment completed successfully',
          data: {
            transaction_id: transaction._id,
            status: 'completed',
            amount: transaction.amount,
            original_amount: transaction.originalAmount,
            discount_amount: transaction.discountAmount,
            phone_number: transaction.phoneNumber,
            plan_name: transaction.planName,
            biller_code: transaction.billerCode,
            variation_code: transaction.variationCode,
            bill_details: billResult.data,
            payment_confirmation: {
              customer_charged: paymentData.amount,
              service_delivered: transaction.originalAmount,
              transaction_time: new Date().toISOString()
            }
          }
        });
      } else {
        // Payment successful but bill delivery failed - Issue refund
        transaction.status = 'bill_failed';
        transaction.billError = billResult.message;
        await transaction.save();
        
        console.log('❌ Bill delivery failed after successful payment:', {
          tx_ref: tx_ref,
          customer_charged: paymentData.amount,
          bill_error: billResult.message,
          action: 'REFUND_REQUIRED'
        });
        
        // TODO: Implement automatic refund mechanism here
        
        res.status(400).json({
          success: false,
          message: 'Payment successful but bill delivery failed. Refund will be processed automatically.',
          data: {
            transaction_id: transaction._id,
            status: 'bill_failed',
            payment_status: 'successful',
            bill_error: billResult.message,
            refund_status: 'pending',
            customer_charged: paymentData.amount
          }
        });
      }
    } else {
      // Customer payment failed or cancelled - No charges made
      transaction.status = 'failed';
      transaction.paymentDetails = paymentData;
      await transaction.save();
      
      console.log('❌ Customer payment failed:', {
        tx_ref: tx_ref,
        payment_status: paymentData.status,
        no_charges_made: true
      });
      
      res.status(400).json({
        success: false,
        message: 'Customer payment was not successful',
        data: {
          transaction_id: transaction._id,
          status: 'failed',
          payment_status: paymentData.status,
          amount: transaction.amount,
          no_charges_made: true
        }
      });
    }
  } catch (error) {
    console.error('❌ Verify bill payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bill payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get user's bill payment history
 * GET /api/bills/history
 */
const getBillHistory = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = {
      user: user._id,
      type: 'bill_payment'
    };
    
    if (status) {
      query.status = status;
    }
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-paymentDetails -billDetails');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        transactions,
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
    console.error('Get bill history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get transaction details
 * GET /api/bills/transaction/:transaction_id
 */
const getTransactionDetails = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const user = req.user;
    
    const transaction = await Transaction.findOne({
      _id: transaction_id,
      user: user._id,
      type: 'bill_payment'
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handle payment callback and verify transaction
 * GET /api/bills/verify/:transaction_id
 */
const handlePaymentCallback = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const { status, tx_ref } = req.query;
    
    console.log('🔔 Payment callback received:', {
      transaction_id,
      status,
      tx_ref
    });
    
    // Find transaction by transaction_id or tx_ref
    let transaction = null;
    if (transaction_id) {
      transaction = await Transaction.findOne({ 
        $or: [
          { _id: transaction_id },
          { transactionId: transaction_id },
          { txRef: transaction_id }
        ]
      });
    } else if (tx_ref) {
      transaction = await Transaction.findOne({ txRef: tx_ref });
    }
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Verify with Flutterwave
    const verificationResult = await flutterwaveService.verifyTransaction(
      transaction.transactionId || transaction.txRef
    );
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          transaction_id: transaction._id,
          tx_ref: transaction.txRef,
          status: transaction.status
        }
      });
    }
    
    const paymentData = verificationResult.data;
    const paymentStatus = paymentData.status;
    
    console.log('🔍 Payment verification result:', {
      transaction_id: transaction._id,
      tx_ref: transaction.txRef,
      payment_status: paymentStatus
    });
    
    // Update transaction based on payment status
    if (paymentStatus === 'successful') {
      // Update to paid
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'paid',
        paymentData: paymentData,
        transactionId: paymentData.id,
        paidAt: new Date()
      });
      
      // Trigger bill delivery
      try {
        const billDeliveryResult = await flutterwaveService.purchaseBill({
          country: 'NG',
          customer: transaction.phoneNumber,
          amount: transaction.amount,
          recurrence: 'ONCE',
          type: transaction.billerCode,
          reference: transaction.txRef
        });
        
        if (billDeliveryResult.success) {
          // Update to completed
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'completed',
            billDeliveryData: billDeliveryResult.data,
            completedAt: new Date()
          });
          
          console.log('🎉 Bill delivered successfully:', {
            transaction_id: transaction._id,
            tx_ref: transaction.txRef
          });
        } else {
          // Mark as bill delivery failed
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'bill_failed',
            billDeliveryError: billDeliveryResult.message
          });
        }
      } catch (billError) {
        console.error('❌ Bill delivery error:', billError);
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'bill_failed',
          billDeliveryError: billError.message
        });
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      // Update to failed
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        paymentData: paymentData,
        failedAt: new Date()
      });
    }
    
    // Get updated transaction
    const updatedTransaction = await Transaction.findById(transaction._id);
    
    // Return appropriate response
    let responseStatus = 'pending';
    let message = 'Payment is still being processed';
    
    switch (updatedTransaction.status) {
      case 'completed':
        responseStatus = 'success';
        message = 'Payment successful and bill delivered';
        break;
      case 'paid':
        responseStatus = 'success';
        message = 'Payment successful, bill delivery in progress';
        break;
      case 'failed':
      case 'bill_failed':
        responseStatus = 'failed';
        message = 'Payment failed or bill delivery failed';
        break;
      case 'pending':
        responseStatus = 'pending';
        message = 'Payment is still being processed';
        break;
    }
    
    res.json({
      success: responseStatus === 'success',
      status: responseStatus,
      message: message,
      data: {
        transaction_id: updatedTransaction._id,
        tx_ref: updatedTransaction.txRef,
        status: updatedTransaction.status,
        amount: updatedTransaction.amount,
        originalAmount: updatedTransaction.originalAmount,
        discountAmount: updatedTransaction.discountAmount,
        billerCode: updatedTransaction.billerCode,
        variationCode: updatedTransaction.variationCode,
        phoneNumber: updatedTransaction.phoneNumber,
        planName: updatedTransaction.planName
      }
    });
  } catch (error) {
    console.error('❌ Payment callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment callback processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Retry pending payments (cron job or manual trigger)
 * POST /api/bills/retry-pending
 */
const retryPendingPayments = async (req, res) => {
  try {
    console.log('🔄 Starting retry for pending payments...');
    
    // Find all pending transactions older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      createdAt: { $lt: fiveMinutesAgo }
    }).limit(10); // Process max 10 at a time
    
    console.log(`📋 Found ${pendingTransactions.length} pending transactions to retry`);
    
    const results = [];
    
    for (const transaction of pendingTransactions) {
      try {
        console.log(`🔍 Retrying transaction: ${transaction._id} (${transaction.txRef})`);
        
        // Verify with Flutterwave
        const verificationResult = await flutterwaveService.verifyTransaction(
          transaction.transactionId || transaction.txRef
        );
        
        if (verificationResult.success) {
          const paymentData = verificationResult.data;
          const paymentStatus = paymentData.status;
          
          if (paymentStatus === 'successful') {
            // Update to paid
            await Transaction.findByIdAndUpdate(transaction._id, {
              status: 'paid',
              paymentData: paymentData,
              transactionId: paymentData.id,
              paidAt: new Date()
            });
            
            // Trigger bill delivery
            try {
              const billDeliveryResult = await flutterwaveService.purchaseBill({
                country: 'NG',
                customer: transaction.phoneNumber,
                amount: transaction.amount,
                recurrence: 'ONCE',
                type: transaction.billerCode,
                reference: transaction.txRef
              });
              
              if (billDeliveryResult.success) {
                await Transaction.findByIdAndUpdate(transaction._id, {
                  status: 'completed',
                  billDeliveryData: billDeliveryResult.data,
                  completedAt: new Date()
                });
                
                console.log(`✅ Transaction completed: ${transaction._id}`);
                results.push({ transaction_id: transaction._id, status: 'completed' });
              } else {
                await Transaction.findByIdAndUpdate(transaction._id, {
                  status: 'bill_failed',
                  billDeliveryError: billDeliveryResult.message
                });
                
                console.log(`❌ Bill delivery failed: ${transaction._id}`);
                results.push({ transaction_id: transaction._id, status: 'bill_failed' });
              }
            } catch (billError) {
              await Transaction.findByIdAndUpdate(transaction._id, {
                status: 'bill_failed',
                billDeliveryError: billError.message
              });
              
              console.log(`❌ Bill delivery error: ${transaction._id}`, billError.message);
              results.push({ transaction_id: transaction._id, status: 'bill_failed' });
            }
          } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
            await Transaction.findByIdAndUpdate(transaction._id, {
              status: 'failed',
              paymentData: paymentData,
              failedAt: new Date()
            });
            
            console.log(`❌ Transaction failed: ${transaction._id}`);
            results.push({ transaction_id: transaction._id, status: 'failed' });
          } else {
            console.log(`⏳ Transaction still pending: ${transaction._id}`);
            results.push({ transaction_id: transaction._id, status: 'still_pending' });
          }
        } else {
          console.log(`⚠️ Verification failed for: ${transaction._id}`);
          results.push({ transaction_id: transaction._id, status: 'verification_failed' });
        }
      } catch (error) {
        console.error(`❌ Error processing transaction ${transaction._id}:`, error);
        results.push({ transaction_id: transaction._id, status: 'error', error: error.message });
      }
    }
    
    console.log('✅ Retry process completed:', results);
    
    res.json({
      success: true,
      message: `Processed ${pendingTransactions.length} pending transactions`,
      results: results
    });
  } catch (error) {
    console.error('❌ Retry pending payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry pending payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Create airtime purchase session (simplified endpoint)
 * POST /api/bills/airtime
 */
const createAirtimePurchase = async (req, res) => {
  try {
    const { 
      phone_number, 
      amount, 
      network = 'MTN'
    } = req.body;
    
    const user = req.user;
    
    // Validate required fields
    if (!phone_number || !amount) {
      return res.status(400).json({
        success: false,
        message: 'phone_number and amount are required'
      });
    }

    // TEMPORARY: Return pending status for airtime purchases
    // This prevents users from being charged while system is being updated
    return res.status(200).json({
      success: false,
      message: 'Airtime purchases are temporarily unavailable. Please try again later.',
      status: 'pending',
      error_code: 'SERVICE_TEMPORARILY_UNAVAILABLE',
      data: {
        tx_ref: `PENDING_${user._id}_${Date.now()}`,
        phone_number,
        amount,
        network,
        message: 'Our airtime services are currently being updated. No charges will be made to your account. Please check back later.'
      }
    });
    
    console.log('🔍 Creating airtime purchase:', {
      phone_number,
      amount,
      network,
      user_id: user._id
    });
    
    // Check if user has active subscription for discount
    const activeSubscription = await Subscription.getActiveSubscription(user._id);
    const hasActiveSubscription = !!activeSubscription;
    
    // Calculate discounted amount (10% off if subscription exists)
    const discountPercentage = hasActiveSubscription ? (activeSubscription.discountPercentage || 10) : 0;
    const discountAmount = (amount * discountPercentage) / 100;
    const discountedAmount = amount - discountAmount;
    
    console.log('💰 Discount calculation:', {
      originalAmount: amount,
      discountPercentage,
      discountAmount,
      discountedAmount,
      hasActiveSubscription
    });
    
    // Generate unique transaction reference
    const txRef = `AIRTIME_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Map network to biller ID (using actual Flutterwave biller IDs)
    const billerCodes = {
      'MTN': '1',        // MTN VTU
      'AIRTEL': '17147', // AIRTEL VTU
      'GLO': '17148',    // GLO VTU
      '9MOBILE': '17149' // 9MOBILE VTU
    };
    
    const billerCode = billerCodes[network.toUpperCase()] || 'BIL108';
    
    // Create payment session with Flutterwave
    const paymentData = {
      tx_ref: txRef,
      amount: discountedAmount,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL || 'https://maralempay.com'}/payment/callback?status=successful`,
      payment_options: 'card,ussd',
      customer: {
        email: user.email,
        phone_number: phone_number,
        name: `${user.firstName} ${user.lastName}`
      },
      customizations: {
        title: 'MaralemPay Airtime Purchase',
        description: `${network} Airtime - ₦${amount}`,
        logo: 'https://maralempay.com/logo.png'
      },
      meta: {
        biller_code: billerCode,
        variation_code: 'AT099',
        original_amount: amount,
        discount_amount: discountAmount,
        discounted_amount: discountedAmount,
        user_id: user._id,
        payment_type: 'airtime_purchase',
        network: network
      }
    };
    
    // Initialize payment with Flutterwave
    const paymentResult = await flutterwaveService.initializePayment(paymentData);
    
    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message
      });
    }
    
    // Save transaction record
    const transaction = new Transaction({
      user: user._id,
      type: 'airtime_purchase',
      amount: discountedAmount,
      originalAmount: amount,
      discountAmount: discountAmount,
      status: 'pending',
      txRef: txRef,
      flwRef: paymentResult.data.flw_ref,
      billerCode: billerCode,
      variationCode: 'AT099',
      phoneNumber: phone_number,
      planName: `${network} Airtime - ₦${amount}`,
      paymentLink: paymentResult.data.link,
      metadata: {
        biller_code: billerCode,
        variation_code: 'AT099',
        original_amount: amount,
        discount_amount: discountAmount,
        discounted_amount: discountedAmount,
        has_subscription: hasActiveSubscription,
        discount_percentage: discountPercentage,
        subscription_id: activeSubscription?._id,
        network: network
      }
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      message: 'Airtime purchase session created successfully',
      data: {
        payment_link: paymentResult.data.link,
        tx_ref: txRef,
        amount: discountedAmount,
        original_amount: amount,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        transaction_id: transaction._id,
        network: network,
        phone_number: phone_number
      }
    });
  } catch (error) {
    console.error('Create airtime purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create airtime purchase',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Handle Flutterwave webhook notifications
 * POST /api/bills/webhook
 * ENHANCED: Automatic payment verification and bill processing
 */
const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('🔔 Flutterwave Webhook received:', {
      event: webhookData.event,
      tx_ref: webhookData.data?.tx_ref,
      status: webhookData.data?.status,
      amount: webhookData.data?.amount
    });
    
    // Verify webhook signature (if configured)
    // const webhookHash = req.headers['verif-hash'];
    // if (webhookHash !== process.env.FLW_WEBHOOK_HASH) {
    //   return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    // }
    
    // Only process successful charge events
    if (webhookData.event === 'charge.completed' && webhookData.data?.status === 'successful') {
      const txRef = webhookData.data.tx_ref;
      
      // Find the transaction
      const transaction = await Transaction.findOne({ 
        txRef: txRef,
        status: { $in: ['pending', 'paid'] }
      });
      
      if (transaction && transaction.status === 'pending') {
        console.log('💳 Processing webhook for successful payment:', txRef);
        
        // Update transaction to paid status
        transaction.status = 'paid';
        transaction.paymentDetails = webhookData.data;
        transaction.paidAt = new Date();
        await transaction.save();
        
        // Process bill delivery automatically
        console.log('🚀 Auto-processing bill delivery for webhook payment');
        
        let billResult;
        const network = transaction.metadata?.network || 'MTN';
        
        if (transaction.type === 'airtime_purchase') {
          billResult = await flutterwaveService.purchaseAirtime({
            phone: transaction.phoneNumber,
            amount: transaction.originalAmount,
            network: network,
            txRef: transaction.txRef
          });
        } else {
          const billsData = {
            country: 'NG',
            customer: transaction.phoneNumber,
            amount: transaction.originalAmount,
            type: transaction.billerCode,
            reference: transaction.txRef,
            biller_name: network
          };
          
          billResult = await flutterwaveService.purchaseBill(billsData);
        }
        
        if (billResult.success) {
          transaction.status = 'completed';
          transaction.billDetails = billResult.data;
          transaction.completedAt = new Date();
          await transaction.save();
          
          console.log('🎉 Webhook: Transaction completed automatically:', {
            tx_ref: txRef,
            customer_charged: webhookData.data.amount,
            service_delivered: transaction.originalAmount
          });
        } else {
          transaction.status = 'bill_failed';
          transaction.billError = billResult.message;
          await transaction.save();
          
          console.log('❌ Webhook: Bill delivery failed after successful payment:', {
            tx_ref: txRef,
            error: billResult.message
          });
        }
      }
    }
    
    // Always respond with 200 to acknowledge webhook
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Still respond with 200 to prevent webhook retries
    res.status(200).json({ 
      success: false, 
      message: 'Webhook processing failed but acknowledged'
    });
  }
};

/**
 * Enhanced bill payment status checker
 * GET /api/bills/status/:tx_ref
 */
const getBillPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const user = req.user;
    
    const transaction = await Transaction.findOne({
      txRef: tx_ref,
      user: user._id,
      type: { $in: ['bill_payment', 'airtime_purchase'] }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Enhanced status response
    const statusInfo = {
      transaction_id: transaction._id,
      tx_ref: transaction.txRef,
      status: transaction.status,
      amount: transaction.amount,
      original_amount: transaction.originalAmount,
      discount_amount: transaction.discountAmount,
      phone_number: transaction.phoneNumber,
      network: transaction.metadata?.network,
      service_type: transaction.type,
      created_at: transaction.createdAt,
      updated_at: transaction.updatedAt
    };
    
    // Add timestamps based on status
    if (transaction.paidAt) statusInfo.paid_at = transaction.paidAt;
    if (transaction.completedAt) statusInfo.completed_at = transaction.completedAt;
    if (transaction.billDetails) statusInfo.bill_details = transaction.billDetails;
    if (transaction.billError) statusInfo.bill_error = transaction.billError;
    
    // Add helpful status messages
    const statusMessages = {
      'pending': 'Payment is being processed',
      'paid': 'Payment successful, processing service delivery',
      'completed': 'Payment and service delivery completed successfully',
      'failed': 'Payment failed or was cancelled',
      'bill_failed': 'Payment successful but service delivery failed - refund processing'
    };
    
    statusInfo.status_message = statusMessages[transaction.status] || 'Unknown status';
    statusInfo.is_completed = transaction.status === 'completed';
    statusInfo.needs_action = ['failed', 'bill_failed'].includes(transaction.status);
    
    res.json({
      success: true,
      data: statusInfo
    });
  } catch (error) {
    console.error('Get bill payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Debug endpoint to test biller codes and endpoints
const debugBillerCode = async (req, res) => {
  try {
    const { billerCode } = req.params;
    const { FlutterwaveService } = require('../utils/flutterwave');
    const flutterwaveService = new FlutterwaveService();

    console.log('🔍 Debug: Testing biller code:', billerCode);

    // Test 1: Validate biller code
    const validationResult = await flutterwaveService.validateBillerCode(billerCode);
    
    // Test 2: Get all telecom billers for reference
    const telecomBillers = await flutterwaveService.getAllTelecomBillers();
    
    // Test 3: Try to get bill items
    const billItems = await flutterwaveService.getBillItems(billerCode);

    res.json({
      success: true,
      debug: {
        billerCode,
        timestamp: new Date().toISOString(),
        validation: validationResult,
        telecomBillers: telecomBillers,
        billItems: billItems,
        environment: {
          baseURL: process.env.FLW_BASE_URL,
          hasSecretKey: !!process.env.FLW_SECRET_KEY,
          keyPrefix: process.env.FLW_SECRET_KEY?.substring(0, 10) || 'N/A',
          isTestKey: process.env.FLW_SECRET_KEY?.includes('TEST') || false
        }
      }
    });
  } catch (error) {
    console.error('❌ Debug biller code error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
};

module.exports = {
  getBillCategories,
  getBillItemsForBiller,
  getBillItems,
  createBillPayment,
  createAirtimePurchase,
  verifyBillPayment,
  getBillHistory,
  getTransactionDetails,
  handlePaymentCallback,
  retryPendingPayments,
  handleFlutterwaveWebhook,
  getBillPaymentStatus,
  debugBillerCode
};