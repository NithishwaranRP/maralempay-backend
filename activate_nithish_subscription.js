const mongoose = require('mongoose');
const User = require('./models/User');

// Manual activation script for nithishnt2002@gmail.com
async function activateNithishSubscription() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/maralempay');
    console.log('🔗 Connected to MongoDB');

    const userEmail = 'nithishnt2002@gmail.com';
    
    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ User not found:', userEmail);
      process.exit(1);
    }
    
    console.log('👤 Current user status:', {
      user_id: user._id,
      email: user.email,
      isSubscribed: user.isSubscribed,
      subscriptionExpiry: user.subscriptionExpiry
    });
    
    // Check if already subscribed and active
    const now = new Date();
    const isCurrentlyActive = user.isSubscribed && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now;
    
    if (isCurrentlyActive) {
      console.log('✅ Subscription is already active!');
      console.log('   Expires:', user.subscriptionExpiry);
      process.exit(0);
    }
    
    // Activate subscription for 90 days from now
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 90);
    
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscriptionExpiry: subscriptionExpiry,
      subscriptionActivatedAt: new Date(),
      subscriptionPaymentRef: 'MANUAL_ACTIVATION_' + Date.now()
    });
    
    console.log('🎉 Subscription activated successfully!');
    console.log('   Expires:', subscriptionExpiry);
    console.log('   Duration: 90 days');
    
    // Verify update
    const updatedUser = await User.findById(user._id);
    console.log('✅ Updated user status:', {
      isSubscribed: updatedUser.isSubscribed,
      subscriptionExpiry: updatedUser.subscriptionExpiry,
      subscriptionActivatedAt: updatedUser.subscriptionActivatedAt
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('💾 Disconnected from MongoDB');
  }
}

// Load environment variables
require('dotenv').config();

// Run the script
activateNithishSubscription();
