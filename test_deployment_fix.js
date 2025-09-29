// Test script to verify deployment fixes
const mongoose = require('mongoose');

async function testDeploymentFixes() {
  try {
    console.log('🧪 Testing deployment fixes...');
    
    // Test 1: Check if models can be imported without conflicts
    console.log('1. Testing model imports...');
    const Transaction = require('./models/Transaction');
    const User = require('./models/User');
    const Subscription = require('./models/Subscription');
    console.log('✅ All models imported successfully');
    
    // Test 2: Check if controllers can be imported
    console.log('2. Testing controller imports...');
    const FlutterwaveAirtimeController = require('./controllers/flutterwaveAirtimeController');
    console.log('✅ FlutterwaveAirtimeController imported successfully');
    
    // Test 3: Check if server.js can be imported
    console.log('3. Testing server import...');
    const app = require('./server');
    console.log('✅ Server imported successfully');
    
    console.log('🎉 All deployment fixes verified!');
    console.log('✅ No model conflicts detected');
    console.log('✅ All imports working correctly');
    console.log('✅ Ready for deployment!');
    
  } catch (error) {
    console.error('❌ Deployment test failed:', error.message);
    process.exit(1);
  }
}

testDeploymentFixes();
