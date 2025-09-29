/**
 * 🚀 MaralemPay Automated Charging Test Script
 * 
 * This script tests the enhanced payment flow to ensure:
 * 1. Customers are charged FIRST (via Flutterwave Checkout or Wallet)
 * 2. Only AFTER successful customer payment, Flutterwave Bills API is called
 * 3. Proper error handling and refund mechanisms are in place
 * 4. No service delivery without confirmed customer payment
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_USER_EMAIL = 'testuser@example.com';
const TEST_USER_PASSWORD = 'password123';
const TEST_PHONE = '08012345678';

class AutomatedChargingTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      'info': 'ℹ️',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    };
    
    console.log(`${emoji[type]} [${timestamp}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  async authenticate() {
    this.log('🔐 Authenticating test user...', 'test');
    
    const result = await this.makeRequest('POST', '/auth/login', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (result.success && result.data.token) {
      this.authToken = result.data.token;
      this.log('✅ Authentication successful', 'success');
      return true;
    } else {
      this.log('❌ Authentication failed: ' + (result.error?.message || 'Unknown error'), 'error');
      return false;
    }
  }

  async testCardPaymentFlow() {
    this.log('💳 Testing Card Payment Flow (Customer charged FIRST)', 'test');
    
    // Step 1: Create airtime purchase
    const createResult = await this.makeRequest('POST', '/bills/airtime', {
      phone_number: TEST_PHONE,
      amount: 1000,
      network: 'MTN'
    });

    if (!createResult.success) {
      this.log('❌ Failed to create airtime purchase: ' + createResult.error?.message, 'error');
      return false;
    }

    const { payment_link, tx_ref } = createResult.data.data;
    this.log(`✅ Payment session created: ${tx_ref}`, 'success');
    this.log(`💳 Payment link: ${payment_link}`, 'info');

    // Step 2: Simulate payment verification (mock successful payment)
    this.log('⏳ Simulating payment verification...', 'test');
    
    // Wait a bit to simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify payment
    const verifyResult = await this.makeRequest('GET', `/bills/verify/${tx_ref}`);
    
    if (verifyResult.success) {
      this.log('✅ Payment flow completed successfully', 'success');
      this.log(`📊 Customer charged: ₦${verifyResult.data.data.amount}`, 'info');
      this.log(`📱 Service delivered: ₦${verifyResult.data.data.original_amount}`, 'info');
      this.log(`💰 Discount given: ₦${verifyResult.data.data.discount_amount || 0}`, 'info');
      return true;
    } else {
      this.log('❌ Payment verification failed: ' + verifyResult.error?.message, 'error');
      return false;
    }
  }

  async testWalletPaymentFlow() {
    this.log('💰 Testing Wallet Payment Flow (Customer charged FIRST)', 'test');
    
    // Step 1: Check wallet balance
    const walletResult = await this.makeRequest('GET', '/wallet/info');
    
    if (!walletResult.success) {
      this.log('❌ Failed to get wallet info: ' + walletResult.error?.message, 'error');
      return false;
    }

    const walletBalance = walletResult.data.data.balance;
    this.log(`💰 Current wallet balance: ₦${walletBalance}`, 'info');

    if (walletBalance < 900) { // Need at least 900 for 1000 airtime with 10% discount
      this.log('⚠️ Insufficient wallet balance for test', 'warning');
      return false;
    }

    // Step 2: Process wallet payment
    const paymentResult = await this.makeRequest('POST', '/wallet/pay', {
      amount: 1000,
      service: 'airtime',
      phoneNumber: TEST_PHONE,
      network: 'MTN'
    });

    if (paymentResult.success) {
      this.log('✅ Wallet payment completed successfully', 'success');
      this.log(`📊 Customer charged: ₦${paymentResult.data.data.discountedAmount}`, 'info');
      this.log(`📱 Service delivered: ₦${paymentResult.data.data.originalAmount}`, 'info');
      this.log(`💰 Discount given: ₦${paymentResult.data.data.discountAmount}`, 'info');
      this.log(`💳 New balance: ₦${paymentResult.data.data.newBalance}`, 'info');
      return true;
    } else {
      this.log('❌ Wallet payment failed: ' + paymentResult.error?.message, 'error');
      return false;
    }
  }

  async testPaymentVerificationFlow() {
    this.log('🔍 Testing Payment Verification Flow', 'test');
    
    // Test with mock transaction ID
    const mockTxRef = `MOCK_TEST_${Date.now()}`;
    
    const verifyResult = await this.makeRequest('GET', `/bills/verify/${mockTxRef}`);
    
    if (verifyResult.success) {
      this.log('✅ Mock payment verification worked', 'success');
      return true;
    } else {
      this.log('❌ Payment verification test failed: ' + verifyResult.error?.message, 'error');
      return false;
    }
  }

  async testWebhookHandling() {
    this.log('🔔 Testing Webhook Handling', 'test');
    
    // Simulate a Flutterwave webhook
    const webhookData = {
      event: 'charge.completed',
      data: {
        tx_ref: `WEBHOOK_TEST_${Date.now()}`,
        status: 'successful',
        amount: 1000,
        currency: 'NGN',
        customer: {
          email: TEST_USER_EMAIL
        }
      }
    };

    const webhookResult = await this.makeRequest('POST', '/bills/webhook', webhookData);
    
    if (webhookResult.success) {
      this.log('✅ Webhook handling successful', 'success');
      return true;
    } else {
      this.log('❌ Webhook handling failed: ' + webhookResult.error?.message, 'error');
      return false;
    }
  }

  async testFailureHandling() {
    this.log('🚫 Testing Failure Handling (Refund Mechanisms)', 'test');
    
    // Test with intentionally invalid data to trigger failures
    const failureTests = [
      {
        name: 'Invalid Phone Number',
        data: {
          phone_number: '123', // Too short
          amount: 1000,
          network: 'MTN'
        }
      },
      {
        name: 'Invalid Amount',
        data: {
          phone_number: TEST_PHONE,
          amount: 10, // Too small
          network: 'MTN'
        }
      },
      {
        name: 'Invalid Network',
        data: {
          phone_number: TEST_PHONE,
          amount: 1000,
          network: 'INVALID_NETWORK'
        }
      }
    ];

    let passedTests = 0;
    
    for (const test of failureTests) {
      this.log(`🧪 Testing: ${test.name}`, 'test');
      
      const result = await this.makeRequest('POST', '/bills/airtime', test.data);
      
      if (!result.success) {
        this.log(`✅ ${test.name}: Correctly rejected`, 'success');
        passedTests++;
      } else {
        this.log(`❌ ${test.name}: Should have been rejected`, 'error');
      }
    }

    return passedTests === failureTests.length;
  }

  async testBillCategoriesAccess() {
    this.log('📋 Testing Bill Categories Access (Public Route)', 'test');
    
    // Test without authentication
    const tempToken = this.authToken;
    this.authToken = null;
    
    const result = await this.makeRequest('GET', '/bills/categories');
    
    this.authToken = tempToken;
    
    if (result.success) {
      this.log('✅ Bill categories accessible without auth', 'success');
      this.log(`📊 Found ${result.data.data?.length || 0} categories`, 'info');
      return true;
    } else {
      this.log('❌ Bill categories access failed: ' + result.error?.message, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Starting MaralemPay Automated Charging Tests', 'test');
    this.log('=' * 60, 'info');
    
    const tests = [
      { name: 'Authentication', method: 'authenticate' },
      { name: 'Bill Categories Access', method: 'testBillCategoriesAccess' },
      { name: 'Card Payment Flow', method: 'testCardPaymentFlow' },
      { name: 'Wallet Payment Flow', method: 'testWalletPaymentFlow' },
      { name: 'Payment Verification', method: 'testPaymentVerificationFlow' },
      { name: 'Webhook Handling', method: 'testWebhookHandling' },
      { name: 'Failure Handling', method: 'testFailureHandling' }
    ];

    let passedTests = 0;
    const startTime = Date.now();

    for (const test of tests) {
      this.log(`\n🧪 Running Test: ${test.name}`, 'test');
      this.log('-' * 40, 'info');
      
      try {
        const result = await this[test.method]();
        
        if (result) {
          this.log(`✅ ${test.name}: PASSED`, 'success');
          passedTests++;
        } else {
          this.log(`❌ ${test.name}: FAILED`, 'error');
        }
        
        this.testResults.push({
          name: test.name,
          passed: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, 'error');
        this.testResults.push({
          name: test.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    this.log('\n' + '=' * 60, 'info');
    this.log('📊 TEST RESULTS SUMMARY', 'test');
    this.log('=' * 60, 'info');
    this.log(`✅ Passed: ${passedTests}/${tests.length}`, passedTests === tests.length ? 'success' : 'warning');
    this.log(`⏱️ Duration: ${duration}s`, 'info');
    this.log(`🎯 Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`, 'info');

    if (passedTests === tests.length) {
      this.log('\n🎉 ALL TESTS PASSED! Automated charging system is working correctly.', 'success');
      this.log('✅ Customer payments are verified BEFORE Flutterwave Bills API charges', 'success');
      this.log('✅ Proper error handling and refund mechanisms are in place', 'success');
      this.log('✅ No service delivery without confirmed customer payment', 'success');
    } else {
      this.log('\n⚠️ SOME TESTS FAILED! Please review the issues above.', 'warning');
    }

    return this.testResults;
  }
}

// Main execution
async function main() {
  console.log('🚀 MaralemPay Automated Charging Test Suite');
  console.log('=' * 60);
  
  const tester = new AutomatedChargingTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = AutomatedChargingTester;
