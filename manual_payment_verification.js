const mongoose = require('mongoose');
const User = require('./models/User');
const { FlutterwaveService } = require('./utils/flutterwave');

// Manual script to verify a payment and update subscription
async function manualVerifyPayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/maralempay');
    console.log('Connected to MongoDB');

    const flutterwaveService = new FlutterwaveService();
    
    // Replace with the actual transaction details from your payment
    const TX_REF = 'MARALEM_1726607269336_6OQPumrse'; // Replace with actual tx_ref from your payment
    const USER_EMAIL = 'nithishnt2002@gmail.com'; // Replace with actual user email
    
    console.log('🔍 Verifying payment manually...');
    console.log('TX_REF:', TX_REF);
    console.log('USER_EMAIL:', USER_EMAIL);
    
    // Step 1: Verify payment with Flutterwave
    const verificationResult = await flutterwaveService.verifyPayment(TX_REF);
    
    if (!verificationResult.success) {
      console.log('❌ Flutterwave verification failed:', verificationResult.message);
      process.exit(1);
    }
    
    const paymentData = verificationResult.data;
    console.log('✅ Flutterwave verification successful:', {
      status: paymentData.status,
      amount: paymentData.amount,
      currency: paymentData.currency,
      customer_email: paymentData.customer?.email,
      flw_ref: paymentData.flw_ref
    });
    
    // Step 2: Check if payment is successful
    if (paymentData.status !== 'successful') {
      console.log('⚠️ Payment not successful:', paymentData.status);
      process.exit(1);
    }
    
    // Step 3: Find user
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
      console.log('❌ User not found for email:', USER_EMAIL);
      process.exit(1);
    }
    
    console.log('👤 User found:', {
      user_id: user._id,
      email: user.email,
      current_subscription_status: user.isSubscribed
    });
    
    // Step 4: Check if this is a subscription payment
    const paymentAmount = parseFloat(paymentData.amount);
    const subscriptionAmount = parseFloat(process.env.SUBSCRIPTION_AMOUNT || 750);
    
    if (Math.abs(paymentAmount - subscriptionAmount) < 1) {
      console.log('💳 This is a subscription payment, activating subscription...');
      
      // Step 5: Activate subscription
      const subscriptionDuration = parseInt(process.env.SUBSCRIPTION_DURATION || 180); // 180 days (6 months)
      const subscriptionExpiry = new Date();
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + subscriptionDuration);
      
      // Update user subscription status
      await User.findByIdAndUpdate(user._id, {
        isSubscribed: true,
        subscriptionExpiry: subscriptionExpiry,
        subscriptionActivatedAt: new Date()
      });
      
      console.log('🎉 Subscription activated successfully!');
      console.log('   User ID:', user._id);
      console.log('   Email:', user.email);
      console.log('   Expires:', subscriptionExpiry);
      console.log('   Duration:', subscriptionDuration, 'days');
      
      // Verify the update
      const updatedUser = await User.findById(user._id);
      console.log('✅ Verification - Updated user:', {
        isSubscribed: updatedUser.isSubscribed,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
        subscriptionActivatedAt: updatedUser.subscriptionActivatedAt
      });
      
    } else {
      console.log('⚠️ Not a subscription payment. Amount:', paymentAmount, 'Expected:', subscriptionAmount);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Load environment variables
require('dotenv').config();

// Run the script
manualVerifyPayment();
