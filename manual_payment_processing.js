/**
 * Manual Payment Processing Script
 * This script manually processes a successful payment that wasn't delivered
 */

const axios = require('axios');

// Configuration
const FLW_SECRET_KEY = 'FLWSECK_TEST-7c0192a0a7e2edc41047c2f1fef52e5d-X';
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';
const BACKEND_URL = 'https://maralempay-backend.onrender.com';

const headers = {
  'Authorization': `Bearer ${FLW_SECRET_KEY}`,
  'Content-Type': 'application/json'
};

async function processPayment(transactionId) {
  console.log('🔍 Processing payment manually...');
  console.log('Transaction ID:', transactionId);
  
  try {
    // Step 1: Verify payment with Flutterwave using tx_ref
    console.log('\n📋 Step 1: Verifying payment with Flutterwave...');
    const verifyResponse = await axios.get(`${FLW_BASE_URL}/transactions/verify_by_reference`, { 
      headers,
      params: { tx_ref: transactionId }
    });
    
    if (verifyResponse.data.status !== 'success') {
      console.log('❌ Payment verification failed:', verifyResponse.data.message);
      return;
    }
    
    const paymentData = verifyResponse.data.data;
    console.log('✅ Payment verified successfully');
    console.log('💰 Amount:', paymentData.amount);
    console.log('📞 Phone:', paymentData.customer?.phone);
    console.log('📧 Email:', paymentData.customer?.email);
    console.log('🔑 TX Ref:', paymentData.tx_ref);
    
    // Step 2: Call your backend to process the payment
    console.log('\n📱 Step 2: Processing payment through backend...');
    const backendResponse = await axios.post(`${BACKEND_URL}/api/payments/verify`, {
      transaction_id: transactionId,
      tx_ref: paymentData.tx_ref
    });
    
    console.log('✅ Backend response:', backendResponse.data);
    
    if (backendResponse.data.success) {
      console.log('🎉 Payment processed successfully!');
      console.log('📊 Status:', backendResponse.data.status);
      if (backendResponse.data.transaction) {
        console.log('📋 Transaction:', backendResponse.data.transaction);
      }
    } else {
      console.log('❌ Backend processing failed:', backendResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error processing payment:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication failed - check your Flutterwave secret key');
    } else if (error.response?.status === 403) {
      console.log('🚫 Access forbidden - check IP whitelisting settings');
    }
  }
}

// Get transaction ID from command line arguments
const transactionId = process.argv[2];

if (!transactionId) {
  console.log('❌ Please provide a transaction ID');
  console.log('Usage: node manual_payment_processing.js <transaction_id>');
  console.log('Example: node manual_payment_processing.js 1234567890');
  process.exit(1);
}

// Process the payment
processPayment(transactionId).catch(console.error);
