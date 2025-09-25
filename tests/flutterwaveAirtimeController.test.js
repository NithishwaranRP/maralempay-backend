const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const FlutterwaveAirtimeController = require('../controllers/flutterwaveAirtimeController');

// Mock axios for testing
jest.mock('axios');
const axios = require('axios');

// Mock environment variables
process.env.FLW_SECRET_KEY = 'FLWSECK-test-key-123';
process.env.FLW_PUBLIC_KEY = 'FLWPUBK-test-key-123';
process.env.BACKEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

describe('FlutterwaveAirtimeController', () => {
  let app;
  let controller;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27017/flutterwave_airtime_test');
    
    app = express();
    app.use(express.json());
    
    controller = new FlutterwaveAirtimeController();
    
    // Add routes
    app.get('/api/flutterwave/categories', (req, res) => controller.getBillCategories(req, res));
    app.get('/api/flutterwave/billers/:categoryCode', (req, res) => controller.getBillersByCategory(req, res));
    app.get('/api/flutterwave/billers/:billerCode/items', (req, res) => controller.getBillerItems(req, res));
    app.post('/api/payments/initialize-airtime', (req, res) => controller.initializeAirtimePayment(req, res));
    app.post('/api/payments/verify', (req, res) => controller.verifyPayment(req, res));
    app.post('/api/payments/flutterwave-webhook', (req, res) => controller.handleWebhook(req, res));
    app.get('/api/payments/status/:tx_ref', (req, res) => controller.getPaymentStatus(req, res));
  });

  afterAll(async () => {
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/flutterwave/categories', () => {
    it('should fetch bill categories successfully', async () => {
      // Mock Flutterwave API response
      const mockResponse = {
        status: 'success',
        message: 'Categories fetched successfully',
        data: [
          {
            id: 1,
            name: 'Airtime',
            code: 'AIRTIME',
            description: 'Airtime',
            country_code: 'NG'
          },
          {
            id: 2,
            name: 'Mobile Data Service',
            code: 'MOBILEDATA',
            description: 'Mobile Data Service',
            country_code: 'NG'
          }
        ]
      };

      axios.get.mockResolvedValue({ data: mockResponse });

      const response = await request(app)
        .get('/api/flutterwave/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Airtime');
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/top-bill-categories',
        { headers: expect.any(Object) }
      );
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/flutterwave/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch bill categories');
    });
  });

  describe('GET /api/flutterwave/billers/:categoryCode', () => {
    it('should fetch billers for a category successfully', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            id: 1,
            name: 'MTN VTU',
            biller_code: '1',
            category: 'Airtime',
            country: 'NG'
          }
        ]
      };

      axios.get.mockResolvedValue({ data: mockResponse });

      const response = await request(app)
        .get('/api/flutterwave/billers/AIRTIME')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('MTN VTU');
    });

    it('should fallback to alternative endpoints when primary fails', async () => {
      // Mock first call to fail
      axios.get
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({
          data: {
            status: 'success',
            data: [
              {
                id: 1,
                name: 'MTN VTU',
                biller_code: '1'
              }
            ]
          }
        });

      const response = await request(app)
        .get('/api/flutterwave/billers/AIRTIME')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /api/flutterwave/billers/:billerCode/items', () => {
    it('should fetch biller items successfully', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            id: 1,
            name: 'MTN Airtime 100',
            amount: 100,
            code: 'AT100',
            variation_code: 'AT100'
          },
          {
            id: 2,
            name: 'MTN Airtime 200',
            amount: 200,
            code: 'AT200',
            variation_code: 'AT200'
          }
        ]
      };

      axios.get.mockResolvedValue({ data: mockResponse });

      const response = await request(app)
        .get('/api/flutterwave/billers/1/items')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('MTN Airtime 100');
    });
  });

  describe('POST /api/payments/initialize-airtime', () => {
    it('should initialize payment successfully for subscriber', async () => {
      const mockPaymentResponse = {
        status: 'success',
        data: {
          link: 'https://checkout.flutterwave.com/v3/hosted/pay/abc123',
          tx_ref: 'AIR_user123_1234567890_abc123'
        }
      };

      axios.post.mockResolvedValue({ data: mockPaymentResponse });

      const requestBody = {
        userId: 'user123',
        phone: '08012345678',
        biller_code: '1',
        item_code: 'AT100',
        amount: 100,
        isSubscriber: true
      };

      const response = await request(app)
        .post('/api/payments/initialize-airtime')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payment_link).toBe('https://checkout.flutterwave.com/v3/hosted/pay/abc123');
      expect(response.body.userAmount).toBe(90); // 10% discount
      expect(response.body.fullAmount).toBe(100);
      expect(response.body.discountAmount).toBe(10);
    });

    it('should initialize payment without discount for non-subscriber', async () => {
      const mockPaymentResponse = {
        status: 'success',
        data: {
          link: 'https://checkout.flutterwave.com/v3/hosted/pay/abc123',
          tx_ref: 'AIR_user123_1234567890_abc123'
        }
      };

      axios.post.mockResolvedValue({ data: mockPaymentResponse });

      const requestBody = {
        userId: 'user123',
        phone: '08012345678',
        biller_code: '1',
        amount: 100,
        isSubscriber: false
      };

      const response = await request(app)
        .post('/api/payments/initialize-airtime')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userAmount).toBe(100); // No discount
      expect(response.body.fullAmount).toBe(100);
      expect(response.body.discountAmount).toBe(0);
    });

    it('should validate required fields', async () => {
      const requestBody = {
        userId: 'user123',
        // Missing phone and biller_code
        amount: 100,
        isSubscriber: true
      };

      const response = await request(app)
        .post('/api/payments/initialize-airtime')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should handle Flutterwave payment creation failure', async () => {
      axios.post.mockRejectedValue(new Error('Payment creation failed'));

      const requestBody = {
        userId: 'user123',
        phone: '08012345678',
        biller_code: '1',
        amount: 100,
        isSubscriber: true
      };

      const response = await request(app)
        .post('/api/payments/initialize-airtime')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to initialize payment');
    });
  });

  describe('POST /api/payments/verify', () => {
    it('should verify payment and deliver bill successfully', async () => {
      // Mock transaction verification
      const mockVerifyResponse = {
        status: 'success',
        data: {
          id: 1234567890,
          status: 'successful',
          amount: 90,
          currency: 'NGN',
          customer: { phone: '08012345678' },
          meta: {
            userId: 'user123',
            phone: '08012345678',
            biller_code: '1',
            item_code: 'AT100',
            fullAmount: 100,
            userAmount: 90
          }
        }
      };

      // Mock bill payment
      const mockBillResponse = {
        status: 'success',
        data: {
          reference: 'AIR_user123_1234567890_abc123',
          biller_reference: 'BILL_REF_123456',
          status: 'delivered'
        }
      };

      axios.get.mockResolvedValue({ data: mockVerifyResponse });
      axios.post.mockResolvedValue({ data: mockBillResponse });

      const requestBody = {
        transaction_id: '1234567890'
      };

      const response = await request(app)
        .post('/api/payments/verify')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('delivered');
      expect(response.body.transaction.biller_reference).toBe('BILL_REF_123456');
    });

    it('should handle payment verification failure', async () => {
      const mockVerifyResponse = {
        status: 'success',
        data: {
          id: 1234567890,
          status: 'failed',
          amount: 90,
          currency: 'NGN'
        }
      };

      axios.get.mockResolvedValue({ data: mockVerifyResponse });

      const requestBody = {
        transaction_id: '1234567890'
      };

      const response = await request(app)
        .post('/api/payments/verify')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('failed');
    });

    it('should handle bill delivery failure and initiate refund', async () => {
      // Mock successful payment verification
      const mockVerifyResponse = {
        status: 'success',
        data: {
          id: 1234567890,
          status: 'successful',
          amount: 90,
          currency: 'NGN',
          customer: { phone: '08012345678' },
          meta: {
            userId: 'user123',
            phone: '08012345678',
            biller_code: '1',
            item_code: 'AT100',
            fullAmount: 100,
            userAmount: 90
          }
        }
      };

      // Mock bill payment failure
      axios.get.mockResolvedValue({ data: mockVerifyResponse });
      axios.post.mockRejectedValue(new Error('Bill delivery failed'));

      const requestBody = {
        transaction_id: '1234567890'
      };

      const response = await request(app)
        .post('/api/payments/verify')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('billing_failed');
      expect(response.body.refund).toBeDefined();
    });

    it('should handle idempotency - prevent duplicate processing', async () => {
      // This test would require setting up a transaction in the database first
      // and then trying to verify it again
      // Implementation depends on your database setup
    });
  });

  describe('POST /api/payments/flutterwave-webhook', () => {
    it('should handle successful payment webhook', async () => {
      const webhookPayload = {
        event: 'charge.completed',
        data: {
          id: 1234567890,
          tx_ref: 'AIR_user123_1234567890_abc123',
          status: 'successful',
          amount: 90,
          currency: 'NGN',
          customer: { phone: '08012345678' },
          meta: {
            userId: 'user123',
            phone: '08012345678',
            biller_code: '1',
            item_code: 'AT100',
            fullAmount: 100,
            userAmount: 90
          }
        }
      };

      // Mock the verify payment flow
      const mockVerifyResponse = {
        status: 'success',
        data: {
          id: 1234567890,
          status: 'successful',
          amount: 90,
          currency: 'NGN',
          customer: { phone: '08012345678' },
          meta: {
            userId: 'user123',
            phone: '08012345678',
            biller_code: '1',
            item_code: 'AT100',
            fullAmount: 100,
            userAmount: 90
          }
        }
      };

      const mockBillResponse = {
        status: 'success',
        data: {
          reference: 'AIR_user123_1234567890_abc123',
          biller_reference: 'BILL_REF_123456',
          status: 'delivered'
        }
      };

      axios.get.mockResolvedValue({ data: mockVerifyResponse });
      axios.post.mockResolvedValue({ data: mockBillResponse });

      const response = await request(app)
        .post('/api/payments/flutterwave-webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should verify webhook signature', async () => {
      const webhookPayload = {
        event: 'charge.completed',
        data: { id: 1234567890, status: 'successful' }
      };

      const response = await request(app)
        .post('/api/payments/flutterwave-webhook')
        .set('verif-hash', 'invalid-hash')
        .send(webhookPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid signature');
    });
  });

  describe('GET /api/payments/status/:tx_ref', () => {
    it('should return payment status successfully', async () => {
      // This test would require setting up a transaction in the database first
      // Implementation depends on your database setup
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/payments/status/non-existent-tx-ref')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Transaction not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      axios.get.mockRejectedValue(new Error('timeout'));

      const response = await request(app)
        .get('/api/flutterwave/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JSON responses', async () => {
      axios.get.mockResolvedValue({ data: 'invalid json' });

      const response = await request(app)
        .get('/api/flutterwave/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Tests', () => {
    it('should not expose secret keys in responses', async () => {
      const mockResponse = {
        status: 'success',
        data: []
      };

      axios.get.mockResolvedValue({ data: mockResponse });

      const response = await request(app)
        .get('/api/flutterwave/categories')
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('FLWSECK');
    });

    it('should validate input data', async () => {
      const maliciousInput = {
        userId: '<script>alert("xss")</script>',
        phone: '08012345678',
        biller_code: '1',
        amount: -100, // Negative amount
        isSubscriber: true
      };

      const response = await request(app)
        .post('/api/payments/initialize-airtime')
        .send(maliciousInput)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

// Integration tests
describe('FlutterwaveAirtimeController Integration Tests', () => {
  it('should complete full payment flow', async () => {
    // This would test the complete flow from initialization to delivery
    // 1. Initialize payment
    // 2. Simulate successful payment
    // 3. Verify payment
    // 4. Check bill delivery
    // 5. Verify final status
  });

  it('should handle retry logic for failed bill delivery', async () => {
    // Test the retry mechanism with exponential backoff
  });

  it('should maintain idempotency across multiple requests', async () => {
    // Test that duplicate requests don't cause double processing
  });
});
