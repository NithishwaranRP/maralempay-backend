#!/usr/bin/env node

/**
 * Test Flutterwave API Flow
 * This demonstrates the exact API calls made when user clicks "Subscribe Now"
 */

const axios = require('axios');
require('dotenv').config();

class FlutterwaveFlowTester {
  constructor() {
    this.baseURL = 'https://api.flutterwave.com/v3';
    this.secretKey = process.env.FLW_SECRET_KEY || 'FLWSECK-7bca757486e057a8555939e4c1b4f3d0-1995cd4deb5vt-X';
    this.headers = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  async testCompleteFlow() {
    console.log('🧪 Testing Complete Flutterwave API Flow...\n');
    
    try {
      // Step 1: Test banks endpoint (optional - for reference)
      await this.testBanksEndpoint();
      
      // Step 2: Test payment initialization (what happens when user clicks Subscribe Now)
      const paymentResult = await this.testPaymentInitialization();
      
      // Step 3: Test payment verification (what happens after payment)
      if (paymentResult && paymentResult.tx_ref) {
        await this.testPaymentVerification(paymentResult.tx_ref);
      }
      
    } catch (error) {
      console.error('❌ Flow test failed:', error.message);
    }
  }

  async testBanksEndpoint() {
    console.log('🔍 Step 1: Testing Banks Endpoint...');
    console.log('Equivalent to: curl -X GET "https://api.flutterwave.com/v3/banks/NG"');
    
    try {
      const response = await axios.get(`${this.baseURL}/banks/NG`, {
        headers: this.headers
      });
      
      console.log('✅ Banks endpoint working');
      console.log(`   Found ${response.data.data.length} Nigerian banks`);
      console.log(`   Sample banks: ${response.data.data.slice(0, 3).map(bank => bank.name).join(', ')}\n`);
      
    } catch (error) {
      console.log('❌ Banks endpoint error:', error.response?.data?.message || error.message);
      console.log('   This is optional and doesn\'t affect subscription flow\n');
    }
  }

  async testPaymentInitialization() {
    console.log('🔍 Step 2: Testing Payment Initialization...');
    console.log('This is what happens when user clicks "Subscribe Now"');
    console.log('Equivalent to: curl -X POST "https://api.flutterwave.com/v3/payments"');
    
    const paymentData = {
      tx_ref: `SUB_TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: 750,
      currency: 'NGN',
      redirect_url: 'https://maralempay.com/subscription/callback?status=successful',
      customer: {
        email: 'test@maralempay.com',
        phonenumber: '08012345678',
        name: 'Test User'
      },
      customizations: {
        title: 'MaralemPay Subscription',
        description: '6 months Premium Plan - ₦100'
      },
      meta: {
        user_id: 'test_user_123',
        plan_type: '6_months',
        payment_type: 'subscription',
        duration: 6,
        discount_percentage: 10
      }
    };
    
    console.log('📤 Payment data being sent:');
    console.log(JSON.stringify(paymentData, null, 2));
    
    try {
      const response = await axios.post(`${this.baseURL}/payments`, paymentData, {
        headers: this.headers
      });
      
      console.log('✅ Payment initialization successful!');
      console.log(`   Transaction Reference: ${response.data.data.tx_ref}`);
      console.log(`   Flutterwave Reference: ${response.data.data.flw_ref}`);
      console.log(`   Payment Link: ${response.data.data.link}`);
      console.log(`   Status: ${response.data.status}\n`);
      
      return {
        tx_ref: response.data.data.tx_ref,
        flw_ref: response.data.data.flw_ref,
        link: response.data.data.link
      };
      
    } catch (error) {
      console.log('❌ Payment initialization failed:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('');
      return null;
    }
  }

  async testPaymentVerification(txRef) {
    console.log('🔍 Step 3: Testing Payment Verification...');
    console.log('This is what happens after user completes payment');
    console.log(`Equivalent to: curl -X GET "https://api.flutterwave.com/v3/transactions/${txRef}/verify"`);
    
    try {
      const response = await axios.get(`${this.baseURL}/transactions/${txRef}/verify`, {
        headers: this.headers
      });
      
      console.log('✅ Payment verification successful!');
      console.log(`   Transaction Reference: ${response.data.data.tx_ref}`);
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Amount: ₦${response.data.data.amount}`);
      console.log(`   Currency: ${response.data.data.currency}`);
      console.log(`   Customer: ${response.data.data.customer?.email}`);
      console.log(`   Payment Type: ${response.data.data.payment_type}\n`);
      
    } catch (error) {
      console.log('❌ Payment verification failed:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      console.log('   Note: This is expected for test transactions that haven\'t been paid\n');
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new FlutterwaveFlowTester();
  tester.testCompleteFlow().catch(console.error);
}

module.exports = FlutterwaveFlowTester;
