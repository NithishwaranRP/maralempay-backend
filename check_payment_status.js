/**
 * Check Payment Status Script
 * This script checks the status of a payment and attempts to process it
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'https://maralempay-backend.onrender.com';

async function checkPaymentStatus(txRef) {
  console.log('🔍 Checking payment status...');
  console.log('TX Ref:', txRef);
  
  try {
    // Step 1: Check payment status from your backend
    console.log('\n📋 Step 1: Checking payment status from backend...');
    const statusResponse = await axios.get(`${BACKEND_URL}/api/payments/status/${txRef}`);
    
    console.log('✅ Backend response:', statusResponse.data);
    
    if (statusResponse.data.success) {
      console.log('📊 Payment Status:', statusResponse.data.status);
      console.log('💰 Amount:', statusResponse.data.amount);
      console.log('📞 Phone:', statusResponse.data.phone);
      
      if (statusResponse.data.status === 'paid' && statusResponse.data.bill_status !== 'delivered') {
        console.log('\n🚨 Payment is paid but bill not delivered!');
        console.log('💡 This indicates a bill payment API failure');
        console.log('🔧 Likely causes:');
        console.log('   1. IP whitelisting issue on Flutterwave');
        console.log('   2. Invalid biller code or item code');
        console.log('   3. Insufficient Flutterwave balance');
        console.log('   4. Network connectivity issues');
        
        // Try to manually trigger bill delivery
        console.log('\n🔄 Attempting to manually trigger bill delivery...');
        try {
          const processResponse = await axios.post(`${BACKEND_URL}/api/payments/verify`, {
            tx_ref: txRef
          });
          console.log('✅ Manual processing result:', processResponse.data);
        } catch (processError) {
          console.log('❌ Manual processing failed:', processError.response?.data || processError.message);
        }
      } else if (statusResponse.data.status === 'delivered') {
        console.log('✅ Payment and bill delivery completed successfully!');
      } else {
        console.log('⏳ Payment status:', statusResponse.data.status);
      }
    } else {
      console.log('❌ Backend check failed:', statusResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking payment status:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('💡 Payment not found in backend database');
      console.log('🔧 This could mean:');
      console.log('   1. Webhook was not received');
      console.log('   2. Payment verification failed');
      console.log('   3. Database connection issues');
    }
  }
}

// Get transaction reference from command line arguments
const txRef = process.argv[2];

if (!txRef) {
  console.log('❌ Please provide a transaction reference');
  console.log('Usage: node check_payment_status.js <tx_ref>');
  console.log('Example: node check_payment_status.js 000004250929111252659599037405');
  process.exit(1);
}

// Check the payment status
checkPaymentStatus(txRef).catch(console.error);
