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
 * Find and activate all pending subscriptions
 */
const activatePendingSubscriptions = async () => {
  try {
    console.log(`🔍 Looking for pending subscriptions...`);
    
    // Find all subscriptions with pending payment status
    const pendingSubscriptions = await Subscription.find({ 
      paymentStatus: 'pending',
      status: 'active' // Only process active subscriptions
    }).populate('user');
    
    if (pendingSubscriptions.length === 0) {
      console.log(`✅ No pending subscriptions found`);
      return;
    }
    
    console.log(`📋 Found ${pendingSubscriptions.length} pending subscriptions`);
    
    const flutterwaveService = new FlutterwaveService();
    let activatedCount = 0;
    let failedCount = 0;
    
    for (const subscription of pendingSubscriptions) {
      try {
        console.log(`\n🔄 Processing subscription ${subscription._id} for user ${subscription.user.email}`);
        
        // Verify payment with Flutterwave
        console.log(`🔍 Verifying payment with Flutterwave for reference: ${subscription.paymentReference}`);
        const verificationResult = await flutterwaveService.verifyPayment(subscription.paymentReference);
        
        if (!verificationResult.success) {
          console.error(`❌ Flutterwave verification failed for ${subscription.paymentReference}:`, verificationResult.message);
          failedCount++;
          continue;
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
            paymentStatus: 'paid',
            startDate: new Date(),
            endDate: subscription.endDate || new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000) // 6 months
          },
          { new: true }
        );
        
        console.log(`✅ Subscription updated:`, {
          id: updatedSubscription._id,
          status: updatedSubscription.status,
          paymentStatus: updatedSubscription.paymentStatus
        });
        
        // Update user record
        console.log(`🔄 Updating user record...`);
        const updatedUser = await User.findByIdAndUpdate(
          subscription.user._id,
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
          subscriptionStatus: updatedUser.subscriptionStatus
        });
        
        console.log(`🎉 Subscription activated for ${subscription.user.email}`);
        activatedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription._id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Successfully activated: ${activatedCount} subscriptions`);
    console.log(`❌ Failed to activate: ${failedCount} subscriptions`);
    
  } catch (error) {
    console.error('❌ Error activating pending subscriptions:', error);
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectDB();
    
    console.log(`🚀 Starting activation of all pending subscriptions...`);
    await activatePendingSubscriptions();
    
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

module.exports = { activatePendingSubscriptions };
