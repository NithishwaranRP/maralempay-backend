const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { FlutterwaveService } = require('../utils/flutterwave');

const flutterwaveService = new FlutterwaveService();

/**
 * Get subscription plans
 * GET /api/subscription/plans
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: '6_months',
        name: '6 Months Premium Plan',
        description: 'Get 10% discount on all airtime, data, and bill payments for 6 months',
        duration: 6,
        durationUnit: 'months',
        amount: 100,
        currency: 'NGN',
        discountPercentage: 10,
        benefits: [
          '10% discount on airtime purchases',
          '10% discount on data purchases', 
          '10% discount on bill payments',
          'Priority customer support',
          'Exclusive offers and promotions'
        ],
        popular: true
      }
    ];

    res.json({
      success: true,
      message: 'Subscription plans fetched successfully',
      data: plans
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Purchase subscription
 * POST /api/subscription/purchase
 * Body: { planType }
 */
const purchaseSubscription = async (req, res) => {
  try {
    console.log('🔍 SUBSCRIPTION DEBUG: Starting purchaseSubscription');
    console.log('🔍 SUBSCRIPTION DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 SUBSCRIPTION DEBUG: User from auth:', JSON.stringify(req.user, null, 2));
    
    const { planType = '6_months' } = req.body;
    const user = req.user;

    // Validate required fields
    if (!user || !user._id) {
      console.error('❌ SUBSCRIPTION ERROR: No user found in request');
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    if (!planType) {
      console.error('❌ SUBSCRIPTION ERROR: No planType provided');
      return res.status(400).json({
        success: false,
        message: 'Plan type is required'
      });
    }

    console.log('🔍 SUBSCRIPTION DEBUG: Validated inputs:', {
      planType,
      user_id: user._id,
      user_email: user.email
    });

    // Check if user already has an active subscription with completed payment
    const existingSubscription = await Subscription.findOne({
      user: user._id,
      status: 'active',
      paymentStatus: 'paid',
      endDate: { $gt: new Date() }
    });
    
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription',
        data: {
          subscription: existingSubscription,
          daysRemaining: existingSubscription.getDaysRemaining()
        }
      });
    }
    
    // Check if user has a pending subscription that needs payment completion
    const pendingSubscription = await Subscription.findOne({
      user: user._id,
      status: 'active',
      paymentStatus: 'pending',
      endDate: { $gt: new Date() }
    });
    
    if (pendingSubscription) {
      console.log('🔍 SUBSCRIPTION DEBUG: Found pending subscription, checking for existing payment link');
      
      // Check if there's an existing transaction with payment link
      const existingTransaction = await Transaction.findOne({
        tx_ref: pendingSubscription.paymentReference,
        status: 'initialized'
      });
      
      if (existingTransaction && existingTransaction.payment_link) {
        console.log('🔍 SUBSCRIPTION DEBUG: Returning existing payment link for pending subscription');
        return res.json({
          success: true,
          message: 'Complete your pending subscription payment',
          data: {
            payment_link: existingTransaction.payment_link,
            payment_reference: pendingSubscription.paymentReference,
            amount: pendingSubscription.amount,
            plan_type: pendingSubscription.planType,
            duration: pendingSubscription.duration,
            discount_percentage: pendingSubscription.discountPercentage,
            subscription_id: pendingSubscription._id,
            transaction_id: existingTransaction._id,
            is_pending_payment: true
          }
        });
      } else {
        console.log('🔍 SUBSCRIPTION DEBUG: No existing payment link found, creating new payment');
        // Continue with creating new payment for the pending subscription
      }
    }

    // Define subscription plan details
    const planDetails = {
      '6_months': {
        amount: 4500,
        duration: 6,
        durationUnit: 'months',
        discountPercentage: 10
      }
    };

    const plan = planDetails[planType];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Generate unique payment reference
    const paymentRef = `SUB_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate user data
    if (!user.phone) {
      console.error('❌ SUBSCRIPTION ERROR: User phone number is required for subscription');
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for subscription',
        error: 'User phone number is missing'
      });
    }

    // Validate environment variables before proceeding
    console.log('🔍 SUBSCRIPTION DEBUG: Checking environment variables...');
    const envCheck = {
      FLW_SECRET_KEY: !!process.env.FLW_SECRET_KEY,
      FLW_PUBLIC_KEY: !!process.env.FLW_PUBLIC_KEY,
      FRONTEND_URL: !!process.env.FRONTEND_URL,
      MONGODB_URI: !!process.env.MONGODB_URI
    };
    
    console.log('🔍 SUBSCRIPTION DEBUG: Environment variables status:', envCheck);
    
    if (!process.env.FLW_SECRET_KEY) {
      console.error('❌ SUBSCRIPTION ERROR: FLW_SECRET_KEY is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway configuration error',
        error: 'Flutterwave secret key is not configured'
      });
    }
    
    if (!process.env.FLW_PUBLIC_KEY) {
      console.error('❌ SUBSCRIPTION ERROR: FLW_PUBLIC_KEY is not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway configuration error',
        error: 'Flutterwave public key is not configured'
      });
    }

    // Create payment session with Flutterwave
    const paymentData = {
      tx_ref: paymentRef,
      amount: plan.amount,
      currency: 'NGN',
      redirect_url: `${process.env.FRONTEND_URL || 'https://maralempay.com'}/subscription/callback?status=successful`,
      payment_options: 'card,ussd',
      customer: {
        email: user.email,
        phone_number: user.phone || '08000000000', // Fallback phone number
        name: `${user.firstName || 'User'} ${user.lastName || ''}`.trim()
      },
      customizations: {
        title: 'MaralemPay Subscription',
        description: `${planType.replace('_', ' ')} Premium Plan - ₦${plan.amount}`,
        logo: 'https://maralempay.com/logo.png'
      },
      meta: {
        user_id: user._id,
        plan_type: planType,
        payment_type: 'subscription',
        duration: plan.duration,
        discount_percentage: plan.discountPercentage
      }
    };

    // Validate payment data structure
    console.log('🔍 SUBSCRIPTION DEBUG: Validating payment data structure...');
    const requiredFields = ['tx_ref', 'amount', 'currency', 'customer', 'customer.email'];
    const missingFields = requiredFields.filter(field => {
      const keys = field.split('.');
      let value = paymentData;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return true;
        }
      }
      return !value;
    });

    if (missingFields.length > 0) {
      console.error('❌ SUBSCRIPTION ERROR: Missing required payment data fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Initialize payment with Flutterwave
    console.log('🔍 SUBSCRIPTION DEBUG: About to call Flutterwave initializePayment');
    console.log('🔍 SUBSCRIPTION DEBUG: Payment data:', JSON.stringify(paymentData, null, 2));
    
    // Check if FlutterwaveService is properly initialized
    if (!flutterwaveService) {
      console.error('❌ SUBSCRIPTION ERROR: FlutterwaveService is not initialized');
      return res.status(500).json({
        success: false,
        message: 'Payment service not available',
        error: 'FlutterwaveService instance is null or undefined'
      });
    }

    console.log('🔍 SUBSCRIPTION DEBUG: FlutterwaveService initialized, calling initializePayment...');
    
    const paymentResult = await flutterwaveService.initializePayment(paymentData);

    console.log('🔍 SUBSCRIPTION DEBUG: Flutterwave payment result:', JSON.stringify(paymentResult, null, 2));

    if (!paymentResult.success) {
      console.error('❌ SUBSCRIPTION ERROR: Flutterwave payment initialization failed');
      console.error('❌ SUBSCRIPTION ERROR: Payment result:', paymentResult);
      return res.status(400).json({
        success: false,
        message: paymentResult.message || 'Failed to initialize payment with Flutterwave',
        error_details: paymentResult,
        gateway_error: paymentResult.message
      });
    }

    console.log('✅ SUBSCRIPTION DEBUG: Flutterwave payment initialized successfully');

    // Create or update subscription record
    console.log('🔍 SUBSCRIPTION DEBUG: Creating/updating subscription record...');
    
    let subscription;
    
    if (pendingSubscription) {
      // Update existing pending subscription with new payment details
      console.log('🔍 SUBSCRIPTION DEBUG: Updating existing pending subscription');
      subscription = pendingSubscription;
      subscription.paymentReference = paymentRef;
      subscription.flutterwaveRef = paymentResult.data.flw_ref;
      subscription.updatedAt = new Date();
    } else {
      // Create new subscription record
      console.log('🔍 SUBSCRIPTION DEBUG: Creating new subscription record');
      
      // Calculate end date explicitly
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (plan.duration * 30 * 24 * 60 * 60 * 1000)); // 30 days per month
      
      console.log('🔍 SUBSCRIPTION DEBUG: Calculated dates:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: plan.duration,
        durationUnit: plan.durationUnit
      });
      
      const subscriptionData = {
      user: user._id,
      planType: planType,
      amount: plan.amount,
      duration: plan.duration,
      durationUnit: plan.durationUnit,
        startDate: startDate,
        endDate: endDate, // Explicitly set endDate
        status: 'active', // Set initial status
        paymentStatus: 'pending', // Will be updated to 'paid' after payment
      paymentReference: paymentRef,
      flutterwaveRef: paymentResult.data.flw_ref,
      discountPercentage: plan.discountPercentage,
      benefits: {
        airtimeDiscount: plan.discountPercentage,
        dataDiscount: plan.discountPercentage,
        billPaymentDiscount: plan.discountPercentage
      }
      };
      
      console.log('🔍 SUBSCRIPTION DEBUG: Subscription data to save:', JSON.stringify(subscriptionData, null, 2));
      
      subscription = new Subscription(subscriptionData);
    }

    console.log('🔍 SUBSCRIPTION DEBUG: Subscription object created:', JSON.stringify(subscription, null, 2));
    
    try {
      await subscription.save();
      console.log('✅ SUBSCRIPTION DEBUG: Subscription record saved successfully');
      console.log('✅ SUBSCRIPTION DEBUG: Saved subscription ID:', subscription._id);
    } catch (dbError) {
      console.error('❌ SUBSCRIPTION ERROR: Failed to save subscription:', dbError);
      console.error('❌ SUBSCRIPTION ERROR: Database error details:', {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code,
        keyPattern: dbError.keyPattern,
        keyValue: dbError.keyValue,
        errors: dbError.errors
      });
      
      // Check for specific validation errors
      if (dbError.name === 'ValidationError') {
        const validationErrors = Object.keys(dbError.errors).map(key => ({
          field: key,
          message: dbError.errors[key].message,
          value: dbError.errors[key].value,
          kind: dbError.errors[key].kind,
          path: dbError.errors[key].path
        }));
        console.error('❌ SUBSCRIPTION ERROR: Validation errors:', validationErrors);
        
        // Log the exact missing required fields
        const missingFields = validationErrors.filter(err => err.kind === 'required');
        if (missingFields.length > 0) {
          console.error('❌ SUBSCRIPTION ERROR: Missing required fields:', missingFields.map(f => f.field));
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save subscription record',
        error: 'Database error saving subscription',
        error_type: dbError.name,
        debug: process.env.NODE_ENV === 'development' ? {
          message: dbError.message,
          name: dbError.name,
          code: dbError.code,
          validation_errors: dbError.errors
        } : undefined
      });
    }

    // Create or update transaction record
    console.log('🔍 SUBSCRIPTION DEBUG: Creating/updating transaction record...');
    
    let transaction;
    
    if (pendingSubscription) {
      // Update existing transaction with new payment details
      console.log('🔍 SUBSCRIPTION DEBUG: Updating existing transaction');
      transaction = await Transaction.findOne({ tx_ref: pendingSubscription.paymentReference });
      if (transaction) {
        transaction.tx_ref = paymentRef;
        transaction.flutterwave_transaction_id = paymentResult.data.flw_ref;
        transaction.payment_link = paymentResult.data.link;
        transaction.updatedAt = new Date();
      } else {
        // Create new transaction if not found
        console.log('🔍 SUBSCRIPTION DEBUG: Creating new transaction for pending subscription');
        const idempotencyKey = `SUB_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const transactionData = {
          tx_ref: paymentRef,
          userId: user._id.toString(),
          phone: user.phone,
          biller_code: 'SUBSCRIPTION',
          fullAmount: plan.amount,
          userAmount: plan.amount,
          isSubscriber: false,
          status: 'initialized',
          flutterwave_transaction_id: paymentResult.data.flw_ref,
          idempotency_key: idempotencyKey,
          biller_reference: paymentRef,
          error_logs: []
        };
        
        transaction = new Transaction(transactionData);
      }
    } else {
      // Create new transaction record
      console.log('🔍 SUBSCRIPTION DEBUG: Creating new transaction record');
      
      // Generate idempotency key for transaction
      const idempotencyKey = `SUB_${user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const transactionData = {
        tx_ref: paymentRef,
        userId: user._id.toString(),
        phone: user.phone, // User phone is already validated above
        biller_code: 'SUBSCRIPTION', // Use subscription as biller code
        fullAmount: plan.amount,
        userAmount: plan.amount,
        isSubscriber: false, // Will be updated after payment
        status: 'initialized', // Use valid status from enum
        flutterwave_transaction_id: paymentResult.data.flw_ref,
        idempotency_key: idempotencyKey, // Required field
        biller_reference: paymentRef, // Optional but useful
        error_logs: [] // Initialize empty error logs
      };
      
      console.log('🔍 SUBSCRIPTION DEBUG: Transaction data to save:', JSON.stringify(transactionData, null, 2));
      
      transaction = new Transaction(transactionData);
    }

    console.log('🔍 SUBSCRIPTION DEBUG: Transaction object created:', JSON.stringify(transaction, null, 2));
    
    try {
      await transaction.save();
      console.log('✅ SUBSCRIPTION DEBUG: Transaction record saved successfully');
      console.log('✅ SUBSCRIPTION DEBUG: Saved transaction ID:', transaction._id);
    } catch (dbError) {
      console.error('❌ SUBSCRIPTION ERROR: Failed to save transaction:', dbError);
      console.error('❌ SUBSCRIPTION ERROR: Database error details:', {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code,
        keyPattern: dbError.keyPattern,
        keyValue: dbError.keyValue,
        errors: dbError.errors
      });
      
      // Check for specific validation errors
      if (dbError.name === 'ValidationError') {
        const validationErrors = Object.keys(dbError.errors).map(key => ({
          field: key,
          message: dbError.errors[key].message,
          value: dbError.errors[key].value,
          kind: dbError.errors[key].kind,
          path: dbError.errors[key].path
        }));
        console.error('❌ SUBSCRIPTION ERROR: Transaction validation errors:', validationErrors);
        
        // Log the exact missing required fields
        const missingFields = validationErrors.filter(err => err.kind === 'required');
        if (missingFields.length > 0) {
          console.error('❌ SUBSCRIPTION ERROR: Missing required fields:', missingFields.map(f => f.field));
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to save transaction record',
        error: 'Database error saving transaction',
        error_type: dbError.name,
        debug: process.env.NODE_ENV === 'development' ? {
          message: dbError.message,
          name: dbError.name,
          code: dbError.code,
          validation_errors: dbError.errors
        } : undefined
      });
    }

    console.log('✅ Debug: Subscription payment session created successfully:', {
      payment_ref: paymentRef,
      amount: plan.amount,
      user_email: user.email
    });

    res.json({
      success: true,
      message: 'Subscription payment session created successfully',
      data: {
        payment_link: paymentResult.data.link,
        payment_reference: paymentRef,
        amount: plan.amount,
        plan_type: planType,
        duration: plan.duration,
        discount_percentage: plan.discountPercentage,
        subscription_id: subscription._id,
        transaction_id: transaction._id
      }
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR in purchaseSubscription:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      type: typeof error,
      constructor: error.constructor?.name
    });
    
    // Check if it's a specific type of error
    let errorMessage = 'Failed to create subscription payment session';
    let errorDetails = {};
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Invalid subscription data provided';
      errorDetails = { validation_errors: error.errors };
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format provided';
      errorDetails = { cast_error: error.message };
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate subscription detected';
      errorDetails = { duplicate_key: error.keyValue };
    } else if (error.message && error.message.includes('Flutterwave')) {
      errorMessage = 'Payment gateway error';
      errorDetails = { gateway_error: error.message };
    } else if (error.message && error.message.includes('Database')) {
      errorMessage = 'Database connection error';
      errorDetails = { database_error: error.message };
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      error_type: error.name || 'UnknownError',
      debug: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name,
        code: error.code,
        details: errorDetails
      } : undefined
    });
  }
};

/**
 * Verify subscription payment
 * GET /api/subscription/verify/:payment_ref
 */
const verifySubscriptionPayment = async (req, res) => {
  try {
    const { payment_ref } = req.params;
    const user = req.user;

    console.log('🔍 Debug: verifySubscriptionPayment called for payment_ref:', payment_ref, 'for user:', user.email);

    // Find the subscription by payment reference
    const subscription = await Subscription.findOne({
      paymentReference: payment_ref,
      user: user._id
    });

    if (!subscription) {
      console.log('❌ Debug: Subscription not found for payment_ref:', payment_ref);
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Verify payment with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(payment_ref);

      if (!verificationResult.success) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

    const paymentData = verificationResult.data;

    // Check if payment was successful
    if (paymentData.status === 'successful') {
      // Update subscription status
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.paymentDetails = paymentData;
      subscription.paidAt = new Date();
      await subscription.save();

      // Update user subscription status
      await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
        subscriptionDate: subscription.startDate,
        subscriptionExpiry: subscription.endDate
      });

      // Update transaction status
      await Transaction.findOneAndUpdate(
        { tx_ref: payment_ref },
        {
          status: 'paid', // Use correct status from enum
          flutterwave_transaction_id: paymentData.id,
          biller_reference: payment_ref,
          updatedAt: new Date()
        }
      );

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
          subscription_id: subscription._id,
          status: 'active',
          amount: subscription.amount,
          plan_type: subscription.planType,
          duration: subscription.duration,
          discount_percentage: subscription.discountPercentage,
          start_date: subscription.startDate,
          end_date: subscription.endDate,
          days_remaining: subscription.getDaysRemaining()
        }
      });
    } else {
      // Payment failed or cancelled
      subscription.status = 'cancelled';
      subscription.paymentStatus = 'failed';
      subscription.paymentDetails = paymentData;
      await subscription.save();

      // Update transaction status
      await Transaction.findOneAndUpdate(
        { txRef: payment_ref },
        {
          status: 'failed',
          paymentDetails: paymentData,
          failedAt: new Date()
        }
      );

      res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        data: {
          subscription_id: subscription._id,
          status: 'failed',
          payment_status: paymentData.status,
          amount: subscription.amount
        }
      });
    }
  } catch (error) {
    console.error('Verify subscription payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get user's subscription status
 * GET /api/subscription/status
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;

    // Get active subscription
    const activeSubscription = await Subscription.getActiveSubscription(user._id);

    if (!activeSubscription) {
      return res.json({
        success: true,
        message: 'No active subscription found',
        data: {
          hasActiveSubscription: false,
          subscription: null
        }
      });
    }

    res.json({
      success: true,
      message: 'Subscription status fetched successfully',
      data: {
        hasActiveSubscription: true,
        subscription: {
          id: activeSubscription._id,
          plan_type: activeSubscription.planType,
          amount: activeSubscription.amount,
          duration: activeSubscription.duration,
          discount_percentage: activeSubscription.discountPercentage,
          start_date: activeSubscription.startDate,
          end_date: activeSubscription.endDate,
          days_remaining: activeSubscription.getDaysRemaining(),
          benefits: activeSubscription.benefits,
          status: activeSubscription.status
        }
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get subscription history
 * GET /api/subscription/history
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;

    const subscriptions = await Subscription.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Subscription.countDocuments({ user: user._id });

    res.json({
      success: true,
      message: 'Subscription history fetched successfully',
      data: {
        subscriptions,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_subscriptions: total,
          has_next: page * limit < total,
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Manually activate subscription (for testing or webhook failures)
 * POST /api/subscription/manual-activate
 * Body: { payment_ref }
 */
const manualActivateSubscription = async (req, res) => {
  try {
    const { payment_ref } = req.body;
    const user = req.user;

    console.log('🔧 Manual subscription activation requested:', {
      payment_ref,
      user_email: user.email
    });

    // Find the subscription by payment reference
    const subscription = await Subscription.findOne({
      paymentReference: payment_ref,
      user: user._id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found for this payment reference'
      });
    }

    if (subscription.status === 'active' && subscription.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Subscription is already active',
        data: {
          subscription_id: subscription._id,
          status: 'active',
          amount: subscription.amount,
          plan_type: subscription.planType,
          duration: subscription.duration,
          discount_percentage: subscription.discountPercentage,
          start_date: subscription.startDate,
          end_date: subscription.endDate,
          days_remaining: subscription.getDaysRemaining()
        }
      });
    }

    // Verify payment with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(payment_ref);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    const paymentData = verificationResult.data;

    // Check if payment was successful
    if (paymentData.status === 'successful') {
      // Update subscription status
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.paymentDetails = paymentData;
      subscription.paidAt = new Date();
      await subscription.save();

      // Update user subscription status
      await User.findByIdAndUpdate(user._id, {
        isSubscribed: true,
        subscriptionDate: subscription.startDate,
        subscriptionExpiry: subscription.endDate
      });

      // Update transaction status
      await Transaction.findOneAndUpdate(
        { tx_ref: payment_ref },
        {
          status: 'paid', // Use correct status from enum
          flutterwave_transaction_id: paymentData.id,
          biller_reference: payment_ref,
          updatedAt: new Date()
        }
      );

      console.log('✅ Manual subscription activation successful:', {
        subscription_id: subscription._id,
        user_email: user.email,
        payment_ref
      });

      res.json({
        success: true,
        message: 'Subscription activated successfully',
        data: {
          subscription_id: subscription._id,
          status: 'active',
          amount: subscription.amount,
          plan_type: subscription.planType,
          duration: subscription.duration,
          discount_percentage: subscription.discountPercentage,
          start_date: subscription.startDate,
          end_date: subscription.endDate,
          days_remaining: subscription.getDaysRemaining()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment was not successful',
        data: {
          subscription_id: subscription._id,
          status: 'failed',
          payment_status: paymentData.status,
          amount: subscription.amount
        }
      });
    }
  } catch (error) {
    console.error('Manual subscription activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  purchaseSubscription,
  verifySubscriptionPayment,
  getSubscriptionStatus,
  getSubscriptionHistory,
  manualActivateSubscription
};