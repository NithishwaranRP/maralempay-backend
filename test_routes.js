// Simple test to check if routes are working
const express = require('express');
const app = express();

// Test routes without middleware
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test endpoint working' });
});

app.get('/api/transactions/history', (req, res) => {
  res.json({ success: true, message: 'Transactions history endpoint working' });
});

app.get('/api/referrals/stats', (req, res) => {
  res.json({ success: true, message: 'Referrals stats endpoint working' });
});

app.post('/api/email/reset-password', (req, res) => {
  res.json({ success: true, message: 'Email reset-password endpoint working' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log('Test these endpoints:');
  console.log(`- GET http://localhost:${PORT}/api/test`);
  console.log(`- GET http://localhost:${PORT}/api/transactions/history`);
  console.log(`- GET http://localhost:${PORT}/api/referrals/stats`);
  console.log(`- POST http://localhost:${PORT}/api/email/reset-password`);
});
