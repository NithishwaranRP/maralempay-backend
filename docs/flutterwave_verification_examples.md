# Flutterwave Payment Verification Examples

## 🔍 Flutterwave Payment Verification Notes
- Always verify payments after redirect/callback.
- Prefer transaction_id verification, fallback to tx_ref if needed.

## ✅ By Transaction ID:
```
GET https://api.flutterwave.com/v3/transactions/{transaction_id}/verify
```

## ✅ By Transaction Reference (tx_ref):
```
GET https://api.flutterwave.com/v3/transactions/{tx_ref}/verify
```

⚠️ **Important**: Ensure you use the same environment (TEST vs LIVE keys) used to create the transaction!
Example: If payment was initiated with TEST keys, verification must use TEST keys too.

## 🧪 Testing Examples

### PowerShell Invoke-RestMethod Examples

#### 1. Verify with Transaction ID
```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Invoke-RestMethod -Uri "https://api.flutterwave.com/v3/transactions/86171865/verify" `
-Method GET `
-Headers @{
    "Authorization" = "Bearer FLWSECK-YOUR_LIVE_SECRET_KEY"
    "Content-Type"  = "application/json"
}
```

#### 2. Verify with Transaction Reference
```powershell
Invoke-RestMethod -Uri "https://api.flutterwave.com/v3/transactions?tx_ref=TX17579288769711706" `
-Method GET `
-Headers @{
    "Authorization" = "Bearer FLWSECK-YOUR_LIVE_SECRET_KEY"
    "Content-Type"  = "application/json"
}
```

#### 3. Generic (replace TX_REF dynamically)
```powershell
$txRef = "TX17579288769711706"
Invoke-RestMethod -Uri "https://api.flutterwave.com/v3/transactions?tx_ref=$txRef" `
-Method GET `
-Headers @{
    "Authorization" = "Bearer FLWSECK-YOUR_LIVE_SECRET_KEY"
    "Content-Type"  = "application/json"
}
```

### cURL Examples

#### 1. Verify with Transaction ID
```bash
curl -X GET "https://api.flutterwave.com/v3/transactions/86171865/verify" \
  -H "Authorization: Bearer FLWSECK-YOUR_LIVE_SECRET_KEY" \
  -H "Content-Type: application/json"
```

#### 2. Verify with Transaction Reference
```bash
curl -X GET "https://api.flutterwave.com/v3/transactions/TX17579288769711706/verify" \
  -H "Authorization: Bearer FLWSECK-YOUR_LIVE_SECRET_KEY" \
  -H "Content-Type: application/json"
```

#### 3. Test with Latest Transaction
```bash
# Replace with your actual transaction ID from the logs
curl -X GET "https://api.flutterwave.com/v3/transactions/86172870/verify" \
  -H "Authorization: Bearer FLWSECK-YOUR_LIVE_SECRET_KEY" \
  -H "Content-Type: application/json"
```

## 📱 Expected Response Format

### Successful Payment Response:
```json
{
  "status": "success",
  "message": "Transaction fetched successfully",
  "data": {
    "id": 86172870,
    "tx_ref": "TX17579308070491706",
    "flw_ref": "FLW-MOCK-...",
    "device_fingerprint": "...",
    "amount": 180,
    "currency": "NGN",
    "charged_amount": 180,
    "app_fee": 6.48,
    "merchant_fee": 0,
    "processor_response": "Approved by Financial Institution",
    "auth_model": "AUTH",
    "card": {
      "first_6digits": "553188",
      "last_4digits": "2950",
      "issuer": "CREDIT UNION",
      "country": "NIGERIA NG",
      "type": "MASTERCARD",
      "token": "flw-t1nf-f9b3bf384cd30d6fca42b6df9d27bd2f-m03k"
    },
    "created_at": "2024-01-15T00:40:00.000Z",
    "status": "successful",
    "payment_type": "card",
    "customer": {
      "id": 123456,
      "phone_number": "08068621706",
      "name": "Maralempay Customer",
      "email": "customer@maralempay.com",
      "created_at": "2024-01-15T00:35:00.000Z"
    }
  }
}
```

### Pending Payment Response:
```json
{
  "status": "success",
  "message": "Transaction fetched successfully",
  "data": {
    "id": 86172870,
    "tx_ref": "TX17579308070491706",
    "amount": 180,
    "currency": "NGN",
    "status": "pending",
    "payment_type": "card",
    "customer": {
      "phone_number": "08068621706",
      "name": "Maralempay Customer",
      "email": "customer@maralempay.com"
    }
  }
}
```

### Failed Payment Response:
```json
{
  "status": "success",
  "message": "Transaction fetched successfully",
  "data": {
    "id": 86172870,
    "tx_ref": "TX17579308070491706",
    "amount": 180,
    "currency": "NGN",
    "status": "failed",
    "payment_type": "card",
    "processor_response": "Declined by Financial Institution"
  }
}
```

## 🔧 Backend Integration

### Node.js/Express Example:
```javascript
const verifyPayment = async (transactionId, useLive = false) => {
  try {
    const secretKey = useLive ? process.env.FLUTTERWAVE_LIVE_SECRET_KEY : process.env.FLUTTERWAVE_TEST_SECRET_KEY;
    
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      const paymentData = result.data;
      
      // Handle different payment statuses
      if (paymentData.status === 'successful') {
        // Payment successful - trigger bill delivery
        return {
          success: true,
          status: 'successful',
          shouldTriggerBill: true,
          data: paymentData
        };
      } else if (paymentData.status === 'pending') {
        // Payment pending - retry later
        return {
          success: false,
          status: 'pending',
          shouldRetry: true,
          data: paymentData
        };
      } else {
        // Payment failed
        return {
          success: false,
          status: paymentData.status,
          shouldRetry: false,
          data: paymentData
        };
      }
    } else {
      throw new Error(result.message || 'Verification failed');
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

## 🚨 Common Issues & Solutions

### 1. 400 Bad Request Error
- **Cause**: Using wrong parameter (tx_ref instead of transaction_id)
- **Solution**: Use transaction_id for verification endpoint

### 2. 401 Unauthorized Error
- **Cause**: Wrong API key or using TEST key for LIVE transaction
- **Solution**: Ensure environment consistency

### 3. 404 Not Found Error
- **Cause**: Transaction doesn't exist or wrong ID
- **Solution**: Verify transaction ID from callback URL

### 4. Status "pending" for too long
- **Cause**: Payment still processing
- **Solution**: Implement retry logic with exponential backoff

## 📊 Testing Checklist

- [ ] Test with successful payment
- [ ] Test with pending payment
- [ ] Test with failed payment
- [ ] Test with wrong transaction ID
- [ ] Test with wrong API key
- [ ] Test environment consistency (TEST vs LIVE)
- [ ] Test retry logic for pending payments
- [ ] Test bill delivery trigger for successful payments
