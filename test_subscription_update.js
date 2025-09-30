const mongoose = require('mongoose');
const User = require('./models/User');
const Subscription = require('./models/Subscription');

// Test subscription update functionality
async function testSubscriptionUpdate() {
  try {
    console.log('🧪 Testing subscription update functionality...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Find a user to test with
    const user = await User.findOne({ email: 'nithishnt2002@gmail.com' });
    
    if (!user) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('👤 Test user found:', {
      id: user._id,
      email: user.email,
      isSubscriber: user.isSubscriber,
      subscriptionStatus: user.subscriptionStatus
    });
    
    // Test 1: Update user subscription status
    console.log('\n🔄 Test 1: Updating user subscription status...');
    
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 6);
    
    const updatedUser = await User.findByIdAndUpdate(user._id, {
      isSubscriber: true,
      subscriptionStatus: 'active',
      subscriptionDate: new Date(),
      subscriptionExpiry: subscriptionExpiry,
      updatedAt: new Date()
    }, { new: true });
    
    if (updatedUser) {
      console.log('✅ User subscription status updated successfully');
      console.log('   isSubscriber:', updatedUser.isSubscriber);
      console.log('   subscriptionStatus:', updatedUser.subscriptionStatus);
      console.log('   subscriptionExpiry:', updatedUser.subscriptionExpiry);
    } else {
      console.error('❌ Failed to update user subscription status');
    }
    
    // Test 2: Create/update subscription record
    console.log('\n🔄 Test 2: Creating/updating subscription record...');
    
    let subscription = await Subscription.findOne({ user: user._id });
    
    if (subscription) {
      // Update existing subscription
      subscription.status = 'active';
      subscription.paymentStatus = 'paid';
      subscription.amount = 750;
      subscription.startDate = new Date();
      subscription.endDate = subscriptionExpiry;
      subscription.paymentReference = 'TEST_SUB_' + Date.now();
      subscription.updatedAt = new Date();
      await subscription.save();
      
      console.log('✅ Existing subscription updated');
    } else {
      // Create new subscription
      subscription = new Subscription({
        user: user._id,
        planType: '6_months',
        amount: 750,
        duration: 6,
        durationUnit: 'months',
        startDate: new Date(),
        endDate: subscriptionExpiry,
        status: 'active',
        paymentStatus: 'paid',
        paymentReference: 'TEST_SUB_' + Date.now(),
        discountPercentage: 10,
        benefits: {
          airtimeDiscount: 10,
          dataDiscount: 10,
          billPaymentDiscount: 10
        }
      });
      
      await subscription.save();
      console.log('✅ New subscription created');
    }
    
    console.log('📋 Subscription details:', {
      id: subscription._id,
      status: subscription.status,
      paymentStatus: subscription.paymentStatus,
      amount: subscription.amount,
      planType: subscription.planType,
      startDate: subscription.startDate,
      endDate: subscription.endDate
    });
    
    // Test 3: Verify final state
    console.log('\n🔍 Test 3: Verifying final state...');
    
    const finalUser = await User.findById(user._id);
    const finalSubscription = await Subscription.findOne({ user: user._id });
    
    console.log('👤 Final user state:', {
      isSubscriber: finalUser.isSubscriber,
      subscriptionStatus: finalUser.subscriptionStatus,
      subscriptionExpiry: finalUser.subscriptionExpiry
    });
    
    console.log('📋 Final subscription state:', {
      status: finalSubscription.status,
      paymentStatus: finalSubscription.paymentStatus,
      amount: finalSubscription.amount
    });
    
    // Test 4: Test subscription verification
    console.log('\n🔍 Test 4: Testing subscription verification...');
    
    const activeSubscription = await Subscription.findOne({
      user: user._id,
      status: 'active',
      paymentStatus: 'paid',
      endDate: { $gt: new Date() }
    });
    
    const hasActiveSubscription = !!activeSubscription;
    
    console.log('✅ Subscription verification result:', {
      hasActiveSubscription: hasActiveSubscription,
      subscriptionId: activeSubscription?._id
    });
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testSubscriptionUpdate();
