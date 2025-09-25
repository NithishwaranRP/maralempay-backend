#!/usr/bin/env node

/**
 * Complete Subscription Flow Test
 * This script tests the entire subscription flow from purchase to activation
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'https://backend-a2b2bw5bh-nithishwaran-rps-projects.vercel.app';
const TEST_EMAIL = 'test@maralempay.com';
const TEST_PASSWORD = 'testpassword123';

class CompleteSubscriptionTester {
  constructor() {
    this.baseURL = BASE_URL;
    this.authToken = null;
    this.userId = null;
    this.paymentRef = null;
  }

  async runCompleteTest() {
    console.log('🧪 Starting Complete Subscription Flow Test...\n');
    
    try {
      // Step 1: Create/Login user
      await this.setupUser();
      
      // Step 2: Test subscription purchase
      await this.testSubscriptionPurchase();
      
      // Step 3: Test subscription status
      await this.testSubscriptionStatus();
      
      // Step 4: Test manual activation (simulate webhook)
      if (this.paymentRef) {
        await this.testManualActivation();
      }
      
      console.log('\n✅ Complete subscription flow test completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async setupUser() {
    console.log('🔍 Step 1: Setting up test user...');
    
    try {
      // Try to login first
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (loginResponse.data.success) {
        this.authToken = loginResponse.data.data.token;
        this.userId = loginResponse.data.data.user._id;
        console.log('✅ User login successful');
        console.log(`   User ID: ${this.userId}`);
        console.log(`   Email: ${loginResponse.data.data.user.email}`);
        console.log(`   Is Subscribed: ${loginResponse.data.data.user.isSubscribed}\n`);
      }
    } catch (error) {
      // If login fails, create user
      console.log('❌ Login failed, creating new user...');
      await this.createUser();
    }
  }

  async createUser() {
    try {
      const registerResponse = await axios.post(`${this.baseURL}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        phone: '08012345678'
      });
      
      if (registerResponse.data.success) {
        this.authToken = registerResponse.data.data.token;
        this.userId = registerResponse.data.data.user._id;
        console.log('✅ User created successfully');
        console.log(`   User ID: ${this.userId}`);
        console.log(`   Email: ${registerResponse.data.data.user.email}\n`);
      } else {
        throw new Error('Failed to create user: ' + registerResponse.data.message);
      }
    } catch (error) {
      console.error('❌ User creation failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async testSubscriptionPurchase() {
    console.log('🔍 Step 2: Testing subscription purchase...');
    
    if (!this.authToken) {
      console.log('❌ No auth token available, skipping test\n');
      return;
    }
    
    try {
      const purchaseResponse = await axios.post(
        `${this.baseURL}/api/subscription/purchase`,
        {
          planType: '6_months'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (purchaseResponse.data.success) {
        console.log('✅ Subscription purchase successful');
        console.log(`   Payment Link: ${purchaseResponse.data.data.payment_link}`);
        console.log(`   Payment Ref: ${purchaseResponse.data.data.payment_reference}`);
        console.log(`   Amount: ₦${purchaseResponse.data.data.amount}`);
        console.log(`   Plan Type: ${purchaseResponse.data.data.plan_type}`);
        console.log(`   Subscription ID: ${purchaseResponse.data.data.subscription_id}`);
        
        this.paymentRef = purchaseResponse.data.data.payment_reference;
        console.log('');
      } else {
        console.log('❌ Subscription purchase failed:', purchaseResponse.data.message);
        if (purchaseResponse.data.error_details) {
          console.log('   Error Details:', JSON.stringify(purchaseResponse.data.error_details, null, 2));
        }
        console.log('');
      }
    } catch (error) {
      console.log('❌ Subscription purchase error:', error.response?.data?.message || error.message);
      if (error.response?.data) {
        console.log('   Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }
  }

  async testSubscriptionStatus() {
    console.log('🔍 Step 3: Testing subscription status...');
    
    if (!this.authToken) {
      console.log('❌ No auth token available, skipping test\n');
      return;
    }
    
    try {
      const statusResponse = await axios.get(
        `${this.baseURL}/api/subscription/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (statusResponse.data.success) {
        console.log('✅ Subscription status retrieved successfully');
        console.log(`   Has Active Subscription: ${statusResponse.data.data.hasActiveSubscription}`);
        if (statusResponse.data.data.subscription) {
          const sub = statusResponse.data.data.subscription;
          console.log(`   Plan Type: ${sub.plan_type}`);
          console.log(`   Amount: ₦${sub.amount}`);
          console.log(`   Duration: ${sub.duration} ${sub.durationUnit}`);
          console.log(`   Days Remaining: ${sub.days_remaining}`);
          console.log(`   Status: ${sub.status}`);
        }
        console.log('');
      } else {
        console.log('❌ Subscription status failed:', statusResponse.data.message);
        console.log('');
      }
    } catch (error) {
      console.log('❌ Subscription status error:', error.response?.data?.message || error.message);
      console.log('');
    }
  }

  async testManualActivation() {
    console.log('🔍 Step 4: Testing manual subscription activation...');
    
    if (!this.authToken || !this.paymentRef) {
      console.log('❌ No auth token or payment ref available, skipping test\n');
      return;
    }
    
    try {
      const activationResponse = await axios.post(
        `${this.baseURL}/api/subscription/manual-activate`,
        {
          payment_ref: this.paymentRef
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (activationResponse.data.success) {
        console.log('✅ Manual activation successful');
        console.log(`   Subscription ID: ${activationResponse.data.data.subscription_id}`);
        console.log(`   Status: ${activationResponse.data.data.status}`);
        console.log(`   Amount: ₦${activationResponse.data.data.amount}`);
        console.log(`   Days Remaining: ${activationResponse.data.data.days_remaining}`);
        console.log('');
      } else {
        console.log('❌ Manual activation failed:', activationResponse.data.message);
        console.log('');
      }
    } catch (error) {
      console.log('❌ Manual activation error:', error.response?.data?.message || error.message);
      console.log('');
    }
  }
}

// Run the complete test
if (require.main === module) {
  const tester = new CompleteSubscriptionTester();
  tester.runCompleteTest().catch(console.error);
}

module.exports = CompleteSubscriptionTester;
