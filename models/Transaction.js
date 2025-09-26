const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['subscription', 'bill_payment'],
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  productType: {
    type: String,
    enum: ['airtime', 'data'],
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  billerCode: {
    type: String,
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  itemCode: {
    type: String,
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  customerId: {
    type: String,
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  fullPrice: {
    type: Number,
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  discountedAmount: {
    type: Number,
    required: function() {
      return this.type === 'bill_payment';
    },
  },
  discountAmount: {
    type: Number,
    required: function() {
      return this.type === 'bill_payment';
    },
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
  billPaymentData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  errorMessage: {
    type: String,
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
transactionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ txRef: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Virtual for discount percentage
transactionSchema.virtual('discountPercentage').get(function() {
  if (this.type === 'bill_payment' && this.fullPrice > 0) {
    return ((this.discountAmount / this.fullPrice) * 100).toFixed(1);
  }
  return 0;
});

// Virtual for savings
transactionSchema.virtual('savings').get(function() {
  if (this.type === 'bill_payment') {
    return this.discountAmount;
  }
  return 0;
});

// Method to check if transaction is successful
transactionSchema.methods.isSuccessful = function() {
  return this.status === 'completed';
};

// Method to check if transaction is pending
transactionSchema.methods.isPending = function() {
  return this.status === 'pending';
};

// Method to check if transaction failed
transactionSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

// Method to get transaction summary
transactionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    txRef: this.txRef,
    type: this.type,
    productName: this.productName,
    status: this.status,
    amount: this.amount,
    currency: this.currency,
    createdAt: this.createdAt,
    completedAt: this.verifiedAt,
  };
};

// Method to get bill payment details
transactionSchema.methods.getBillPaymentDetails = function() {
  if (this.type !== 'bill_payment') {
    return null;
  }
  
  return {
    productName: this.productName,
    productType: this.productType,
    customerId: this.customerId,
    fullPrice: this.fullPrice,
    discountedAmount: this.discountedAmount,
    discountAmount: this.discountAmount,
    discountPercentage: this.discountPercentage,
    savings: this.savings,
    billerCode: this.billerCode,
    itemCode: this.itemCode,
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);