# MaralemPay Backend API

A comprehensive airtime & data vending platform backend built with Node.js, Express, and MongoDB Atlas.

## Features

- 🔐 JWT Authentication & Authorization
- 💳 Flutterwave Payment Integration
- 📱 Airtime & Data Purchase with Discounts
- 👥 Referral System
- 📊 Admin Dashboard Analytics
- 🎯 Beneficiary Management
- 🔒 Role-based Access Control

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Authentication**: JWT
- **Payment**: Flutterwave API
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://nithishwaran_rp:Pushpavalli_123@rpn.fioos.mongodb.net/maralempay?retryWrites=true&w=majority&appName=RPN

# JWT Config
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-a51b8c5280d88f1ca2ad0128446e41f0-X
FLUTTERWAVE_SECRET_KEY=FLWSECK-9f925e18bd582228f07d2761987d4604-1993c829568vt-X
FLUTTERWAVE_ENCRYPTION_KEY=9f925e18bd58357d1e2c1fc6
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3

# Subscription
SUBSCRIPTION_AMOUNT=100
SUBSCRIPTION_CURRENCY=NGN

# Discounts
AIRTIME_DISCOUNT_PERCENTAGE=10
DATA_DISCOUNT_PERCENTAGE=10

# CORS
FRONTEND_URL=http://localhost:3000
FLUTTER_APP_URL=http://localhost:8080
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables in `.env`

3. Start the development server:
```bash
npm run dev
```

4. For production:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/subscription/initialize` - Initialize subscription payment
- `POST /api/auth/subscription/verify` - Verify subscription payment

### Transactions
- `GET /api/transactions/data-plans` - Get available data plans
- `POST /api/transactions/airtime` - Buy airtime (subscription required)
- `POST /api/transactions/data` - Buy data (subscription required)
- `GET /api/transactions/history` - Get transaction history
- `GET /api/transactions/stats` - Get transaction statistics

### Beneficiaries
- `POST /api/beneficiaries` - Create beneficiary
- `GET /api/beneficiaries` - Get all beneficiaries
- `GET /api/beneficiaries/:id` - Get beneficiary by ID
- `PUT /api/beneficiaries/:id` - Update beneficiary
- `DELETE /api/beneficiaries/:id` - Delete beneficiary
- `PATCH /api/beneficiaries/:id/default` - Set default beneficiary
- `GET /api/beneficiaries/default` - Get default beneficiary

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `GET /api/admin/analytics` - Get dashboard analytics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId` - Get user details
- `GET /api/admin/transactions` - Get all transactions

## Database Models

### User
- Personal information (name, email, phone)
- Subscription status and expiry
- Referral system (code, rewards, referrals)
- Wallet balance and activity status

### Transaction
- Type (airtime, data, subscription)
- Amount with discount calculations
- Flutterwave integration details
- Status tracking and error handling

### Beneficiary
- Contact information and network
- Usage tracking and default status
- Maximum 5 beneficiaries per user

### Admin
- Role-based permissions
- Account security (lockout, attempts)
- Access control for different features

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet security headers
- Input validation and sanitization
- Account lockout after failed attempts

## Error Handling

- Centralized error handling middleware
- Detailed error messages in development
- Generic error messages in production
- Proper HTTP status codes
- Validation error formatting

## Development

The API follows RESTful conventions and includes:
- Comprehensive input validation
- Proper error handling
- Security best practices
- Clean code structure
- Detailed documentation

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB Atlas cluster
3. Set strong JWT secrets
4. Configure proper CORS origins
5. Use a reverse proxy (nginx)
6. Enable HTTPS
7. Set up monitoring and logging
