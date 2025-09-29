// test_maralem_integration.js - Test MaralemPay Discount Integration

require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testUser = {
  email: 'test@maralempay.com',
  password: 'testpassword123'
};

const testPurchase = {
  type: 'AIRTIME',
  customer: '08012345678',
  amount: 100,
  biller_name: 'MTN',
  biller_code: 'BIL108'
};

let authToken = '';

/**
 * Test user authentication
 */
async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  try {
    // Try to login first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
      return true;
    }
  } catch (error) {
    console.log('⚠️ Login failed, trying registration...');
    
    try {
      // Try to register
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        ...testUser,
        firstName: 'Test',
        lastName: 'User'
      });
      
      if (registerResponse.data.success) {
        console.log('✅ Registration successful');
        // Try login again
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
        if (loginResponse.data.success) {
          authToken = loginResponse.data.token;
          console.log('✅ Login after registration successful');
          return true;
        }
      }
    } catch (regError) {
      console.log('❌ Registration failed:', regError.response?.data?.message || regError.message);
    }
  }
  
  console.log('❌ Authentication failed');
  return false;
}

/**
 * Test discount calculation
 */
async function testDiscountCalculation() {
  console.log('💰 Testing discount calculation...');
  
  try {
    const response = await axios.post(`${API_BASE}/maralem-bills/calculate-discount`, {
      amount: 100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Discount calculation successful:');
      console.log(`   Original Amount: ₦${data.original_amount}`);
      console.log(`   Discounted Amount: ₦${data.discounted_amount}`);
      console.log(`   Discount Amount: ₦${data.discount_amount}`);
      console.log(`   Discount Percentage: ${data.discount_percentage}%`);
      console.log(`   Is Subscriber: ${data.is_subscriber}`);
      return true;
    } else {
      console.log('❌ Discount calculation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Discount calculation error:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test bill categories
 */
async function testBillCategories() {
  console.log('📋 Testing bill categories...');
  
  try {
    const response = await axios.get(`${API_BASE}/maralem-bills/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Bill categories fetched successfully');
      console.log(`   Found ${response.data.data.length} categories`);
      return true;
    } else {
      console.log('❌ Bill categories failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Bill categories error:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test MaralemPay purchase (without actually processing payment)
 */
async function testMaralemPurchase() {
  console.log('🛒 Testing MaralemPay purchase...');
  
  try {
    const response = await axios.post(`${API_BASE}/maralem-bills/purchase`, testPurchase, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ MaralemPay purchase successful:');
      console.log(`   Transaction ID: ${data.transaction_id}`);
      console.log(`   TX Ref: ${data.tx_ref}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Discount Details:`, data.discount_details);
      return true;
    } else {
      console.log('❌ MaralemPay purchase failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ MaralemPay purchase error:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test transaction history
 */
async function testTransactionHistory() {
  console.log('📊 Testing transaction history...');
  
  try {
    const response = await axios.get(`${API_BASE}/maralem-bills/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Transaction history fetched successfully');
      console.log(`   Total Transactions: ${data.pagination.total_transactions}`);
      console.log(`   Total Savings: ₦${data.total_savings}`);
      return true;
    } else {
      console.log('❌ Transaction history failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Transaction history error:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test statistics
 */
async function testStatistics() {
  console.log('📈 Testing statistics...');
  
  try {
    const response = await axios.get(`${API_BASE}/maralem-bills/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Statistics fetched successfully');
      console.log(`   Total Transactions: ${data.total_transactions}`);
      console.log(`   Total Amount Paid: ₦${data.total_amount_paid}`);
      console.log(`   Total Savings: ₦${data.total_savings}`);
      console.log(`   Success Rate: ${data.success_rate}%`);
      console.log(`   Is Subscriber: ${data.is_subscriber}`);
      return true;
    } else {
      console.log('❌ Statistics failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Statistics error:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting MaralemPay Integration Tests...\n');
  
  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Discount Calculation', fn: testDiscountCalculation },
    { name: 'Bill Categories', fn: testBillCategories },
    { name: 'MaralemPay Purchase', fn: testMaralemPurchase },
    { name: 'Transaction History', fn: testTransactionHistory },
    { name: 'Statistics', fn: testStatistics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! MaralemPay integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testAuthentication,
  testDiscountCalculation,
  testBillCategories,
  testMaralemPurchase,
  testTransactionHistory,
  testStatistics
};

