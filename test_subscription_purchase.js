#!/usr/bin/env node

/**
 * Test script for subscription purchase endpoint
 * This script helps debug the 500 error in /api/subscription/purchase
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'https://backend-nithishwaran-rps-projects.vercel.app';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

class SubscriptionTester {
  constructor() {
    this.baseURL = BASE_URL;
    this.authToken = null;
    this.userId = null;
  }

  async runTests() {
    console.log('🧪 Starting Subscription Purchase Tests...\n');
    
    try {
      // Test 1: Check environment variables
      await this.testEnvironmentVariables();
      
      // Test 2: Test authentication
      await this.testAuthentication();
      
      // Test 3: Test subscription purchase
      await this.testSubscriptionPurchase();
      
      // Test 4: Test subscription status
      await this.testSubscriptionStatus();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testEnvironmentVariables() {
    console.log('🔍 Test 1: Checking Environment Variables...');
    
    const requiredEnvVars = [
      'FLW_SECRET_KEY',
      'FLW_PUBLIC_KEY',
      'MONGODB_URI',
      'JWT_SECRET'
    ];
    
    const missingVars = [];
    const presentVars = [];
    
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        presentVars.push(varName);
        console.log(`✅ ${varName}: Set (${process.env[varName].substring(0, 10)}...)`);
      } else {
        missingVars.push(varName);
        console.log(`❌ ${varName}: Not set`);
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`\n⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.log('This could be the cause of the 500 error.\n');
    } else {
      console.log('\n✅ All required environment variables are set.\n');
    }
  }

  async testAuthentication() {
    console.log('🔍 Test 2: Testing Authentication...');
    
    try {
      // Try to login first
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (loginResponse.data.success) {
        this.authToken = loginResponse.data.data.token;
        this.userId = loginResponse.data.data.user._id;
        console.log('✅ Authentication successful');
        console.log(`   User ID: ${this.userId}`);
        console.log(`   Token: ${this.authToken.substring(0, 20)}...\n`);
      } else {
        console.log('❌ Authentication failed:', loginResponse.data.message);
        console.log('   Creating test user...\n');
        await this.createTestUser();
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.response?.data?.message || error.message);
      console.log('   Creating test user...\n');
      await this.createTestUser();
    }
  }

  async createTestUser() {
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
        console.log('✅ Test user created successfully');
        console.log(`   User ID: ${this.userId}`);
        console.log(`   Token: ${this.authToken.substring(0, 20)}...\n`);
      } else {
        console.log('❌ Failed to create test user:', registerResponse.data.message);
        throw new Error('Cannot proceed without authentication');
      }
    } catch (error) {
      console.log('❌ User creation error:', error.response?.data?.message || error.message);
      throw new Error('Cannot proceed without authentication');
    }
  }

  async testSubscriptionPurchase() {
    console.log('🔍 Test 3: Testing Subscription Purchase...');
    
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
        console.log(`   Amount: ₦${purchaseResponse.data.data.amount}\n`);
      } else {
        console.log('❌ Subscription purchase failed:', purchaseResponse.data.message);
        if (purchaseResponse.data.error_details) {
          console.log('   Error Details:', JSON.stringify(purchaseResponse.data.error_details, null, 2));
        }
        if (purchaseResponse.data.debug) {
          console.log('   Debug Info:', JSON.stringify(purchaseResponse.data.debug, null, 2));
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
    console.log('🔍 Test 4: Testing Subscription Status...');
    
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
          console.log(`   Plan Type: ${statusResponse.data.data.subscription.plan_type}`);
          console.log(`   Days Remaining: ${statusResponse.data.data.subscription.days_remaining}`);
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
}

// Run the tests
if (require.main === module) {
  const tester = new SubscriptionTester();
  tester.runTests().catch(console.error);
}

module.exports = SubscriptionTester;
