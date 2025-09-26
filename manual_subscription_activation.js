const mongoose = require('mongoose');
const { FlutterwaveService } = require('./utils/flutterwave');
const User = require('./models/User');
const Subscription = require('./models/Subscription');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN';
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Manually activate subscription for a specific payment reference
 */
const activateSubscriptionManually = async (paymentReference) => {
  try {
    console.log(`🔍 Looking for subscription with payment reference: ${paymentReference}`);
    
    // Find the subscription record
    const subscription = await Subscription.findOne({ paymentReference });
    
    if (!subscription) {
      console.error(`❌ No subscription found with payment reference: ${paymentReference}`);
      return;
    }
    
    console.log(`📋 Found subscription:`, {
      id: subscription._id,
      user: subscription.user,
      status: subscription.status,
      paymentStatus: subscription.paymentStatus,
      amount: subscription.amount,
      startDate: subscription.startDate,
      endDate: subscription.endDate
    });
    
    // Find the user
    const user = await User.findById(subscription.user);
    if (!user) {
      console.error(`❌ User not found for subscription: ${subscription.user}`);
      return;
    }
    
    console.log(`👤 Found user:`, {
      id: user._id,
      email: user.email,
      isSubscriber: user.isSubscriber,
      subscriptionStatus: user.subscriptionStatus
    });
    
    // Verify payment with Flutterwave
    console.log(`🔍 Verifying payment with Flutterwave for reference: ${paymentReference}`);
    const flutterwaveService = new FlutterwaveService();
    const verificationResult = await flutterwaveService.verifyPayment(paymentReference);
    
    if (!verificationResult.success) {
      console.error(`❌ Flutterwave verification failed:`, verificationResult.message);
      return;
    }
    
    console.log(`✅ Flutterwave verification successful:`, {
      status: verificationResult.data.status,
      amount: verificationResult.data.amount,
      currency: verificationResult.data.currency
    });
    
    // Update subscription record
    console.log(`🔄 Updating subscription record...`);
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        status: 'active',
        paymentStatus: 'paid',
        startDate: new Date(),
        endDate: subscription.endDate || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
      },
      { new: true }
    );
    
    console.log(`✅ Subscription updated:`, {
      id: updatedSubscription._id,
      status: updatedSubscription.status,
      paymentStatus: updatedSubscription.paymentStatus,
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate
    });
    
    // Update user record
    console.log(`🔄 Updating user record...`);
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionDate: new Date(),
        subscriptionExpiry: updatedSubscription.endDate
      },
      { new: true }
    );
    
    console.log(`✅ User updated:`, {
      id: updatedUser._id,
      email: updatedUser.email,
      isSubscriber: updatedUser.isSubscriber,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionDate: updatedUser.subscriptionDate,
      subscriptionExpiry: updatedUser.subscriptionExpiry
    });
    
    console.log(`🎉 SUBSCRIPTION ACTIVATION COMPLETE!`);
    console.log(`User ${user.email} is now an active subscriber until ${updatedSubscription.endDate}`);
    
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectDB();
    
    // The specific payment reference from your analysis
    const paymentReference = 'SUB_68d6b6d5eb1ae09ba3d625f6_1758910960171_sycymkq27';
    
    console.log(`🚀 Starting manual subscription activation for: ${paymentReference}`);
    await activateSubscriptionManually(paymentReference);
    
  } catch (error) {
    console.error('❌ Script execution failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { activateSubscriptionManually };
