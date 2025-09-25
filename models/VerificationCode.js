const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  type: {
    type: String,
    enum: ['registration', 'password_reset'],
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Index for faster queries
verificationCodeSchema.index({ email: 1, type: 1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired codes

// Static method to create a new verification code
verificationCodeSchema.statics.createCode = async function(email, type) {
  // Remove any existing codes for this email and type
  await this.deleteMany({ email, type });
  
  // Generate a new 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Create new verification code
  const verificationCode = new this({
    email,
    code,
    type,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  });
  
  await verificationCode.save();
  return verificationCode;
};

// Static method to verify a code
verificationCodeSchema.statics.verifyCode = async function(email, code, type) {
  const verificationCode = await this.findOne({
    email,
    code,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationCode) {
    return { success: false, message: 'Invalid or expired verification code' };
  }
  
  // Check if too many attempts
  if (verificationCode.attempts >= 3) {
    await this.deleteOne({ _id: verificationCode._id });
    return { success: false, message: 'Too many failed attempts. Please request a new code.' };
  }
  
  // Mark as used
  verificationCode.isUsed = true;
  await verificationCode.save();
  
  return { success: true, message: 'Verification successful' };
};

// Static method to increment attempts
verificationCodeSchema.statics.incrementAttempts = async function(email, code, type) {
  await this.updateOne(
    { email, code, type, isUsed: false },
    { $inc: { attempts: 1 } }
  );
};

// Static method to clean up expired codes
verificationCodeSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true }
    ]
  });
  
  console.log(`Cleaned up ${result.deletedCount} expired verification codes`);
  return result.deletedCount;
};

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
