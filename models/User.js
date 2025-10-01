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

// Pre-save middleware to set name if not provided
userSchema.pre('save', function(next) {
  if (!this.name && this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  this.updatedAt = new Date();
  next();
});

// Method to check if user qualifies for discount (minimum N1,000 balance)
userSchema.methods.qualifiesForDiscount = function() {
  return this.walletBalance >= 1000;
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