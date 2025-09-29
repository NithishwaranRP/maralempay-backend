const mongoose = require('mongoose');

// MongoDB Transaction Schema for idempotency and status tracking
const transactionSchema = new mongoose.Schema({
  tx_ref: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  biller_code: { 
    type: String, 
    required: true 
  },
  item_code: { 
    type: String 
  },
  fullAmount: { 
    type: Number, 
    required: true 
  },
  userAmount: { 
    type: Number, 
    required: true 
  },
  isSubscriber: { 
    type: Boolean, 
    default: false 
  },
  status: { 
    type: String, 
    enum: ['initialized', 'paid', 'delivered', 'successful', 'payment_completed', 'fulfilled', 'fulfillment_failed', 'failed', 'refunded', 'failed_refunded'],
    default: 'initialized',
    index: true
  },
  flutterwave_transaction_id: { 
    type: String,
    index: true 
  },
  biller_reference: { 
    type: String 
  },
  biller_status: { 
    type: String 
  },
  fulfillmentData: {
    billPaymentId: String,
    billPaymentRef: String,
    fullAmount: Number,
    discountAmount: Number,
    fulfillmentDate: Date,
    error: String,
    failureDate: Date,
  },
  deliveredAt: { 
    type: Date 
  },
  refundedAt: { 
    type: Date 
  },
  refund_amount: { 
    type: Number 
  },
  idempotency_key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  error_logs: [{ 
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    error: String,
    context: String
  }]
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ phone: 1, createdAt: -1 });
transactionSchema.index({ biller_code: 1, createdAt: -1 });

// Virtual for discount amount
transactionSchema.virtual('discountAmount').get(function() {
  return this.fullAmount - this.userAmount;
});

// Method to add error log
transactionSchema.methods.addErrorLog = function(error, context) {
  this.error_logs.push({
    timestamp: new Date(),
    error: error.toString(),
    context: context || 'Unknown'
  });
  this.updatedAt = new Date();
  return this.save();
};

// Method to update status
transactionSchema.methods.updateStatus = function(newStatus, additionalData = {}) {
  this.status = newStatus;
  this.updatedAt = new Date();
  
  // Set specific timestamps based on status
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  } else if (newStatus === 'refunded' || newStatus === 'failed_refunded') {
    this.refundedAt = new Date();
  }
  
  // Update additional fields
  Object.keys(additionalData).forEach(key => {
    if (this.schema.paths[key]) {
      this[key] = additionalData[key];
    }
  });
  
  return this.save();
};

// Static method to find by tx_ref
transactionSchema.statics.findByTxRef = function(txRef) {
  return this.findOne({ tx_ref: txRef });
};

// Static method to find by transaction ID
transactionSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ flutterwave_transaction_id: transactionId });
};

// Static method to get user transactions
transactionSchema.statics.getUserTransactions = function(userId, limit = 10, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get transactions by status
transactionSchema.statics.getTransactionsByStatus = function(status, limit = 50, skip = 0) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get failed transactions for retry
transactionSchema.statics.getFailedTransactions = function(hoursAgo = 24) {
  const cutoffDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
  return this.find({
    status: { $in: ['failed', 'failed_refunded'] },
    createdAt: { $gte: cutoffDate }
  }).sort({ createdAt: -1 });
};

// Pre-save middleware to update updatedAt
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-save middleware to validate amounts
transactionSchema.pre('save', function(next) {
  if (this.fullAmount <= 0) {
    return next(new Error('fullAmount must be greater than 0'));
  }
  if (this.userAmount <= 0) {
    return next(new Error('userAmount must be greater than 0'));
  }
  if (this.userAmount > this.fullAmount) {
    return next(new Error('userAmount cannot be greater than fullAmount'));
  }
  next();
});

// Export the model
module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);