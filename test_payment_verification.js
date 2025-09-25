#!/usr/bin/env node

/**
 * Flutterwave Payment Verification Test Script
 * 
 * Usage:
 * node test_payment_verification.js <transaction_id> [live|test]
 * 
 * Examples:
 * node test_payment_verification.js 86172870 live
 * node test_payment_verification.js TX17579308070491706 test
 */

const https = require('https');

// Configuration
const config = {
  test: {
    secretKey: process.env.FLUTTERWAVE_TEST_SECRET_KEY || 'FLWSECK_TEST-...',
    baseUrl: 'https://api.flutterwave.com/v3'
  },
  live: {
    secretKey: process.env.FLUTTERWAVE_LIVE_SECRET_KEY || 'FLWSECK-...',
    baseUrl: 'https://api.flutterwave.com/v3'
  }
};

/**
 * Make HTTP request to Flutterwave API
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: response
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Verify payment by transaction ID
 */
async function verifyPaymentByTransactionId(transactionId, environment = 'live') {
  const env = config[environment];
  if (!env) {
    throw new Error('Invalid environment. Use "live" or "test"');
  }
  
  const url = `${env.baseUrl}/transactions/${transactionId}/verify`;
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.secretKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log(`🔍 Verifying payment with Transaction ID: ${transactionId}`);
  console.log(`🌐 Environment: ${environment.toUpperCase()}`);
  console.log(`📡 URL: ${url}`);
  console.log(`🔑 Using Secret Key: ${env.secretKey.substring(0, 15)}...`);
  console.log('---');
  
  try {
    const response = await makeRequest(url, options);
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log(`📋 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.status === 'success') {
      const paymentData = response.data.data;
      const status = paymentData.status;
      
      console.log('---');
      console.log(`✅ Payment Status: ${status}`);
      
      switch (status) {
        case 'successful':
          console.log('🎉 Payment successful - ready to trigger bill delivery');
          console.log(`💰 Amount: ${paymentData.currency} ${paymentData.amount}`);
          console.log(`📱 Customer: ${paymentData.customer.name} (${paymentData.customer.phone_number})`);
          break;
          
        case 'pending':
          console.log('⏳ Payment pending - will retry verification later');
          break;
          
        case 'failed':
        case 'cancelled':
          console.log('❌ Payment failed or cancelled');
          break;
          
        default:
          console.log(`⚠️ Unknown payment status: ${status}`);
      }
      
      return {
        success: true,
        status: status,
        shouldTriggerBill: status === 'successful',
        shouldRetry: status === 'pending',
        data: paymentData
      };
    } else {
      console.log('❌ Verification failed');
      return {
        success: false,
        error: response.data.message || 'Verification failed'
      };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node test_payment_verification.js <transaction_id> [live|test]');
    console.log('');
    console.log('Examples:');
    console.log('  node test_payment_verification.js 86172870 live');
    console.log('  node test_payment_verification.js TX17579308070491706 test');
    process.exit(1);
  }
  
  const transactionId = args[0];
  const environment = args[1] || 'live';
  
  console.log('🧪 Flutterwave Payment Verification Test');
  console.log('=====================================');
  console.log('');
  
  const result = await verifyPaymentByTransactionId(transactionId, environment);
  
  console.log('');
  console.log('📋 Test Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success && result.shouldTriggerBill) {
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Trigger bill delivery API');
    console.log('2. Update transaction status to "completed"');
    console.log('3. Send success notification to user');
  } else if (result.shouldRetry) {
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('1. Wait 2-5 minutes');
    console.log('2. Retry verification');
    console.log('3. Repeat until status changes');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  verifyPaymentByTransactionId,
  config
};
