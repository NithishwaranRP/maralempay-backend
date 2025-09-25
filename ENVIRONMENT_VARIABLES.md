# 🔧 Environment Variables Configuration

## 📋 **Required Environment Variables for MaralemPay**

Copy these variables to your `.env` file and update with your actual values.

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
```

### **Flutterwave Configuration (Live/Production)**
```bash
FLW_PUBLIC_KEY=FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FLW_BASE_URL=https://api.flutterwave.com/v3
```

### **Subscription Configuration**
```bash
SUBSCRIPTION_AMOUNT=4500
SUBSCRIPTION_DURATION=90
SUBSCRIPTION_CURRENCY=NGN
```

### **Referral Configuration**
```bash
REFERRAL_REWARD=500
```

### **Wallet Configuration**
```bash
WALLET_DISCOUNT_PERCENTAGE=10
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
NODE_ENV=development
```

### **Rate Limiting**
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **CORS Configuration**
```bash
ALLOWED_ORIGINS=https://frontend-nithishwaran-rps-projects.vercel.app,https://maralempay.com
```

## 🧪 **Flutterwave Test Cards**

### **Success Card**
```
Card Number: 5531 8866 5214 2950
CVV: 564
Expiry: 09/32
PIN: 3310
OTP: 12345
```

### **Fail Card**
```
Card Number: 5590 2020 2030 2029
CVV: 887
Expiry: 09/32
```

## 🚀 **Deployment Instructions**

### **1. Local Development**
1. Copy this template to `.env` in the backend folder
2. Fill in your actual values
3. Run `npm start` to start the server

### **2. Vercel Deployment**
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all the variables from this template
5. Deploy your project

### **3. Production Setup**
1. Use live Flutterwave keys (not test keys)
2. Set `NODE_ENV=production`
3. Update `FRONTEND_URL` to your production domain
4. Use production MongoDB URI

## 🔐 **Security Notes**

- Keep your JWT secret long and random
- Never commit `.env` files to version control
- Use different keys for development and production
- Regularly rotate your API keys
- Monitor your Flutterwave dashboard for suspicious activity

## 📊 **Monitoring**

- Check Flutterwave dashboard for transaction logs
- Monitor MongoDB for user activity
- Set up error tracking (Sentry, etc.)
- Monitor API response times
- Track subscription renewals and churn

---

**Remember**: Always test with sandbox/test keys before switching to live keys in production!
