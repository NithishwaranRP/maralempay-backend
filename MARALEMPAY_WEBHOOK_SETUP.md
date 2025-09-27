# 🚀 Maralempay Webhook Setup (maralempay.com.ng)

## ✅ **Using Your Domain: maralempay.com.ng**

### **🔑 Your Generated Secret Hash:**
```
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **🌐 Your Webhook URL:**
```
https://maralempay.com.ng/api/webhook/flutterwave
```

---

## 📋 **Step-by-Step Setup for Maralempay**

### **Step 1: Add Secret Hash to Environment**
Add this line to your `.env` file:
```env
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **Step 2: Update BASE_URL in Environment**
Add this to your `.env` file:
```env
BASE_URL=https://maralempay.com.ng
```

### **Step 3: Configure Flutterwave Dashboard**
1. Login to your Flutterwave Dashboard
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Fill in the form:
   - **URL**: `https://maralempay.com.ng/api/webhook/flutterwave`
   - **Secret Hash**: `0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a`
   - **Events**: Select `charge.completed` and `charge.failed`
5. Click **Save**

### **Step 4: Deploy Your Backend**
Deploy your backend with the webhook system to maralempay.com.ng

### **Step 5: Test the Webhook**
1. Make a test payment in your app
2. Check your backend logs for webhook processing
3. Verify transaction status updates in your database

---

## 🧪 **Testing Commands**

### **Test Webhook Endpoint**
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

### **Check Transaction Status**
```bash
node test_webhook_system.js
```

---

## 🔍 **Environment Variables for Production**

Add these to your production `.env` file:
```env
# Flutterwave Configuration
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
FLW_SECRET_KEY=your_flutterwave_secret_key
FLW_PUBLIC_KEY=your_flutterwave_public_key
FLW_ENCRYPTION_KEY=your_flutterwave_encryption_key
FLW_BASE_URL=https://api.flutterwave.com/v3

# Backend Configuration
BASE_URL=https://maralempay.com.ng
MONGODB_URI=your_mongodb_connection_string
```

---

## 🎯 **Why Webhooks Are Essential for Maralempay**

As you correctly pointed out, webhooks are essential for reliable payment processing:

### **Critical Scenarios Webhooks Handle:**

1. **User Drop-off**: Customer pays but closes browser before redirect
2. **Asynchronous Payments**: USSD, Mobile Money, Bank Transfers
3. **Network Issues**: Temporary glitches preventing redirect responses
4. **Retry Mechanism**: Flutterwave retries webhook delivery if server fails

### **Without Webhooks:**
- ❌ Missed payments when users abandon browser
- ❌ No updates for USSD/Mobile Money payments
- ❌ No retry mechanism for failed updates
- ❌ Unreliable transaction status updates

### **With Webhooks:**
- ✅ Real-time server-to-server notifications
- ✅ Automatic retry mechanism
- ✅ Reliable payment capture
- ✅ Proper transaction status updates

---

## 🚀 **Deployment Commands**

### **Deploy to Maralempay:**
```bash
# Commit your changes
git add .
git commit -m "Add webhook system for reliable transaction status updates"

# Push to your repository
git push origin main

# Deploy to your hosting platform
```

---

## 📱 **Expected Results**

After setup, you should see:
- ✅ Webhook requests in your backend logs
- ✅ Transaction status updates from "initialized" to "successful"/"failed"
- ✅ Wallet balance updates on successful payments
- ✅ Subscription activation on successful payments
- ✅ Reliable payment capture for all payment methods

**Your Maralempay webhook system is now ready for production!** 🚀
