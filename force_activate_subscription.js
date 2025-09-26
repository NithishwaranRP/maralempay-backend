const mongoose = require('mongoose');
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
 * Force activate subscription without Flutterwave verification
 * This is for cases where we know the payment was successful but Flutterwave verification fails
 */
const forceActivateSubscription = async (paymentReference) => {
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
    
    // Force update subscription record (skip Flutterwave verification)
    console.log(`🔄 Force updating subscription record...`);
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
    
    console.log(`🎉 SUBSCRIPTION FORCE ACTIVATION COMPLETE!`);
    console.log(`User ${user.email} is now an active subscriber until ${updatedSubscription.endDate}`);
    console.log(`⚠️  Note: This activation was done without Flutterwave verification due to API issues.`);
    
  } catch (error) {
    console.error('❌ Error force activating subscription:', error);
  }
};

/**
 * Force activate all pending subscriptions
 */
const forceActivateAllPending = async () => {
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
    
    let activatedCount = 0;
    let failedCount = 0;
    
    for (const subscription of pendingSubscriptions) {
      try {
        console.log(`\n🔄 Force processing subscription ${subscription._id} for user ${subscription.user.email}`);
        
        // Force update subscription record
        console.log(`🔄 Force updating subscription record...`);
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
        
        console.log(`🎉 Subscription force activated for ${subscription.user.email}`);
        activatedCount++;
        
      } catch (error) {
        console.error(`❌ Error force processing subscription ${subscription._id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Successfully force activated: ${activatedCount} subscriptions`);
    console.log(`❌ Failed to activate: ${failedCount} subscriptions`);
    console.log(`⚠️  Note: Activations were done without Flutterwave verification due to API issues.`);
    
  } catch (error) {
    console.error('❌ Error force activating pending subscriptions:', error);
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectDB();
    
    // Get command line argument for specific reference or activate all
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0] !== 'all') {
      // Activate specific subscription
      const paymentReference = args[0];
      console.log(`🚀 Starting force activation for specific subscription: ${paymentReference}`);
      await forceActivateSubscription(paymentReference);
    } else {
      // Activate all pending subscriptions
      console.log(`🚀 Starting force activation of all pending subscriptions...`);
      await forceActivateAllPending();
    }
    
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

module.exports = { forceActivateSubscription, forceActivateAllPending };
