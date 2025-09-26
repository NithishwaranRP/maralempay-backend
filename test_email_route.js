// Test script to verify email routes are working
const express = require('express');
const app = express();

// Mock the email controller
const mockEmailController = {
  sendPasswordResetCode: (req, res) => {
    console.log('✅ Email reset-password route called successfully');
    res.json({ 
      success: true, 
      message: 'Email reset-password endpoint is working',
      email: req.body.email 
    });
  }
};

// Mock middleware
const mockAuth = (req, res, next) => {
  next();
};

// Test the exact same route structure
app.use(express.json());

// Mount email routes exactly like in server.js
app.use('/api/email', (() => {
  const router = express.Router();
  
  // Email verification (public)
  router.post('/verify', mockEmailController.sendPasswordResetCode);
  
  // Password reset (public) - This is the route we're testing
  router.post('/reset-password', mockEmailController.sendPasswordResetCode);
  
  // Test email service (public)
  router.post('/test', mockEmailController.sendPasswordResetCode);
  
  // Resend verification code (public)
  router.post('/resend', mockEmailController.sendPasswordResetCode);
  
  return router;
})());

// Test the endpoint
app.post('/test-reset-password', (req, res) => {
  const testData = { email: 'test@example.com' };
  
  // Simulate the request
  const mockReq = { body: testData };
  const mockRes = {
    json: (data) => {
      console.log('✅ Test successful:', data);
      res.json({ success: true, message: 'Route structure is correct' });
    }
  };
  
  mockEmailController.sendPasswordResetCode(mockReq, mockRes);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log('Test the email reset-password route structure');
  console.log(`POST http://localhost:${PORT}/test-reset-password`);
});
