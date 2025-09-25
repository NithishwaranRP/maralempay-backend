# Flutterwave Payment Verification Test Script (PowerShell)
# 
# Usage:
# .\test_verification.ps1 <transaction_id> [live|test]
# 
# Examples:
# .\test_verification.ps1 86172870 live
# .\test_verification.ps1 TX17579308070491706 test

param(
    [Parameter(Mandatory=$true)]
    [string]$TransactionId,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("live", "test")]
    [string]$Environment = "live"
)

# Set API key based on environment
if ($Environment -eq "test") {
    $ApiKey = $env:FLUTTERWAVE_TEST_SECRET_KEY
    if (-not $ApiKey) {
        $ApiKey = "FLWSECK_TEST-..."
    }
    Write-Host "🌐 Environment: TEST" -ForegroundColor Blue
} else {
    $ApiKey = $env:FLUTTERWAVE_LIVE_SECRET_KEY
    if (-not $ApiKey) {
        $ApiKey = "FLWSECK-..."
    }
    Write-Host "🌐 Environment: LIVE" -ForegroundColor Blue
}

Write-Host "🧪 Flutterwave Payment Verification Test" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""
Write-Host "🔍 Verifying payment with Transaction ID: $TransactionId" -ForegroundColor Yellow
Write-Host "🔑 Using Secret Key: $($ApiKey.Substring(0, 15))..." -ForegroundColor Yellow
Write-Host ""

# Make the API request
Write-Host "📡 Making API request..." -ForegroundColor Blue
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $ApiKey"
        "Content-Type" = "application/json"
    }
    
    $uri = "https://api.flutterwave.com/v3/transactions/$TransactionId/verify"
    
    $response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "📊 Response Status: 200" -ForegroundColor Blue
    Write-Host "📋 Response Data:" -ForegroundColor Blue
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    Write-Host ""
    
    if ($response.status -eq "success") {
        $paymentData = $response.data
        $status = $paymentData.status
        
        switch ($status) {
            "successful" {
                Write-Host "✅ Payment Status: $status" -ForegroundColor Green
                Write-Host "🎉 Payment successful - ready to trigger bill delivery" -ForegroundColor Green
                
                $amount = $paymentData.amount
                $currency = $paymentData.currency
                $customerName = $paymentData.customer.name
                $customerPhone = $paymentData.customer.phone_number
                
                Write-Host "💰 Amount: $currency $amount" -ForegroundColor Green
                Write-Host "📱 Customer: $customerName ($customerPhone)" -ForegroundColor Green
                Write-Host ""
                Write-Host "🚀 Next Steps:" -ForegroundColor Green
                Write-Host "1. Trigger bill delivery API"
                Write-Host "2. Update transaction status to 'completed'"
                Write-Host "3. Send success notification to user"
            }
            "pending" {
                Write-Host "⏳ Payment Status: $status" -ForegroundColor Yellow
                Write-Host "⏳ Payment pending - will retry verification later" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "🔄 Next Steps:" -ForegroundColor Yellow
                Write-Host "1. Wait 2-5 minutes"
                Write-Host "2. Retry verification"
                Write-Host "3. Repeat until status changes"
            }
            { $_ -in @("failed", "cancelled") } {
                Write-Host "❌ Payment Status: $status" -ForegroundColor Red
                Write-Host "❌ Payment failed or cancelled" -ForegroundColor Red
            }
            default {
                Write-Host "⚠️ Unknown Payment Status: $status" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Verification failed" -ForegroundColor Red
        Write-Host "Error: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 Test completed" -ForegroundColor Blue
