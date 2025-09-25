const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Beneficiary name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^(\+234|234|0)?[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number']
  },
  network: {
    type: String,
    required: [true, 'Network is required'],
    enum: ['MTN', 'AIRTEL', 'GLO', '9MOBILE']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
beneficiarySchema.index({ user: 1, phoneNumber: 1 });
beneficiarySchema.index({ user: 1, isDefault: 1 });

// Ensure only one default beneficiary per user
beneficiarySchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Ensure maximum 5 beneficiaries per user
beneficiarySchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ user: this.user });
    if (count >= 5) {
      return next(new Error('Maximum of 5 beneficiaries allowed per user'));
    }
  }
  next();
});

// Instance method to get public profile
beneficiarySchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    phoneNumber: this.phoneNumber,
    network: this.network,
    isDefault: this.isDefault,
    usageCount: this.usageCount,
    lastUsed: this.lastUsed,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Beneficiary', beneficiarySchema);
