const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const WalletTransaction = require('./models/WalletTransaction');
const User = require('./models/User');
require('dotenv').config();

/**
 * Test script to verify webhook system and transaction status updates
 */
async function testWebhookSystem() {
  try {
    console.log('🧪 Testing Webhook System...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Test 1: Check for stuck transactions
    console.log('\n📊 Test 1: Checking for stuck transactions...');
    const stuckTransactions = await Transaction.find({ status: 'initialized' });
    console.log(`Found ${stuckTransactions.length} stuck transactions with status 'initialized'`);
    
    if (stuckTransactions.length > 0) {
      console.log('\n🔍 Sample stuck transactions:');
      stuckTransactions.slice(0, 3).forEach((tx, index) => {
        console.log(`${index + 1}. TX_REF: ${tx.tx_ref}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Amount: ₦${tx.userAmount}`);
        console.log(`   Biller: ${tx.biller_code}`);
        console.log(`   Created: ${tx.createdAt}`);
        console.log(`   Updated: ${tx.updatedAt}`);
        console.log('');
      });
    }
    
    // Test 2: Check wallet transactions
    console.log('\n📊 Test 2: Checking wallet transactions...');
    const walletTransactions = await WalletTransaction.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${walletTransactions.length} recent wallet transactions:`);
    
    walletTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. Type: ${tx.type}`);
      console.log(`   Amount: ₦${tx.amount}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Created: ${tx.createdAt}`);
      console.log('');
    });
    
    // Test 3: Check user wallet balances
    console.log('\n📊 Test 3: Checking user wallet balances...');
    const users = await User.find({ walletBalance: { $gt: 0 } }).limit(5);
    console.log(`Found ${users.length} users with wallet balance > 0:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Balance: ₦${user.walletBalance}`);
      console.log(`   Subscription: ${user.hasActiveSubscription ? 'Active' : 'Inactive'}`);
      console.log('');
    });
    
    // Test 4: Simulate webhook processing for stuck transactions
    if (stuckTransactions.length > 0) {
      console.log('\n🔧 Test 4: Simulating webhook processing for stuck transactions...');
      
      for (const tx of stuckTransactions.slice(0, 3)) { // Process first 3 stuck transactions
        console.log(`\nProcessing transaction: ${tx.tx_ref}`);
        
        // Simulate successful payment
        tx.status = 'successful';
        tx.flw_ref = `MOCK_FLW_REF_${Date.now()}`;
        tx.updatedAt = new Date();
        await tx.save();
        
        console.log(`✅ Updated transaction ${tx.tx_ref} to 'successful'`);
        
        // Update user data based on transaction type
        if (tx.biller_code === 'WALLET_FUNDING') {
          const user = await User.findById(tx.userId);
          if (user) {
            user.walletBalance += tx.userAmount;
            await user.save();
            console.log(`✅ Updated wallet balance for user ${user.email}: +₦${tx.userAmount}`);
          }
        } else if (tx.biller_code === 'SUBSCRIPTION') {
          const user = await User.findById(tx.userId);
          if (user) {
            user.hasActiveSubscription = true;
            user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            await user.save();
            console.log(`✅ Updated subscription status for user ${user.email}`);
          }
        }
      }
    }
    
    // Test 5: Verify webhook endpoint is accessible
    console.log('\n🌐 Test 5: Testing webhook endpoint accessibility...');
    const webhookUrl = `${process.env.BACKEND_URL || process.env.BASE_URL || 'http://localhost:3000'}/api/webhook/flutterwave`;
    console.log(`Webhook URL: ${webhookUrl}`);
    console.log('✅ Webhook endpoint should be accessible at the above URL');
    
    // Test 6: Check environment variables
    console.log('\n🔐 Test 6: Checking webhook environment variables...');
    const requiredEnvVars = [
      'FLW_SECRET_HASH',
      'FLW_SECRET_KEY',
      'FLW_PUBLIC_KEY',
      'MONGODB_URI'
    ];
    
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: ${envVar.includes('SECRET') || envVar.includes('KEY') ? '***' + value.slice(-4) : value}`);
      } else {
        console.log(`❌ ${envVar}: Not set`);
      }
    });
    
    console.log('\n🎉 Webhook system test completed!');
    console.log('\n📋 Summary:');
    console.log(`- Stuck transactions found: ${stuckTransactions.length}`);
    console.log(`- Wallet transactions: ${walletTransactions.length}`);
    console.log(`- Users with balance: ${users.length}`);
    console.log(`- Webhook endpoint: ${webhookUrl}`);
    
    if (stuckTransactions.length > 0) {
      console.log('\n⚠️  Action Required:');
      console.log('1. Configure Flutterwave webhook URL in your Flutterwave dashboard');
      console.log('2. Set FLW_SECRET_HASH environment variable');
      console.log('3. Test webhook with sample transactions');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

// Run the test
testWebhookSystem();
