const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust proxy for Vercel deployment - only trust first proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  trustProxy: 1, // Trust first proxy (for Vercel deployment)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.FLUTTER_APP_URL || 'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://maralempay.vercel.app',
      'https://maralempay.com',
      'https://frontend-nithishwaran-rps-projects.vercel.app',
      'https://frontend-f0zn01xte-nithishwaran-rps-projects.vercel.app',
      'https://frontend-jhyolwm5w-nithishwaran-rps-projects.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (can be restricted later)
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/checkout', require('./routes/checkoutRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/web', require('./routes/webRoutes'));
app.use('/api/debug', require('./routes/debugRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/bills', require('./routes/billsRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/webhook', require('./routes/webhookRoutes'));
app.use('/api/bills-api', require('./routes/billsApiRoutes'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/payment', require('./routes/paymentVerificationRoutes'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MaralemPay API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      admin: '/api/admin',
      transactions: '/api/transactions',
      wallet: '/api/wallet',
      subscription: '/api/subscription',
      bills: '/api/bills',
      referrals: '/api/referrals'
    },
    documentation: 'https://github.com/your-repo/maralempay-api'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MaralemPay API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Favicon endpoint (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

app.get('/favicon.png', (req, res) => {
  res.status(204).end(); // No content
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Export the app for Vercel
module.exports = app;

// Only listen on port when not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 MaralemPay API server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
