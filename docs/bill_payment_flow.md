# Complete Bill Payment Flow Implementation

## 🔄 Flow Overview

This document describes the complete bill payment flow implementation with the following steps:

1. **Fetch bill items** → user selects plan
2. **Apply discount** → calculate discounted amount  
3. **Create Flutterwave Hosted Link** with `payment_options: "card,ussd"`
4. **Save transaction in DB** with status `pending`
5. **Implement webhook** `/payment/callback` to verify the transaction and mark bill as paid
6. **Retry or finalize purchase** automatically when confirmed
7. **Return proper response** to the app (success, pending, failed)

## 📡 API Endpoints

### 1. Get Bill Items
```
GET /api/bills
GET /api/bills?category=1
GET /api/bills?biller_code=BIL108
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [...],
    "billers": [...],
    "items": [...]
  }
}
```

### 2. Create Bill Payment
```
POST /api/bills/pay
```

**Request Body:**
```json
{
  "biller_code": "BIL108",
  "variation_code": "MTN_500MB",
  "amount": 200,
  "phone_number": "08068621706",
  "plan_name": "500MB - 30 Days",
  "customer_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment session created successfully",
  "data": {
    "link": "https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-...",
    "txRef": "BILL_123_1640995200000_abc123",
    "originalAmount": 200,
    "discountedAmount": 180,
    "discountAmount": 20,
    "hasActiveSubscription": true,
    "billItem": {
      "id": "MTN_500MB",
      "name": "500MB - 30 Days",
      "amount": 200,
      "type": "data"
    }
  }
}
```

### 3. Verify Payment
```
GET /api/bills/verify/:transaction_id
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Payment successful and bill delivered",
  "data": {
    "transaction_id": "507f1f77bcf86cd799439011",
    "tx_ref": "BILL_123_1640995200000_abc123",
    "status": "completed",
    "amount": 180,
    "originalAmount": 200,
    "discountAmount": 20,
    "billerCode": "BIL108",
    "variationCode": "MTN_500MB",
    "phoneNumber": "08068621706",
    "planName": "500MB - 30 Days"
  }
}
```

### 4. Payment Callback (Webhook Alternative)
```
GET /api/bills/callback/:transaction_id?status=successful&tx_ref=BILL_123_...
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Payment successful and bill delivered",
  "data": {
    "transaction_id": "507f1f77bcf86cd799439011",
    "tx_ref": "BILL_123_1640995200000_abc123",
    "status": "completed",
    "amount": 180,
    "originalAmount": 200,
    "discountAmount": 20,
    "billerCode": "BIL108",
    "variationCode": "MTN_500MB",
    "phoneNumber": "08068621706",
    "planName": "500MB - 30 Days"
  }
}
```

### 5. Retry Pending Payments
```
POST /api/bills/retry-pending
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 pending transactions",
  "results": [
    {
      "transaction_id": "507f1f77bcf86cd799439011",
      "status": "completed"
    },
    {
      "transaction_id": "507f1f77bcf86cd799439012",
      "status": "failed"
    }
  ]
}
```

## 🗄️ Database Schema

### Transaction Model
```javascript
{
  _id: ObjectId,
  user: ObjectId, // Reference to User
  type: String, // 'bill_payment'
  amount: Number, // Discounted amount
  originalAmount: Number, // Original amount before discount
  discountAmount: Number, // Discount applied
  status: String, // 'pending', 'paid', 'completed', 'failed', 'bill_failed'
  txRef: String, // Transaction reference
  flwRef: String, // Flutterwave reference
  transactionId: String, // Flutterwave transaction ID
  billerCode: String, // e.g., 'BIL108'
  variationCode: String, // e.g., 'MTN_500MB'
  phoneNumber: String, // Customer phone number
  planName: String, // Plan description
  paymentLink: String, // Flutterwave hosted link
  paymentData: Object, // Flutterwave payment response
  billDeliveryData: Object, // Bill delivery response
  billDeliveryError: String, // Bill delivery error message
  metadata: Object, // Additional data
  createdAt: Date,
  paidAt: Date,
  completedAt: Date,
  failedAt: Date
}
```

## 🔄 Payment Status Flow

```
pending → paid → completed
   ↓        ↓
 failed  bill_failed
```

### Status Descriptions:
- **pending**: Payment initiated, waiting for completion
- **paid**: Payment successful, bill delivery in progress
- **completed**: Payment successful and bill delivered
- **failed**: Payment failed or cancelled
- **bill_failed**: Payment successful but bill delivery failed

## 💰 Discount Logic

```javascript
// Check if user has active subscription
const hasActiveSubscription = user.isSubscribed && 
  user.subscriptionExpiry && 
  user.subscriptionExpiry > new Date();

// Calculate discount (10% off if subscription exists)
const discountPercentage = hasActiveSubscription ? 10 : 0;
const discountAmount = (amount * discountPercentage) / 100;
const discountedAmount = amount - discountAmount;
```

## 🔔 Webhook Implementation

### Flutterwave Webhook Handler
```javascript
// POST /api/webhook/flutterwave
const handleFlutterwaveWebhook = async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'charge.completed') {
    const { tx_ref, status, amount, id: transaction_id } = data;
    
    if (status === 'successful') {
      // Update transaction to 'paid'
      // Trigger bill delivery
      // Update to 'completed' or 'bill_failed'
    } else if (status === 'failed' || status === 'cancelled') {
      // Update transaction to 'failed'
    }
  }
  
  res.status(200).json({ status: 'success' });
};
```

## 🔄 Retry Logic

### Automatic Retry
- Processes pending transactions older than 5 minutes
- Maximum 10 transactions per batch
- Can be triggered manually or via cron job

### Retry Process:
1. Find pending transactions older than 5 minutes
2. Verify each transaction with Flutterwave
3. Update status based on verification result
4. Trigger bill delivery for successful payments
5. Log results for monitoring

## 📱 Frontend Integration

### 1. Fetch Bill Items
```javascript
const response = await fetch('/api/bills?biller_code=BIL108');
const billItems = await response.json();
```

### 2. Create Payment
```javascript
const paymentResponse = await fetch('/api/bills/pay', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    biller_code: 'BIL108',
    variation_code: 'MTN_500MB',
    amount: 200,
    phone_number: '08068621706',
    plan_name: '500MB - 30 Days'
  })
});

const { data } = await paymentResponse.json();
// Open data.link in WebView
```

### 3. Verify Payment
```javascript
const verifyResponse = await fetch(`/api/bills/verify/${transactionId}`);
const result = await verifyResponse.json();

if (result.success && result.status === 'success') {
  // Payment successful and bill delivered
  showSuccessMessage('Bill delivered successfully!');
} else if (result.status === 'pending') {
  // Payment still processing
  showPendingMessage('Payment is still being processed...');
} else {
  // Payment failed
  showErrorMessage('Payment failed. Please try again.');
}
```

## 🧪 Testing

### Test Payment Flow:
1. Create a test payment
2. Use Flutterwave test cards
3. Verify webhook receives the event
4. Check transaction status updates
5. Confirm bill delivery (if applicable)

### Test Cards:
- **Success**: 4187427415564246
- **Declined**: 4000000000000002
- **Insufficient Funds**: 4000000000009995

## 🚨 Error Handling

### Common Errors:
1. **Invalid biller_code**: Check Flutterwave biller list
2. **Invalid variation_code**: Verify with biller items
3. **Payment timeout**: Implement retry logic
4. **Bill delivery failure**: Log error and notify user
5. **Webhook not received**: Use callback endpoint as fallback

### Error Responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## 📊 Monitoring

### Key Metrics:
- Payment success rate
- Bill delivery success rate
- Average processing time
- Failed transaction reasons
- Retry success rate

### Logs to Monitor:
- Payment creation
- Webhook events
- Bill delivery attempts
- Retry operations
- Error occurrences

## 🔧 Configuration

### Environment Variables:
```bash
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_LIVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_LIVE_SECRET_KEY=FLWSECK-...
FRONTEND_URL=https://maralempay.com
```

### Flutterwave Settings:
- **Payment Options**: `card,ussd`
- **Session Duration**: 15 minutes
- **Redirect URL**: `${FRONTEND_URL}/payment/callback?status=successful`
- **Webhook URL**: `${BACKEND_URL}/api/webhook/flutterwave`

## 🚀 Deployment Checklist

- [ ] Configure Flutterwave webhook URL
- [ ] Set up environment variables
- [ ] Test payment flow with test cards
- [ ] Verify webhook receives events
- [ ] Test retry mechanism
- [ ] Monitor logs for errors
- [ ] Set up cron job for retry (optional)
- [ ] Configure error alerting
- [ ] Test with live payments (small amounts)
- [ ] Monitor bill delivery success rate
