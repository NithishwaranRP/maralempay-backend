# 🔧 MaralemPay Environment Variables Setup

## 📋 **Required Environment Variables**

### **Database Configuration**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/maralempay?retryWrites=true&w=majority
```

### **JWT Configuration**
```bash
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d
```

### **Flutterwave Configuration (Test/Sandbox)**
```bash
FLW_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_BASE_URL=https://api.flutterwave.com/v3
FLW_SECRET_HASH=your_webhook_secret_hash_here
```

### **Flutterwave Configuration (Live/Production)**
```bash
FLW_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_BASE_URL=https://api.flutterwave.com/v3
FLW_SECRET_HASH=your_webhook_secret_hash_here
```

### **Frontend URLs**
```bash
FRONTEND_URL=https://frontend-nithishwaran-rps-projects.vercel.app
MOBILE_APP_URL=https://maralempay.com
```

### **Email Configuration (Optional)**
```bash
EMAIL_FROM=noreply@maralempay.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### **Server Configuration**
```bash
PORT=3000
NODE_ENV=production
```

## 🚀 **Deployment Instructions**

### **1. Vercel Deployment**
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all the variables from this template
5. **IMPORTANT**: Set `FLW_SECRET_HASH` for webhook security
6. Deploy your project

### **2. Webhook Configuration**
1. In Flutterwave Dashboard, go to Settings → Webhooks
2. Add webhook URL: `https://your-backend-url.vercel.app/api/webhook/flutterwave`
3. Select events: `charge.completed`
4. Copy the secret hash and set it as `FLW_SECRET_HASH`

### **3. Production Setup**
1. Use live Flutterwave keys (not test keys)
2. Set `NODE_ENV=production`
3. Update `FRONTEND_URL` to your production domain
4. Use production MongoDB URI
5. Set strong `JWT_SECRET` and `FLW_SECRET_HASH`

## 🔐 **Security Notes**

- Keep your JWT secret long and random (at least 32 characters)
- Never commit `.env` files to version control
- Use different keys for development and production
- Regularly rotate your API keys
- Monitor your Flutterwave dashboard for suspicious activity
- **CRITICAL**: Set `FLW_SECRET_HASH` for webhook security

## 📊 **API Endpoints**

### **Payment Flow**
- `POST /api/payments/initiate` - Initiate payment
- `GET /api/payments/status/:transactionId` - Get transaction status
- `GET /api/payments/user/:userId` - Get user transactions

### **Bills API**
- `GET /api/bills-api/categories` - Get bill categories
- `GET /api/bills-api/categories/:categoryId/billers` - Get billers
- `GET /api/bills-api/billers/:billerId/items` - Get biller items
- `GET /api/bills-api/airtime-plans` - Get airtime plans
- `GET /api/bills-api/data-plans` - Get data plans

### **Webhooks**
- `POST /api/webhook/flutterwave` - Flutterwave webhook handler

## 🧪 **Testing**

### **Flutterwave Test Cards**
```
Card Number: 5531 8866 5214 2950
CVV: 564
Expiry: 09/32
PIN: 3310
OTP: 12345
```

### **Test Flow**
1. Use test Flutterwave keys
2. Make a test payment
3. Check webhook is received
4. Verify recharge is triggered
5. Check transaction status in database

## 🔍 **Monitoring**

- Check Flutterwave dashboard for transaction logs
- Monitor MongoDB for user activity
- Set up error tracking (Sentry, etc.)
- Monitor API response times
- Track subscription renewals and churn
- Monitor webhook delivery success

---

**Remember**: Always test with sandbox/test keys before switching to live keys in production!

