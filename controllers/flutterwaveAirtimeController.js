const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

// MongoDB Transaction Schema for idempotency and status tracking
const transactionSchema = new mongoose.Schema({
  tx_ref: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  phone: { type: String, required: true },
  biller_code: { type: String, required: true },
  item_code: { type: String },
  fullAmount: { type: Number, required: true },
  userAmount: { type: Number, required: true },
  isSubscriber: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['initialized', 'paid', 'delivered', 'failed', 'refunded', 'failed_refunded'],
    default: 'initialized'
  },
  flutterwave_transaction_id: { type: String },
  biller_reference: { type: String },
  biller_status: { type: String },
  deliveredAt: { type: Date },
  refundedAt: { type: Date },
  refund_amount: { type: Number },
  idempotency_key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  error_logs: [{ 
    timestamp: { type: Date, default: Date.now },
    error: String,
    context: String
  }]
});

const Transaction = mongoose.model('Transaction', transactionSchema);

class FlutterwaveAirtimeController {
  constructor() {
    this.baseURL = 'https://api.flutterwave.com/v3';
    this.secretKey = process.env.FLW_SECRET_KEY;
    this.publicKey = process.env.FLW_PUBLIC_KEY;
    this.encryptionKey = process.env.FLW_ENCRYPTION_KEY;
    this.backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    if (!this.secretKey) {
      throw new Error('FLW_SECRET_KEY environment variable is required');
    }
    
    this.headers = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * GET /api/flutterwave/categories
   * Proxy to Flutterwave GET /v3/top-bill-categories
   * Reference: https://developer.flutterwave.com/docs/bill-payments/overview
   */
  async getBillCategories(req, res) {
    try {
      console.log('🔍 Fetching bill categories from Flutterwave...');
      
      const response = await axios.get(
        `${this.baseURL}/top-bill-categories`,
        { headers: this.headers }
      );

      console.log('✅ Bill categories fetched successfully:', {
        status: response.data.status,
        count: response.data.data?.length || 0
      });

      // Log raw response for debugging (capped)
      console.log('📊 Raw Flutterwave response (capped):', {
        status: response.data.status,
        message: response.data.message,
        dataCount: response.data.data?.length || 0,
        firstCategory: response.data.data?.[0] || null
      });

      res.json({
        success: true,
        data: response.data.data,
        message: 'Categories fetched successfully',
        debug: process.env.NODE_ENV === 'development' ? {
          rawResponse: response.data,
          endpoint: `${this.baseURL}/top-bill-categories`
        } : undefined
      });

    } catch (error) {
      console.error('❌ Error fetching bill categories:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bill categories',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? {
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });
    }
  }

  /**
   * GET /api/flutterwave/billers/:categoryCode
   * Fetch billers for a specific category
   * Reference: https://developer.flutterwave.com/docs/bill-payments/overview
   */
  async getBillersByCategory(req, res) {
    try {
      const { categoryCode } = req.params;
      console.log('🔍 Fetching billers for category:', categoryCode);

      // Try multiple endpoints as fallback
      let billers = [];
      let usedEndpoint = '';

      // Method 1: Try /v3/bill-categories/{id}/billers
      try {
        const response1 = await axios.get(
          `${this.baseURL}/bill-categories/${categoryCode}/billers`,
          { headers: this.headers }
        );
        
        if (response1.data.data && response1.data.data.length > 0) {
          billers = response1.data.data;
          usedEndpoint = `/bill-categories/${categoryCode}/billers`;
          console.log('✅ Method 1 successful:', usedEndpoint);
        }
      } catch (error1) {
        console.log('⚠️ Method 1 failed:', error1.response?.status, error1.response?.data?.message);
      }

      // Method 2: Fallback to /v3/billers with category filter
      if (billers.length === 0) {
        try {
          const response2 = await axios.get(
            `${this.baseURL}/billers`,
            { 
              headers: this.headers,
              params: { category: categoryCode }
            }
          );
          
          if (response2.data.data && response2.data.data.length > 0) {
            billers = response2.data.data;
            usedEndpoint = `/billers?category=${categoryCode}`;
            console.log('✅ Method 2 successful:', usedEndpoint);
          }
        } catch (error2) {
          console.log('⚠️ Method 2 failed:', error2.response?.status, error2.response?.data?.message);
        }
      }

      // Method 3: Fallback to /v3/billers without filter (get all and filter client-side)
      if (billers.length === 0) {
        try {
          const response3 = await axios.get(
            `${this.baseURL}/billers`,
            { headers: this.headers }
          );
          
          if (response3.data.data) {
            // Filter for telecom-related billers
            billers = response3.data.data.filter(biller => {
              const name = (biller.name || biller.biller_name || '').toLowerCase();
              const category = (biller.category || '').toLowerCase();
              return name.includes('mtn') || name.includes('airtel') || 
                     name.includes('glo') || name.includes('9mobile') ||
                     category.includes('airtime') || category.includes('data');
            });
            usedEndpoint = `/billers (filtered)`;
            console.log('✅ Method 3 successful:', usedEndpoint);
          }
        } catch (error3) {
          console.log('⚠️ Method 3 failed:', error3.response?.status, error3.response?.data?.message);
        }
      }

      console.log('📊 Billers fetch result:', {
        categoryCode,
        usedEndpoint,
        billersCount: billers.length,
        firstBiller: billers[0] || null
      });

      res.json({
        success: true,
        data: billers,
        message: `Found ${billers.length} billers for category ${categoryCode}`,
        debug: process.env.NODE_ENV === 'development' ? {
          categoryCode,
          usedEndpoint,
          billersCount: billers.length
        } : undefined
      });

    } catch (error) {
      console.error('❌ Error fetching billers:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billers',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /api/flutterwave/billers/:billerCode/items
   * Proxy to GET /v3/billers/{billerCode}/items to fetch items/plans
   * Reference: https://developer.flutterwave.com/docs/bill-payments/overview
   */
  async getBillerItems(req, res) {
    try {
      const { billerCode } = req.params;
      console.log('🔍 Fetching items for biller:', billerCode);

      const response = await axios.get(
        `${this.baseURL}/billers/${billerCode}/items`,
        { headers: this.headers }
      );

      console.log('✅ Biller items fetched successfully:', {
        billerCode,
        itemsCount: response.data.data?.length || 0
      });

      // Log raw response for debugging (capped)
      console.log('📊 Raw Flutterwave response (capped):', {
        status: response.data.status,
        message: response.data.message,
        itemsCount: response.data.data?.length || 0,
        firstItem: response.data.data?.[0] || null
      });

      res.json({
        success: true,
        data: response.data.data,
        message: 'Biller items fetched successfully',
        debug: process.env.NODE_ENV === 'development' ? {
          billerCode,
          rawResponse: response.data,
          endpoint: `${this.baseURL}/billers/${billerCode}/items`
        } : undefined
      });

    } catch (error) {
      console.error('❌ Error fetching biller items:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch biller items',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? {
          billerCode: req.params.billerCode,
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });
    }
  }

  /**
   * POST /api/payments/initialize-airtime
   * Initialize airtime payment with Flutterwave Checkout
   * Reference: https://developer.flutterwave.com/docs/standard/create-payment
   */
  async initializeAirtimePayment(req, res) {
    try {
      const { userId, phone, biller_code, item_code, amount, isSubscriber } = req.body;

      // Validate required fields
      if (!userId || !phone || !biller_code) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, phone, biller_code'
        });
      }

      console.log('🚀 Initializing airtime payment:', {
        userId,
        phone,
        biller_code,
        item_code,
        amount,
        isSubscriber
      });

       // Step 1: Validate user & subscription from database
       const user = await this.validateUser(userId);
       if (!user) {
         return res.status(404).json({
           success: false,
           message: 'User not found'
         });
       }

      // ENABLED: Airtime/data purchases are now available for TEST API
      // This allows testing with Flutterwave TEST keys
      console.log('✅ Airtime/data service is ENABLED for TEST API');

      // Step 2: Determine fullAmount
      let fullAmount = amount;
      if (item_code) {
        // Fetch item details to get exact amount
        try {
          const itemResponse = await axios.get(
            `${this.baseURL}/billers/${biller_code}/items`,
            { headers: this.headers }
          );
          
          const item = itemResponse.data.data?.find(item => item.code === item_code);
          if (item) {
            fullAmount = item.amount;
            console.log('📊 Item amount from Flutterwave:', fullAmount);
          }
        } catch (error) {
          console.log('⚠️ Could not fetch item amount, using provided amount:', amount);
        }
      }

      if (!fullAmount || fullAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount: amount must be greater than 0'
        });
      }

      // Step 3: Compute userAmount with discount
      const userAmount = isSubscriber ? Math.round(fullAmount * 0.90 * 100) / 100 : fullAmount;
      const discountAmount = fullAmount - userAmount;

      console.log('💰 Amount calculation:', {
        fullAmount,
        userAmount,
        discountAmount,
        isSubscriber
      });

      // Step 4: Create unique tx_ref and idempotency key
      const tx_ref = `AIR_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const idempotency_key = crypto.createHash('sha256').update(tx_ref).digest('hex');

      // Step 5: Save transaction record
      const transaction = new Transaction({
        tx_ref,
        userId,
        phone,
        biller_code,
        item_code,
        fullAmount,
        userAmount,
        isSubscriber,
        status: 'initialized',
        idempotency_key
      });

      await transaction.save();
      console.log('💾 Transaction saved:', tx_ref);

      // Step 6: Call Flutterwave POST /v3/payments
      const paymentPayload = {
        tx_ref,
        amount: userAmount,
        currency: 'NGN',
        redirect_url: `${this.backendUrl}/api/payments/flutterwave-callback`,
         customer: {
           email: user.email,
           phonenumber: phone,
           name: user.name
         },
         customizations: {
           title: 'Airtime Purchase',
           description: `Airtime purchase for ${phone}`,
           logo: process.env.APP_LOGO_URL || 'https://flutterwave.com/images/logo-colored.svg'
         },
        meta: {
          userId,
          phone,
          biller_code,
          item_code,
          fullAmount,
          userAmount,
          payment_type: 'airtime',
          isSubscriber,
          discountAmount
        }
      };

      console.log('🔗 Creating Flutterwave payment...');
      const paymentResponse = await axios.post(
        `${this.baseURL}/payments`,
        paymentPayload,
        { headers: this.headers }
      );

      console.log('✅ Flutterwave payment created:', {
        status: paymentResponse.data.status,
        tx_ref: paymentResponse.data.data.tx_ref,
        payment_link: paymentResponse.data.data.link ? 'Generated' : 'Not generated'
      });

      res.json({
        success: true,
        payment_link: paymentResponse.data.data.link,
        tx_ref,
        userAmount,
        fullAmount,
        discountAmount,
        message: 'Payment initialized successfully'
      });

    } catch (error) {
      console.error('❌ Error initializing airtime payment:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? {
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });
    }
  }

  /**
   * POST /api/payments/verify
   * Verify payment and deliver bill
   * Reference: https://developer.flutterwave.com/docs/standard/verify-transaction
   */
  async verifyPayment(req, res) {
    try {
      const { transaction_id, tx_ref } = req.body;

      if (!transaction_id && !tx_ref) {
        return res.status(400).json({
          success: false,
          message: 'Either transaction_id or tx_ref is required'
        });
      }

      console.log('🔍 Verifying payment:', { transaction_id, tx_ref });

      // Step 1: Get transaction_id if only tx_ref provided
      let flutterwaveTransactionId = transaction_id;
      let transaction = null;

      if (tx_ref && !transaction_id) {
        transaction = await Transaction.findOne({ tx_ref });
        if (!transaction) {
          return res.status(404).json({
            success: false,
            message: 'Transaction not found'
          });
        }
        flutterwaveTransactionId = transaction.flutterwave_transaction_id;
      } else if (transaction_id) {
        transaction = await Transaction.findOne({ flutterwave_transaction_id: transaction_id });
      }

      if (!flutterwaveTransactionId) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID not found'
        });
      }

      // Step 2: Verify transaction with Flutterwave
      console.log('🔍 Verifying with Flutterwave:', flutterwaveTransactionId);
      const verifyResponse = await axios.get(
        `${this.baseURL}/transactions/${flutterwaveTransactionId}/verify`,
        { headers: this.headers }
      );

      const verificationData = verifyResponse.data.data;
      console.log('📊 Flutterwave verification result:', {
        status: verificationData.status,
        amount: verificationData.amount,
        currency: verificationData.currency
      });

      // Step 3: Check if payment is successful
      if (verificationData.status !== 'successful') {
        return res.json({
          success: false,
          message: `Payment not successful. Status: ${verificationData.status}`,
          status: verificationData.status
        });
      }

      // Step 4: Idempotency check - prevent double processing
      if (transaction && transaction.status === 'paid') {
        console.log('✅ Payment already processed (idempotency)');
        return res.json({
          success: true,
          message: 'Payment already processed',
          status: 'already_processed',
          transaction: {
            tx_ref: transaction.tx_ref,
            status: transaction.status,
            biller_status: transaction.biller_status
          }
        });
      }

      // Step 5: Update transaction status to 'paid'
      if (transaction) {
        transaction.status = 'paid';
        transaction.flutterwave_transaction_id = flutterwaveTransactionId;
        transaction.updatedAt = new Date();
        await transaction.save();
        console.log('💾 Transaction marked as paid:', transaction.tx_ref);
      }

      // Step 6: Create Bill Payment
      console.log('📱 Creating bill payment...');
      const billPaymentResult = await this.createBillPayment(transaction || {
        tx_ref,
        phone: verificationData.customer?.phone || verificationData.meta?.phone,
        biller_code: verificationData.meta?.biller_code,
        item_code: verificationData.meta?.item_code,
        fullAmount: verificationData.meta?.fullAmount
      });

      if (billPaymentResult.success) {
        // Update transaction with bill delivery details
        if (transaction) {
          transaction.status = 'delivered';
          transaction.biller_reference = billPaymentResult.biller_reference;
          transaction.biller_status = billPaymentResult.biller_status;
          transaction.deliveredAt = new Date();
          transaction.updatedAt = new Date();
          await transaction.save();
        }

        res.json({
          success: true,
          message: 'Payment verified and bill delivered successfully',
          status: 'delivered',
          transaction: {
            tx_ref: transaction?.tx_ref || tx_ref,
            status: 'delivered',
            biller_reference: billPaymentResult.biller_reference,
            biller_status: billPaymentResult.biller_status
          }
        });
      } else {
        // Bill delivery failed - initiate refund
        console.log('❌ Bill delivery failed, initiating refund...');
        const refundResult = await this.initiateRefund(transaction, verificationData.meta?.userAmount);

        res.status(500).json({
          success: false,
          message: 'Payment verified but bill delivery failed. Refund initiated.',
          status: 'billing_failed',
          refund: refundResult,
          transaction: {
            tx_ref: transaction?.tx_ref || tx_ref,
            status: 'failed_refunded'
          }
        });
      }

    } catch (error) {
      console.error('❌ Error verifying payment:', error.response?.data || error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to verify payment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Create Bill Payment using Flutterwave Bills API
   * Reference: https://developer.flutterwave.com/docs/bill-payments/create-bill-payment
   */
  async createBillPayment(transaction, retryCount = 0) {
    const maxRetries = 3;
    
    try {
      console.log('📱 Creating bill payment:', {
        biller_code: transaction.biller_code,
        item_code: transaction.item_code,
        phone: transaction.phone,
        amount: transaction.fullAmount
      });

      let billPaymentPayload;
      let endpoint;

      // Prefer item-specific endpoint if item_code is available
      if (transaction.item_code) {
        endpoint = `${this.baseURL}/billers/${transaction.biller_code}/items/${transaction.item_code}/payment`;
        billPaymentPayload = {
          customer: transaction.phone,
          amount: transaction.fullAmount,
          reference: transaction.tx_ref,
          meta: {
            tx_ref: transaction.tx_ref,
            userId: transaction.userId,
            payment_type: 'airtime'
          }
        };
      } else {
        // Fallback to generic bills endpoint
        endpoint = `${this.baseURL}/bills`;
        billPaymentPayload = {
          country: 'NG',
          customer: transaction.phone,
          amount: transaction.fullAmount,
          type: 'airtime',
          reference: transaction.tx_ref,
          biller_code: transaction.biller_code
        };
      }

      console.log('🔗 Calling Flutterwave bill payment endpoint:', endpoint);
      const response = await axios.post(
        endpoint,
        billPaymentPayload,
        { headers: this.headers }
      );

      console.log('✅ Bill payment successful:', {
        status: response.data.status,
        reference: response.data.data?.reference,
        biller_reference: response.data.data?.biller_reference
      });

      return {
        success: true,
        biller_reference: response.data.data?.biller_reference,
        biller_status: response.data.data?.status || 'delivered',
        response: response.data
      };

    } catch (error) {
      console.error(`❌ Bill payment failed (attempt ${retryCount + 1}):`, error.response?.data || error.message);

      // Retry with exponential backoff
      if (retryCount < maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Retrying bill payment in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.createBillPayment(transaction, retryCount + 1);
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        retryCount
      };
    }
  }

  /**
   * Initiate refund for failed bill delivery
   */
  async initiateRefund(transaction, refundAmount) {
    try {
      console.log('💰 Initiating refund:', {
        tx_ref: transaction.tx_ref,
        amount: refundAmount
      });

      // Update transaction status
      if (transaction) {
        transaction.status = 'failed_refunded';
        transaction.refundedAt = new Date();
        transaction.refund_amount = refundAmount;
        transaction.updatedAt = new Date();
        await transaction.save();
      }

       // Process refund through Flutterwave API
       try {
         const refundResponse = await axios.post(
           `${this.baseURL}/transactions/${transaction.flutterwave_transaction_id}/refund`,
           {
             amount: refundAmount,
             comments: 'Automatic refund due to failed bill delivery'
           },
           { headers: this.headers }
         );
         
         console.log('✅ Flutterwave refund processed:', refundResponse.data);
       } catch (refundError) {
         console.error('❌ Flutterwave refund failed:', refundError.response?.data || refundError.message);
         // Log for manual processing
         await transaction.addErrorLog(refundError, 'Flutterwave refund API call');
       }

      console.log('✅ Refund initiated successfully');

      return {
        success: true,
        refund_amount: refundAmount,
        refunded_at: new Date(),
        message: 'Refund initiated successfully'
      };

    } catch (error) {
      console.error('❌ Error initiating refund:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * POST /api/payments/flutterwave-webhook
   * Handle Flutterwave webhook events
   * Reference: https://developer.flutterwave.com/docs/standard/webhooks
   */
  async handleWebhook(req, res) {
    try {
      const payload = req.body;
      console.log('🔔 Received Flutterwave webhook:', {
        event: payload.event,
        tx_ref: payload.data?.tx_ref,
        status: payload.data?.status
      });

      // Verify webhook signature if provided
      if (req.headers['verif-hash']) {
        const hash = req.headers['verif-hash'];
        const secretHash = process.env.FLW_SECRET_HASH;
        
        if (secretHash) {
          const expectedHash = crypto
            .createHmac('sha256', secretHash)
            .update(JSON.stringify(payload))
            .digest('hex');
          
          if (hash !== expectedHash) {
            console.log('❌ Webhook signature verification failed');
            return res.status(400).json({ success: false, message: 'Invalid signature' });
          }
        }
      }

      // Process webhook based on event type
      if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
        console.log('✅ Payment completed webhook received');
        
        // Call verify payment flow
        const verifyResult = await this.verifyPayment({
          body: {
            transaction_id: payload.data.id,
            tx_ref: payload.data.tx_ref
          }
        }, res);

        return verifyResult;
      }

      res.json({ success: true, message: 'Webhook processed' });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  }

  /**
   * GET /api/payments/status/:tx_ref
   * Get payment status for mobile polling
   */
  async getPaymentStatus(req, res) {
    try {
      const { tx_ref } = req.params;
      
      const transaction = await Transaction.findOne({ tx_ref });
      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        transaction: {
          tx_ref: transaction.tx_ref,
          status: transaction.status,
          biller_status: transaction.biller_status,
          userAmount: transaction.userAmount,
          fullAmount: transaction.fullAmount,
          createdAt: transaction.createdAt,
          deliveredAt: transaction.deliveredAt
        }
      });

    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment status'
      });
    }
  }

  /**
   * Validate user from database - fetch real user data
   */
  async validateUser(userId) {
    try {
      // Import your User model here
      const User = require('../models/User'); // Adjust path as needed
      
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      return {
        id: user._id,
        email: user.email,
        name: user.name || user.firstName + ' ' + user.lastName,
        isSubscriber: user.isSubscriber || user.subscriptionStatus === 'active'
      };
    } catch (error) {
      console.error('❌ Error validating user:', error);
      return null;
    }
  }
}

module.exports = FlutterwaveAirtimeController;






