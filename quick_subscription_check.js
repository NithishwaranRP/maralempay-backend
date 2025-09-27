const mongoose = require('mongoose');

// Quick subscription status check
async function quickCheck() {
  try {
    console.log('🔍 Quick subscription status check...');
    
    // Connect to MongoDB Atlas
    const mongoUri = 'mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Import models
    const User = require('./models/User');
    const Subscription = require('./models/Subscription');
    
    // Find the user
    const user = await User.findOne({ email: 'nithishnt2002@gmail.com' });
    
    if (!user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('\n👤 User Details:');
    console.log('   ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.firstName, user.lastName);
    console.log('   Phone:', user.phone);
    console.log('   isSubscriber:', user.isSubscriber);
    console.log('   subscriptionStatus:', user.subscriptionStatus);
    console.log('   subscriptionDate:', user.subscriptionDate);
    console.log('   subscriptionExpiry:', user.subscriptionExpiry);
    
    // Check subscription records
    const subscriptions = await Subscription.find({ user: user._id });
    
    console.log('\n📋 Subscription Records:');
    if (subscriptions.length === 0) {
      console.log('   No subscription records found');
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`   Subscription ${index + 1}:`);
        console.log('     ID:', sub._id);
        console.log('     Status:', sub.status);
        console.log('     Payment Status:', sub.paymentStatus);
        console.log('     Amount:', sub.amount);
        console.log('     Plan Type:', sub.planType);
        console.log('     Start Date:', sub.startDate);
        console.log('     End Date:', sub.endDate);
        console.log('     Payment Reference:', sub.paymentReference);
        console.log('     Created:', sub.createdAt);
        console.log('     Updated:', sub.updatedAt);
      });
    }
    
    // Check for active subscription
    const activeSubscription = await Subscription.findOne({
      user: user._id,
      status: 'active',
      paymentStatus: 'paid',
      endDate: { $gt: new Date() }
    });
    
    console.log('\n🎯 Active Subscription Check:');
    if (activeSubscription) {
      console.log('   ✅ Active subscription found');
      console.log('   ID:', activeSubscription._id);
      console.log('   Expires:', activeSubscription.endDate);
    } else {
      console.log('   ❌ No active subscription found');
    }
    
    console.log('\n✅ Check completed successfully!');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

quickCheck();
