const User = require('../models/User');
const { generateUserToken } = require('../utils/jwt');
const { FlutterwaveService } = require('../utils/flutterwave');
const emailService = require('../services/sendpulseEmailService');
const VerificationCode = require('../models/VerificationCode');

const flutterwaveService = new FlutterwaveService();

// Register new user (pending verification)
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone number already exists'
      });
    }

    // Check if there's already a pending registration for this email
    const existingPendingUser = await User.findOne({
      email,
      isEmailVerified: false,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Within last 10 minutes
    });

    if (existingPendingUser) {
      return res.status(400).json({
        success: false,
        message: 'Registration already in progress. Please check your email for verification code or try again later.'
      });
    }

    // Handle referral code if provided
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    // Create pending user (not verified yet)
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      referredBy,
      isEmailVerified: false // Email not verified initially
    });

    await user.save();

    // Send verification code for email verification
    const verificationCode = await VerificationCode.createCode(email, 'registration');
    
    // Send email with timeout handling
    const emailPromise = emailService.sendVerificationCode(
      email, 
      verificationCode.code, 
      'registration'
    );
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 15000) // 15 second timeout
    );
    
    let emailResult;
    try {
      emailResult = await Promise.race([emailPromise, timeoutPromise]);
    } catch (error) {
      console.error('Email sending failed or timed out:', error.message);
      // Delete the pending user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Delete the pending user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration initiated successfully. Please check your email for verification code.',
      data: {
        email,
        emailVerificationRequired: true
      }
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify email and complete registration
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Verify the code
    const verificationResult = await VerificationCode.verifyCode(email, code, 'registration');

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find the pending user and complete registration
    const user = await User.findOneAndUpdate(
      { email, isEmailVerified: false },
      { isEmailVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pending registration not found. Please register again.'
      });
    }

    // Generate JWT token for the newly verified user
    const token = generateUserToken(user._id);

    // Update referrer's stats if applicable
    if (user.referredBy) {
      await User.findByIdAndUpdate(user.referredBy, {
        $inc: { totalReferrals: 1, referralRewards: 500 } // ₦500 reward per referral
      });
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Account created!',
      data: {
        user: user.getPublicProfile(),
        token,
        emailVerified: true
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address before logging in. Check your email for verification code.',
        requiresEmailVerification: true
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateUserToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // Fetch fresh user data from MongoDB instead of using req.user
    const freshUser = await User.findById(req.user._id);
    
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: freshUser.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user._id;

    // Check if phone number is already taken by another user
    if (phone && phone !== req.user.phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already taken'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Initialize subscription payment
const initializeSubscription = async (req, res) => {
  try {
    const user = req.user;
    const subscriptionAmount = parseFloat(process.env.SUBSCRIPTION_AMOUNT) || 4500;

    // Check if user is already subscribed
    if (user.isSubscribed && user.subscriptionExpiry > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    // Initialize Flutterwave payment
    const paymentResult = await flutterwaveService.initializeSubscriptionPayment(
      user,
      subscriptionAmount
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.message
      });
    }

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        paymentUrl: paymentResult.data.link,
        amount: subscriptionAmount,
        currency: process.env.SUBSCRIPTION_CURRENCY || 'NGN',
        reference: paymentResult.data.tx_ref
      }
    });
  } catch (error) {
    console.error('Initialize subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize subscription payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Verify subscription payment
const verifySubscription = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const user = req.user;

    console.log('Verifying subscription for user:', user.email, 'with transaction ID:', transactionId);

    // Check if this transaction has already been processed
    const Transaction = require('../models/Transaction');
    const existingTransaction = await Transaction.findOne({
      flutterwaveTransactionId: transactionId
    });

    if (existingTransaction) {
      console.log('Transaction already processed:', existingTransaction._id);
      return res.status(400).json({
        success: false,
        message: 'This transaction has already been processed'
      });
    }

    // For mock payments, we'll accept any transaction ID that starts with 'MOCK'
    let paymentData;
    if (transactionId.startsWith('MOCK') || transactionId.includes('mock')) {
      console.log('Processing mock payment for transaction:', transactionId);
      paymentData = {
        status: 'successful',
        amount: 100,
        flw_ref: `MOCK_REF_${Date.now()}`,
        tx_ref: `MOCK_TX_${Date.now()}`
      };
    } else {
      // Verify payment with Flutterwave for real payments
      const verificationResult = await flutterwaveService.verifyPayment(transactionId);

      if (!verificationResult.success) {
        console.log('Flutterwave verification failed:', verificationResult.message);
        return res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

      paymentData = verificationResult.data;

      // Check if payment was successful
      if (paymentData.status !== 'successful') {
        console.log('Payment not successful, status:', paymentData.status);
        return res.status(400).json({
          success: false,
          message: 'Payment was not successful'
        });
      }
    }

    console.log('Payment data:', paymentData);

    // Update user subscription
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 3); // 3 months subscription

    const updatedUser = await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscriptionDate: new Date(),
      subscriptionExpiry
    }, { new: true });

    console.log('User subscription updated:', {
      isSubscribed: updatedUser.isSubscribed,
      subscriptionExpiry: updatedUser.subscriptionExpiry
    });

    // Process referral reward if user was referred
    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        const referralReward = process.env.REFERRAL_REWARD || 500;
        
        // Update referrer's wallet balance
        await User.findByIdAndUpdate(user.referredBy, {
          $inc: { 
            walletBalance: referralReward,
            referralRewards: referralReward,
            totalReferrals: 1
          }
        });

        // Create wallet transaction for referrer
        const WalletTransaction = require('../models/WalletTransaction');
        await WalletTransaction.create({
          user: user.referredBy,
          type: 'credit',
          amount: referralReward,
          balanceBefore: referrer.walletBalance,
          balanceAfter: referrer.walletBalance + referralReward,
          description: `Referral reward for ${user.firstName} ${user.lastName}'s subscription`,
          reference: `REF_REWARD_${user._id}_${Date.now()}`,
          category: 'referral_reward',
          status: 'completed',
          metadata: {
            referredUserId: user._id,
            referredUserEmail: user.email
          }
        });

        console.log('Referral reward processed:', {
          referrerId: user.referredBy,
          referredUserId: user._id,
          rewardAmount: referralReward
        });
      }
    }

    // Create transaction record
    const newTransaction = await Transaction.create({
      user: user._id,
      type: 'subscription',
      amount: paymentData.amount,
      originalAmount: paymentData.amount,
      status: 'successful',
      flutterwaveTransactionId: transactionId,
      flutterwaveReference: paymentData.flw_ref,
      paymentReference: paymentData.tx_ref,
      processedAt: new Date(),
      description: 'MaralemPay Subscription Payment'
    });

    console.log('Transaction record created:', newTransaction._id);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscriptionExpiry,
        amount: paymentData.amount,
        transactionId: newTransaction._id
      }
    });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Reset password using verification code
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Verify the code
    const verificationResult = await VerificationCode.verifyCode(email, code, 'password_reset');

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    // Find user and update password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: email,
        passwordReset: true
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  initializeSubscription,
  verifySubscription,
  verifyEmail,
  resetPassword
};
