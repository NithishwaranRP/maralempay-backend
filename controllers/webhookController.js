const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { FlutterwaveService } = require('../utils/flutterwave');
// Import email service conditionally to avoid initialization errors during testing
let emailService;
try {
  emailService = require('../services/sendpulseEmailService');
} catch (error) {
  console.warn('⚠️ SendPulse email service not available:', error.message);
  emailService = null;
}

// Initialize Flutterwave service conditionally to avoid initialization errors during testing
let flutterwaveService;
try {
  flutterwaveService = new FlutterwaveService();
} catch (error) {
  console.warn('⚠️ Flutterwave service not available:', error.message);
  flutterwaveService = null;
}

/**
 * Handle Flutterwave payment webhook
 * POST /api/webhooks/flutterwave
 */
const handleFlutterwaveWebhook = async (req, res) => {
  try {
    console.log('🔔 Flutterwave webhook received:', req.body);
    
    const { event, data } = req.body;
    
    if (event === 'charge.completed' && data.status === 'successful') {
      await processSuccessfulPayment(data);
    }
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Process successful payment and initiate bill fulfillment
 */
const processSuccessfulPayment = async (paymentData) => {
  try {
    console.log('💳 Processing successful payment:', paymentData.tx_ref);
    
    const { tx_ref, amount, customer, meta } = paymentData;
    
    // Extract metadata
    const billItemId = meta?.bill_item_id;
    const billerCode = meta?.biller_code;
    const productName = meta?.product_name;
    const paymentType = meta?.payment_type; // 'airtime' or 'data'
    const phoneNumber = customer?.phone_number;
    const customerEmail = customer?.email;
    
    console.log('📋 Payment metadata:', {
      billItemId,
      billerCode,
      productName,
      paymentType,
      phoneNumber,
      customerEmail,
            amount
          });
          
    // Find user by email
    const user = await User.findOne({ email: customerEmail });
    if (!user) {
      console.error('❌ User not found for email:', customerEmail);
      return;
    }
    
    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: paymentType === 'airtime' ? 'airtime_purchase' : 'data_purchase',
      amount: parseFloat(amount),
      currency: 'NGN',
      status: 'payment_completed',
      reference: tx_ref,
      description: `${productName} for ${phoneNumber}`,
      metadata: {
        billItemId,
        billerCode,
        productName,
        paymentType,
        phoneNumber,
        customerEmail,
        flutterwaveRef: paymentData.flw_ref,
        originalAmount: meta?.original_amount,
        discountApplied: meta?.discount_applied,
        discountAmount: meta?.discount_amount,
      }
    });
    
    await transaction.save();
    console.log('✅ Transaction record created:', transaction._id);
    
    // Process bill payment with full amount
    await processBillPayment({
      user,
      transaction,
      billerCode,
      billItemId,
      phoneNumber,
      productName,
      paymentType,
      customerEmail,
      originalAmount: meta?.original_amount || amount,
      discountedAmount: amount,
    });
    
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
  }
};

/**
 * Process bill payment with full amount (backend covers the difference)
 */
const processBillPayment = async ({
  user,
  transaction,
  billerCode,
  billItemId,
  phoneNumber,
  productName,
  paymentType,
  customerEmail,
  originalAmount,
  discountedAmount
}) => {
  try {
    console.log('💳 Processing bill payment with full amount...');
    console.log('   Original Amount: ₦' + originalAmount);
    console.log('   Discounted Amount: ₦' + discountedAmount);
    console.log('   Difference (covered by merchant): ₦' + (originalAmount - discountedAmount));
    
    // Prepare bill payment request
    const billPaymentData = {
                country: 'NG',
      customer: phoneNumber,
      amount: parseFloat(originalAmount), // Use full amount
                recurrence: 'ONCE',
      type: paymentType === 'airtime' ? 'AIRTIME' : 'DATA',
      reference: `MARALEM_${Date.now()}_${transaction._id}`,
      biller_name: billerCode,
    };
    
    console.log('📤 Sending bill payment request:', billPaymentData);
    
    // Call Flutterwave Bill Payment API
    if (!flutterwaveService) {
      throw new Error('Flutterwave service not available');
    }
    const billResponse = await flutterwaveService.createBillPayment(billPaymentData);
    
    if (billResponse.success) {
      console.log('✅ Bill payment successful:', billResponse.data);
      
      // Update transaction status
      transaction.status = 'fulfilled';
      transaction.fulfillmentData = {
        billPaymentId: billResponse.data.id,
        billPaymentRef: billResponse.data.tx_ref,
        fullAmount: originalAmount,
        discountAmount: originalAmount - discountedAmount,
        fulfillmentDate: new Date(),
      };
      await transaction.save();
      
      // Send success email
      await sendPurchaseSuccessEmail({
        customerEmail,
        productName,
        phoneNumber,
        originalAmount,
        discountedAmount,
        transactionRef: transaction.reference,
      });
      
              } else {
      console.error('❌ Bill payment failed:', billResponse.message);
      
      // Update transaction status
      transaction.status = 'fulfillment_failed';
      transaction.fulfillmentData = {
        error: billResponse.message,
        failureDate: new Date(),
      };
      await transaction.save();
      
      // Send failure email
      await sendPurchaseFailureEmail({
        customerEmail,
        productName,
        phoneNumber,
        originalAmount,
        discountedAmount,
        transactionRef: transaction.reference,
        errorMessage: billResponse.message,
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing bill payment:', error);
    
    // Update transaction status
    transaction.status = 'fulfillment_failed';
    transaction.fulfillmentData = {
      error: error.message,
      failureDate: new Date(),
    };
    await transaction.save();
    
    // Send failure email
    await sendPurchaseFailureEmail({
      customerEmail,
      productName,
      phoneNumber,
      originalAmount,
      discountedAmount,
      transactionRef: transaction.reference,
      errorMessage: error.message,
    });
  }
};

/**
 * Send purchase success email
 */
const sendPurchaseSuccessEmail = async ({
  customerEmail,
  productName,
  phoneNumber,
  originalAmount,
  discountedAmount,
  transactionRef,
}) => {
  try {
    console.log('📧 Sending purchase success email to:', customerEmail);
    
    const subject = `${productName} Purchase Completed - MaralemPay`;
    const savings = originalAmount - discountedAmount;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976D2; margin: 0;">MaralemPay</h1>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">🎉 Purchase Completed Successfully!</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1976D2; margin-top: 0;">Purchase Details</h3>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
            <p><strong>Original Price:</strong> ₦${originalAmount}</p>
            <p><strong>Amount Paid:</strong> ₦${discountedAmount}</p>
            <p><strong>You Saved:</strong> ₦${savings}</p>
            <p><strong>Transaction Ref:</strong> ${transactionRef}</p>
          </div>
          
          <p style="color: #666; font-size: 16px; margin-bottom: 0;">
            Your ${productName.toLowerCase()} has been successfully delivered to ${phoneNumber}.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Thank you for choosing MaralemPay!
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
            © 2025 MaralemPay. All rights reserved.
          </p>
        </div>
      </div>
    `;
    
    const textContent = `
      MaralemPay - Purchase Completed Successfully!
      
      Product: ${productName}
      Phone Number: ${phoneNumber}
      Original Price: ₦${originalAmount}
      Amount Paid: ₦${discountedAmount}
      You Saved: ₦${savings}
      Transaction Ref: ${transactionRef}
      
      Your ${productName.toLowerCase()} has been successfully delivered to ${phoneNumber}.
      
      Thank you for choosing MaralemPay!
      
      © 2025 MaralemPay. All rights reserved.
    `;
    
    if (emailService) {
      await emailService.sendCustomEmail({
        to: customerEmail,
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
      });
      console.log('✅ Purchase success email sent successfully');
    } else {
      console.warn('⚠️ Email service not available, skipping success email');
    }
    
  } catch (error) {
    console.error('❌ Error sending purchase success email:', error);
  }
};

/**
 * Send purchase failure email
 */
const sendPurchaseFailureEmail = async ({
  customerEmail,
  productName,
  phoneNumber,
  originalAmount,
  discountedAmount,
  transactionRef,
  errorMessage,
}) => {
  try {
    console.log('📧 Sending purchase failure email to:', customerEmail);
    
    const subject = `${productName} Purchase Failed - MaralemPay`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976D2; margin: 0;">MaralemPay</h1>
        </div>
        
        <div style="background-color: #fff3cd; padding: 30px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h2 style="color: #856404; margin-top: 0;">⚠️ Purchase Failed</h2>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Purchase Details</h3>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
            <p><strong>Amount Paid:</strong> ₦${discountedAmount}</p>
            <p><strong>Transaction Ref:</strong> ${transactionRef}</p>
            <p><strong>Error:</strong> ${errorMessage}</p>
          </div>
          
          <p style="color: #856404; font-size: 16px; margin-bottom: 0;">
            Unfortunately, we were unable to complete your ${productName.toLowerCase()} purchase. 
            Your payment has been processed, but the service delivery failed.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin-top: 0;">What happens next?</h3>
          <ul style="color: #0c5460;">
            <li>Your payment will be refunded within 24-48 hours</li>
            <li>You can try the purchase again</li>
            <li>Contact support if you need assistance</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            We apologize for any inconvenience caused.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
            © 2025 MaralemPay. All rights reserved.
          </p>
        </div>
      </div>
    `;
    
    const textContent = `
      MaralemPay - Purchase Failed
      
      Product: ${productName}
      Phone Number: ${phoneNumber}
      Amount Paid: ₦${discountedAmount}
      Transaction Ref: ${transactionRef}
      Error: ${errorMessage}
      
      Unfortunately, we were unable to complete your ${productName.toLowerCase()} purchase. 
      Your payment has been processed, but the service delivery failed.
      
      What happens next?
      - Your payment will be refunded within 24-48 hours
      - You can try the purchase again
      - Contact support if you need assistance
      
      We apologize for any inconvenience caused.
      
      © 2025 MaralemPay. All rights reserved.
    `;
    
    if (emailService) {
      await emailService.sendCustomEmail({
        to: customerEmail,
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
      });
      console.log('✅ Purchase failure email sent successfully');
    } else {
      console.warn('⚠️ Email service not available, skipping failure email');
    }
    
  } catch (error) {
    console.error('❌ Error sending purchase failure email:', error);
  }
};

/**
 * Handle general payment webhook (for compatibility)
 * POST /api/webhooks/payment
 */
const handlePaymentWebhook = async (req, res) => {
  try {
    console.log('🔔 General payment webhook received:', req.body);
    
    // For now, redirect to Flutterwave webhook handler
    return await handleFlutterwaveWebhook(req, res);
  } catch (error) {
    console.error('❌ Payment webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle bill payment callback (for compatibility)
 * POST /api/webhooks/bill-payment
 */
const handleBillPaymentCallback = async (req, res) => {
  try {
    console.log('🔔 Bill payment callback received:', req.body);
    
    // This endpoint can be used for bill payment status updates
    const { status, reference, amount } = req.body;
      
      if (status === 'successful') {
      // Update transaction status to fulfilled
      const transaction = await Transaction.findOne({ reference });
      if (transaction) {
        transaction.status = 'fulfilled';
        transaction.deliveredAt = new Date();
        await transaction.save();
        console.log('✅ Transaction status updated to fulfilled:', reference);
      }
    }
    
    res.status(200).json({ success: true, message: 'Callback processed' });
  } catch (error) {
    console.error('❌ Bill payment callback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  handlePaymentWebhook,
  handleBillPaymentCallback,
  processSuccessfulPayment,
  processBillPayment,
};