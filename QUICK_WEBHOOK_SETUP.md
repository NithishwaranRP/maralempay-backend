# 🚀 Quick Webhook Setup Guide

## ✅ **Generated Values for Your Setup**

### **1. Secret Hash (Generated)**
```
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **2. ngrok Command**
```bash
ngrok http 3000
```

### **3. Webhook URL Format**
```
https://[your-ngrok-subdomain].ngrok-free.app/api/webhook/flutterwave
```

---

## 📋 **Step-by-Step Setup**

### **Step 1: Add Secret Hash to Environment**
Add this line to your `.env` file:
```env
FLW_SECRET_HASH=0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a
```

### **Step 2: Start Your Backend Server**
```bash
npm start
# or
node server.js
```

### **Step 3: Start ngrok (in another terminal)**
```bash
ngrok http 3000
```

### **Step 4: Copy ngrok URL**
From the ngrok output, copy the HTTPS URL (e.g., `https://abc123def.ngrok-free.app`)

### **Step 5: Update Environment with ngrok URL**
Add this to your `.env` file:
```env
BASE_URL=https://abc123def.ngrok-free.app
```

### **Step 6: Restart Backend Server**
```bash
# Stop and restart your server to load new environment variables
npm start
```

### **Step 7: Configure Flutterwave Dashboard**
1. Login to your Flutterwave Dashboard
2. Go to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Fill in the form:
   - **URL**: `https://abc123def.ngrok-free.app/api/webhook/flutterwave`
   - **Secret Hash**: `0d3d9d2c8c4e548cc14cc8eac6992b6c41befc91232cd732a18e7dbc5099358a`
   - **Events**: Select `charge.completed` and `charge.failed`
5. Click **Save**

### **Step 8: Test the Webhook**
1. Make a test payment in your app
2. Check your backend logs for webhook processing
3. Verify transaction status updates in your database

---

## 🧪 **Testing Commands**

### **Test Webhook Endpoint**
```bash
curl -X POST "https://abc123def.ngrok-free.app/api/webhook/flutterwave" \
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

## 🔍 **Troubleshooting**

### **Issue: Webhook not receiving requests**
- ✅ Check ngrok is running and accessible
- ✅ Verify webhook URL in Flutterwave dashboard
- ✅ Check backend server is running on correct port

### **Issue: Invalid signature error**
- ✅ Verify `FLW_SECRET_HASH` matches in both `.env` and Flutterwave dashboard
- ✅ Check webhook endpoint is receiving the `verif-hash` header

### **Issue: Transactions still stuck**
- ✅ Check webhook processing logs
- ✅ Verify database connection
- ✅ Test with manual verification endpoint

---

## 🎯 **Expected Results**

After setup, you should see:
- ✅ Webhook requests in your backend logs
- ✅ Transaction status updates from "initialized" to "successful"/"failed"
- ✅ Wallet balance updates on successful payments
- ✅ Subscription activation on successful payments

---

## 📱 **Production Deployment**

For production:
1. Replace ngrok URL with your production domain
2. Update `BASE_URL` in production environment
3. Configure webhook URL in Flutterwave dashboard
4. Test with real transactions

**Your webhook system is now ready!** 🚀
