const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: ['6_months'],
    required: true,
    default: '6_months'
  },
  amount: {
    type: Number,
    required: true,
    default: 4500 // 4500 NGN for 6 months
  },
  duration: {
    type: Number,
    required: true,
    default: 6 // 6 months
  },
  durationUnit: {
    type: String,
    enum: ['months'],
    required: true,
    default: 'months'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paymentReference: {
    type: String,
    required: true
  },
  flutterwaveRef: {
    type: String,
    default: null
  },
  discountPercentage: {
    type: Number,
    default: 10 // 10% discount on airtime and data
  },
  benefits: {
    airtimeDiscount: {
      type: Number,
      default: 10
    },
    dataDiscount: {
      type: Number,
      default: 10
    },
    billPaymentDiscount: {
      type: Number,
      default: 10
    }
  },
  metadata: {
    paymentMethod: String,
    transactionId: String,
    notes: String
  }
}, {
  timestamps: true
});

// Index for better query performance
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ paymentReference: 1 });

// Pre-save middleware to calculate end date
subscriptionSchema.pre('save', function(next) {
  if (this.isNew && !this.endDate) {
    const startDate = new Date(this.startDate);
    this.endDate = new Date(startDate.getTime() + (this.duration * 30 * 24 * 60 * 60 * 1000)); // 30 days per month
  }
  next();
});

// Instance method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && this.endDate > now;
};

// Instance method to get days remaining
subscriptionSchema.methods.getDaysRemaining = function() {
  const now = new Date();
  const diffTime = this.endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Static method to get active subscription for user
subscriptionSchema.statics.getActiveSubscription = async function(userId) {
  return await this.findOne({
    user: userId,
    status: 'active',
    endDate: { $gt: new Date() }
  });
};

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
