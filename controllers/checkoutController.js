const axios = require('axios');
const crypto = require('crypto');

// Flutterwave configuration
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY;
const FLW_BASE_URL = process.env.FLW_BASE_URL;

// Initialize Flutterwave payment
const initializePayment = async (req, res) => {
  try {
    const { amount, currency = 'NGN', customer, customizations } = req.body;
    const user = req.user; // Get authenticated user

    // Validate required fields
    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    // Use customer data from request or fallback to authenticated user
    const customerData = customer || {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone || ''
    };

    // Ensure customer email exists
    if (!customerData.email) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    // Generate unique transaction reference
    const txRef = `MARALEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare payment data
    const paymentData = {
      tx_ref: txRef,
      amount: amount,
      currency: currency,
      redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
      customer: {
        email: customerData.email,
        phonenumber: customerData.phone || '',
        name: customerData.name || ''
      },
      customizations: {
        title: customizations?.title || 'MaralemPay Payment',
        description: customizations?.description || 'Payment for services',
        logo: customizations?.logo || 'https://maralempay.com/logo.png'
      },
      meta: {
        user_id: user._id || '',
        order_id: customer?.orderId || ''
      }
    };

    // Make request to Flutterwave
    const response = await axios.post(
      `${FLW_BASE_URL}/payments`,
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.status === 'success') {
      res.json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          checkout_url: response.data.data.link,
          tx_ref: txRef,
          amount: amount,
          currency: currency
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
        error: response.data.message || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.response?.data?.message || error.message
    });
  }
};

// Verify payment callback
const verifyPayment = async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.query;

    if (!transaction_id || !tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and transaction reference are required'
      });
    }

    // Verify payment with Flutterwave
    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/${transaction_id}/verify`,
      {
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.status === 'success') {
      const transaction = response.data.data;
      
      // Check if payment was successful
      if (transaction.status === 'successful' && transaction.amount === transaction.charged_amount) {
        // Here you can update your database with the successful payment
        // For example: updateOrderStatus(tx_ref, 'completed');
        
        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            transaction_id: transaction.id,
            tx_ref: transaction.tx_ref,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            customer: transaction.customer,
            created_at: transaction.created_at
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed',
          data: {
            status: transaction.status,
            amount: transaction.amount,
            charged_amount: transaction.charged_amount
          }
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to verify payment',
        error: response.data.message || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.response?.data?.message || error.message
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Get transaction details from Flutterwave
    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/verify_by_reference`,
      {
        headers: {
          'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          tx_ref: tx_ref
        }
      }
    );

    if (response.data && response.data.status === 'success') {
      const transaction = response.data.data;
      
      res.json({
        success: true,
        message: 'Payment status retrieved successfully',
        data: {
          transaction_id: transaction.id,
          tx_ref: transaction.tx_ref,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          customer: transaction.customer,
          created_at: transaction.created_at
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Transaction not found',
        error: response.data.message || 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Get payment status error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.response?.data?.message || error.message
    });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  getPaymentStatus
};
