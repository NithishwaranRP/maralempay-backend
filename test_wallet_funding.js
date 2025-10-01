#!/usr/bin/env node

/**
 * Test Wallet Funding Flow
 * This tests the exact wallet funding API call
 */

const axios = require('axios');
require('dotenv').config();

class WalletFundingTester {
  constructor() {
    this.baseURL = 'https://api.flutterwave.com/v3';
    this.secretKey = 'FLWSECK-d6b4ee5933c0fb806a383d8c8475ed90-19985cff6a6vt-X';
    this.headers = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  async testWalletFunding(amount = 1000) {
    console.log('🧪 Testing Wallet Funding Flow...\n');
    console.log(`💰 Testing with amount: ₦${amount}\n`);
    
    try {
      // Step 1: Test wallet funding payment initialization
      const paymentResult = await this.testWalletPaymentInitialization(amount);
      
      if (paymentResult) {
        console.log('✅ Wallet funding payment initialized successfully!');
        console.log(`   Payment URL: ${paymentResult.link}`);
        console.log(`   Transaction Ref: ${paymentResult.tx_ref}`);
        console.log(`   Amount in URL: ${this.extractAmountFromUrl(paymentResult.link)}`);
      }
      
    } catch (error) {
      console.error('❌ Wallet funding test failed:', error.message);
    }
  }

  async testWalletPaymentInitialization(amount) {
    console.log('🔍 Testing Wallet Payment Initialization...');
    console.log('This is what happens when user clicks "Fund Wallet"');
    
    const paymentData = {
      tx_ref: `WALLET_TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: 'NGN',
      redirect_url: 'https://maralempay.com.ng/wallet/success',
      customer: {
        email: 'test@maralempay.com',
        phonenumber: '08012345678',
        name: 'Test User'
      },
      customizations: {
        title: 'MaralemPay Wallet Funding',
        description: `Fund your wallet for discounted purchases - ₦${amount}`,
        logo: 'https://maralempay.com/logo.png'
      },
      meta: {
        user_id: 'test_user_123',
        payment_type: 'wallet_funding',
        amount: amount
      }
    };
    
    console.log('📤 Payment data being sent to Flutterwave:');
    console.log(JSON.stringify(paymentData, null, 2));
    
    try {
      const response = await axios.post(`${this.baseURL}/payments`, paymentData, {
        headers: this.headers
      });
      
      console.log('✅ Flutterwave API Response:');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Full Response Data:`, JSON.stringify(response.data.data, null, 2));
      console.log(`   Transaction Reference: ${response.data.data.tx_ref}`);
      console.log(`   Flutterwave Reference: ${response.data.data.flw_ref}`);
      console.log(`   Payment Link: ${response.data.data.link}`);
      console.log(`   Amount in response: ${response.data.data.amount}`);
      console.log(`   Currency: ${response.data.data.currency}\n`);
      
      return {
        tx_ref: response.data.data.tx_ref,
        flw_ref: response.data.data.flw_ref,
        link: response.data.data.link,
        amount: response.data.data.amount
      };
      
    } catch (error) {
      console.log('❌ Wallet payment initialization failed:');
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

  extractAmountFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const amount = urlObj.searchParams.get('amount');
      return amount ? `₦${amount}` : 'Not found in URL';
    } catch (e) {
      return 'Error parsing URL';
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new WalletFundingTester();
  
  // Test with different amounts
  const testAmounts = [1000, 2500, 5000];
  
  async function runTests() {
    for (const amount of testAmounts) {
      console.log('='.repeat(60));
      await tester.testWalletFunding(amount);
      console.log('\n');
    }
  }
  
  runTests().catch(console.error);
}

module.exports = WalletFundingTester;
