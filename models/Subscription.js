const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  txRef: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  flutterwaveId: {
    type: String,
    required: true,
  },
  checkoutUrl: {
    type: String,
    required: true,
  },
  paymentData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ txRef: 1 });
subscriptionSchema.index({ createdAt: -1 });

// Virtual for subscription duration
subscriptionSchema.virtual('duration').get(function() {
  return '6 months';
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'completed';
};

// Method to get subscription info
subscriptionSchema.methods.getInfo = function() {
  return {
    id: this._id,
    txRef: this.txRef,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    duration: this.duration,
    createdAt: this.createdAt,
    verifiedAt: this.verifiedAt,
  };
};

module.exports = mongoose.model('Subscription', subscriptionSchema);