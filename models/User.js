const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema for real user data
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Removed subscription fields - now using wallet-based discount system
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalReferrals: {
    type: Number,
    default: 0
  },
  referralRewards: {
    type: Number,
    default: 0
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  lockedBalance: {
    type: Number,
    default: 0
  },
  isLockedBalanceEnabled: {
    type: Boolean,
    default: true
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ walletBalance: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to set name if not provided and update locked balance
userSchema.pre('save', function(next) {
  if (!this.name && this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  
  // Update locked balance if wallet balance has changed
  if (this.isModified('walletBalance')) {
    this.updateLockedBalance();
  }
  
  this.updatedAt = new Date();
  next();
});

// Method to check if user qualifies for discount (minimum N1,000 balance)
userSchema.methods.qualifiesForDiscount = function() {
  return this.walletBalance >= 1000;
};

// Method to get available balance (total - locked)
userSchema.methods.getAvailableBalance = function() {
  if (!this.isLockedBalanceEnabled) {
    return this.walletBalance;
  }
  return Math.max(0, this.walletBalance - this.lockedBalance);
};

// Method to get locked balance amount
userSchema.methods.getLockedBalance = function() {
  if (!this.isLockedBalanceEnabled) {
    return 0;
  }
  return Math.min(this.lockedBalance, this.walletBalance);
};

// Method to check if user can spend amount (considering locked balance)
userSchema.methods.canSpend = function(amount) {
  return this.getAvailableBalance() >= amount;
};

// Method to update locked balance when wallet balance changes
userSchema.methods.updateLockedBalance = function() {
  if (!this.isLockedBalanceEnabled) {
    this.lockedBalance = 0;
    return;
  }
  
  // Lock minimum N1,000 if wallet balance is >= 1000
  if (this.walletBalance >= 1000) {
    this.lockedBalance = Math.min(1000, this.walletBalance);
  } else {
    this.lockedBalance = 0;
  }
};

// Static method to process referral reward when user funds wallet
userSchema.statics.processReferralReward = async function(userId, fundingAmount) {
  try {
    const user = await this.findById(userId);
    if (!user || !user.referredBy) {
      return null; // No referral or user not found
    }

    const referrer = await this.findById(user.referredBy);
    if (!referrer) {
      return null; // Referrer not found
    }

    // Check if this is the first wallet funding for the referred user
    const existingFunding = await WalletTransaction.findOne({
      user: userId,
      type: 'funding',
      status: 'completed'
    });

    // Only give reward on first successful funding
    if (existingFunding) {
      return null; // Already received reward for this user
    }

    const rewardAmount = 50; // ₦50 reward

    // Add reward to referrer's wallet
    referrer.walletBalance += rewardAmount;
    referrer.referralRewards += rewardAmount;
    await referrer.save();

    // Create referral reward transaction
    const WalletTransaction = require('./WalletTransaction');
    const referralTransaction = new WalletTransaction({
      user: referrer._id,
      type: 'referral_reward',
      amount: rewardAmount,
      balanceAfter: referrer.walletBalance,
      description: `Referral reward for ${user.firstName} ${user.lastName}`,
      category: 'referral',
      status: 'completed',
      metadata: {
        referredUserId: userId,
        referredUserName: `${user.firstName} ${user.lastName}`,
        fundingAmount: fundingAmount
      }
    });

    await referralTransaction.save();

    console.log(`🎉 Referral reward processed: ${referrer.email} received ₦${rewardAmount} for referring ${user.email}`);

    return {
      referrer: referrer,
      rewardAmount: rewardAmount,
      transaction: referralTransaction
    };
  } catch (error) {
    console.error('❌ Error processing referral reward:', error);
    return null;
  }
};

// Static method to find users with minimum balance for discounts
userSchema.statics.findDiscountEligibleUsers = function() {
  return this.find({
    walletBalance: { $gte: 1000 }
  });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by phone
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
    phone: this.phone,
    isEmailVerified: this.isEmailVerified,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    totalReferrals: this.totalReferrals,
    referralRewards: this.referralRewards,
    walletBalance: this.walletBalance,
    availableBalance: this.getAvailableBalance(),
    lockedBalance: this.getLockedBalance(),
    isLockedBalanceEnabled: this.isLockedBalanceEnabled,
    qualifiesForDiscount: this.qualifiesForDiscount(),
    referralCode: this.referralCode,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    // Generate a unique referral code
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referralCode = `REF${randomString}`;
  }
  next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);