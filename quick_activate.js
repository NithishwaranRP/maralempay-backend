require('dotenv').config();
const mongoose = require('mongoose');

// Quick activation script
async function quickActivate() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    // Connect to MongoDB using the environment variable
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Import User model
    const User = require('./models/User');
    
    const userEmail = 'nithishnt2002@gmail.com';
    
    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ User not found:', userEmail);
      return;
    }
    
    console.log('👤 Found user:', user.email);
    console.log('📊 Current status:', {
      isSubscribed: user.isSubscribed,
      subscriptionExpiry: user.subscriptionExpiry
    });
    
    // Set subscription expiry to 90 days from now
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 90);
    
    // Update user subscription
    const result = await User.updateOne(
      { email: userEmail },
      {
        $set: {
          isSubscribed: true,
          subscriptionExpiry: subscriptionExpiry,
          subscriptionActivatedAt: new Date()
        }
      }
    );
    
    console.log('🎉 Subscription activated!');
    console.log('📅 Expires:', subscriptionExpiry.toISOString());
    console.log('🔧 Update result:', result);
    
    // Verify the update
    const updatedUser = await User.findOne({ email: userEmail });
    console.log('✅ Verification:', {
      isSubscribed: updatedUser.isSubscribed,
      subscriptionExpiry: updatedUser.subscriptionExpiry,
      subscriptionActivatedAt: updatedUser.subscriptionActivatedAt
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('💾 Disconnected from MongoDB');
  }
}

quickActivate();
