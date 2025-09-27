# 🚀 Render Webhook Setup (maralempay-backend.onrender.com)

## ✅ **Using Your Render Deployment: maralempay-backend.onrender.com**

### **🔑 Your Generated Secret Hash:**
```
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **🌐 Your Webhook URL for Development/Staging:**
```
https://maralempay-backend.onrender.com/api/webhook/flutterwave
```

---

## 📋 **Environment Configuration**

### **Development/Staging (Render)**
- **Base URL**: `https://maralempay-backend.onrender.com`
- **Webhook URL**: `https://maralempay-backend.onrender.com/api/webhook/flutterwave`
- **Flutterwave Mode**: **Test Mode** (using Test API keys)
- **Dashboard Setting**: **Test Mode Webhook URL**

### **Production (Live)**
- **Base URL**: `https://maralempay.com.ng`
- **Webhook URL**: `https://maralempay.com.ng/api/webhook/flutterwave`
- **Flutterwave Mode**: **Live Mode** (using Live API keys)
- **Dashboard Setting**: **Live Mode Webhook URL**

---

## 🔧 **Environment Variables for Render**

Add these to your Render environment variables:

```env
# Flutterwave Configuration (Test Mode)
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
FLW_SECRET_KEY=your_flutterwave_test_secret_key
FLW_PUBLIC_KEY=your_flutterwave_test_public_key
FLW_ENCRYPTION_KEY=your_flutterwave_test_encryption_key
FLW_BASE_URL=https://api.flutterwave.com/v3

# Backend Configuration
BASE_URL=https://maralempay-backend.onrender.com
MONGODB_URI=your_mongodb_connection_string
```

---

## 🎯 **Flutterwave Dashboard Configuration**

### **Step 1: Configure Test Mode Webhook**
1. Login to your Flutterwave Dashboard
2. Go to **Settings** → **Webhooks**
3. **Switch to Test Mode** (toggle in top right)
4. Click **Add Webhook**
5. Fill in the form:
   - **URL**: `https://maralempay-backend.onrender.com/api/webhook/flutterwave`
   - **Secret Hash**: `0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a`
   - **Events**: Select `charge.completed` and `charge.failed`
6. Click **Save**

### **Step 2: Configure Live Mode Webhook (for production)**
1. **Switch to Live Mode** in Flutterwave dashboard
2. Click **Add Webhook**
3. Fill in the form:
   - **URL**: `https://maralempay.com.ng/api/webhook/flutterwave`
   - **Secret Hash**: `0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a`
   - **Events**: Select `charge.completed` and `charge.failed`
4. Click **Save**

---

## 🧪 **Testing Commands**

### **Test Webhook Endpoint (Render)**
```bash
curl -X POST "https://maralempay-backend.onrender.com/api/webhook/flutterwave" \
  -H "Content-Type: application/json" \
  -H "verif-hash: 0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a" \
  -d '{
    "event": "charge.completed",
    "data": {
      "status": "successful",
      "tx_ref": "TEST_TX_REF_123",
      "flw_ref": "FLW_REF_123",
      "amount": 1000
    }
  }'
```

### **Test Webhook Endpoint (Production)**
```bash
curl -X POST "https://maralempay.com.ng/api/webhook/flutterwave" \
  -H "Content-Type: application/json" \
  -H "verif-hash: 0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a" \
  -d '{
    "event": "charge.completed",
    "data": {
      "status": "successful",
      "tx_ref": "TEST_TX_REF_123",
      "flw_ref": "FLW_REF_123",
      "amount": 1000
    }
  }'
```

---

## 🔒 **Secure Webhook Implementation**

The webhook endpoint follows this secure process:

### **1. Check Secret Hash**
```javascript
const signature = req.headers['verif-hash'];
const secretHash = process.env.FLW_SECRET_HASH;

if (!verifyWebhookSignature(payload, signature, secretHash)) {
  return res.status(401).json({ success: false, message: 'Invalid signature' });
}
```

### **2. Acknowledge Receipt (Immediate 200 OK)**
```javascript
// Send 200 OK immediately to prevent retries
res.status(200).json({ success: true, message: 'Webhook processed' });
```

### **3. Background Transaction Verification**
```javascript
// Process webhook in background
setImmediate(async () => {
  const verificationResult = await flutterwaveService.verifyTransaction(tx_ref);
  if (verificationResult.success) {
    // Update database only if verification confirms success
    await updateTransactionStatus(tx_ref, 'successful');
    await updateUserWallet(userId, amount);
  }
});
```

### **4. Update Database**
```javascript
// Only update if verification confirms success
if (verificationResult.data.status === 'successful') {
  await Transaction.findByIdAndUpdate(transactionId, { status: 'successful' });
  await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } });
}
```

---

## 🚀 **Deployment Steps**

### **1. Update Render Environment Variables**
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add the environment variables listed above
5. Click **Save Changes**

### **2. Deploy Your Backend**
```bash
# Commit your changes
git add .
git commit -m "Add webhook system for transaction status updates"

# Push to trigger Render deployment
git push origin main
```

### **3. Verify Deployment**
1. Check Render deployment logs
2. Test webhook endpoint with curl command
3. Make a test payment in your app
4. Check backend logs for webhook processing

---

## 🎯 **Expected Results**

After setup, you should see:
- ✅ Webhook requests in your Render backend logs
- ✅ Transaction status updates from "initialized" to "successful"/"failed"
- ✅ Wallet balance updates on successful payments
- ✅ Subscription activation on successful payments
- ✅ Reliable payment capture for all payment methods

---

## 📱 **Environment Summary**

| Environment | URL | Mode | Keys | Webhook URL |
|-------------|-----|------|------|-------------|
| **Development/Staging** | `maralempay-backend.onrender.com` | Test | Test Keys | `https://maralempay-backend.onrender.com/api/webhook/flutterwave` |
| **Production** | `maralempay.com.ng` | Live | Live Keys | `https://maralempay.com.ng/api/webhook/flutterwave` |

**Your webhook system is now ready for both environments!** 🚀
