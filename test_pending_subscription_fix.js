#!/usr/bin/env node

/**
 * Test Pending Subscription Fix
 * This tests the scenario where user has a pending subscription
 */

const axios = require('axios');
require('dotenv').config();

async function testPendingSubscriptionFix() {
  const baseURL = 'https://backend-2qmnzeaer-nithishwaran-rps-projects.vercel.app';
  
  console.log('🧪 Testing Pending Subscription Fix...\n');
  
  try {
    // Test subscription endpoint without auth (should get 401, not 400 with pending subscription)
    console.log('🔍 Testing subscription endpoint...');
    const response = await axios.post(`${baseURL}/api/subscription/purchase`, {
      planType: '6_months'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Unexpected success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('✅ Response received');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message || 'No message');
      
      if (error.response.status === 401) {
        console.log('✅ Getting auth error (expected) - no pending subscription blocking');
      } else if (error.response.status === 400) {
        if (error.response.data.message && error.response.data.message.includes('already have an active subscription')) {
          console.log('❌ Still getting "already have subscription" error');
          console.log('   This means the user has a completed subscription, not pending');
        } else {
          console.log('✅ Getting 400 error for different reason (not pending subscription)');
        }
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testPendingSubscriptionFix().catch(console.error);
