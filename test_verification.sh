#!/bin/bash

# Flutterwave Payment Verification Test Script
# 
# Usage:
# ./test_verification.sh <transaction_id> [live|test]
# 
# Examples:
# ./test_verification.sh 86172870 live
# ./test_verification.sh TX17579308070491706 test

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if transaction ID is provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <transaction_id> [live|test]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 86172870 live"
    echo "  $0 TX17579308070491706 test"
    exit 1
fi

TRANSACTION_ID=$1
ENVIRONMENT=${2:-live}

# Set API key based on environment
if [ "$ENVIRONMENT" = "test" ]; then
    API_KEY=${FLUTTERWAVE_TEST_SECRET_KEY:-"FLWSECK_TEST-..."}
    echo -e "${BLUE}🌐 Environment: TEST${NC}"
else
    API_KEY=${FLUTTERWAVE_LIVE_SECRET_KEY:-"FLWSECK-..."}
    echo -e "${BLUE}🌐 Environment: LIVE${NC}"
fi

echo -e "${BLUE}🧪 Flutterwave Payment Verification Test${NC}"
echo "====================================="
echo ""
echo -e "${YELLOW}🔍 Verifying payment with Transaction ID: $TRANSACTION_ID${NC}"
echo -e "${YELLOW}🔑 Using Secret Key: ${API_KEY:0:15}...${NC}"
echo ""

# Make the API request
echo -e "${BLUE}📡 Making API request...${NC}"
echo ""

response=$(curl -s -w "\n%{http_code}" -X GET \
  "https://api.flutterwave.com/v3/transactions/$TRANSACTION_ID/verify" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

# Split response and status code
http_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | head -n -1)

echo -e "${BLUE}📊 Response Status: $http_code${NC}"
echo -e "${BLUE}📋 Response Data:${NC}"
echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"

echo ""

# Parse and display results
if [ "$http_code" = "200" ]; then
    status=$(echo "$response_body" | jq -r '.data.status' 2>/dev/null)
    
    case $status in
        "successful")
            echo -e "${GREEN}✅ Payment Status: $status${NC}"
            echo -e "${GREEN}🎉 Payment successful - ready to trigger bill delivery${NC}"
            
            amount=$(echo "$response_body" | jq -r '.data.amount' 2>/dev/null)
            currency=$(echo "$response_body" | jq -r '.data.currency' 2>/dev/null)
            customer_name=$(echo "$response_body" | jq -r '.data.customer.name' 2>/dev/null)
            customer_phone=$(echo "$response_body" | jq -r '.data.customer.phone_number' 2>/dev/null)
            
            echo -e "${GREEN}💰 Amount: $currency $amount${NC}"
            echo -e "${GREEN}📱 Customer: $customer_name ($customer_phone)${NC}"
            echo ""
            echo -e "${GREEN}🚀 Next Steps:${NC}"
            echo "1. Trigger bill delivery API"
            echo "2. Update transaction status to 'completed'"
            echo "3. Send success notification to user"
            ;;
        "pending")
            echo -e "${YELLOW}⏳ Payment Status: $status${NC}"
            echo -e "${YELLOW}⏳ Payment pending - will retry verification later${NC}"
            echo ""
            echo -e "${YELLOW}🔄 Next Steps:${NC}"
            echo "1. Wait 2-5 minutes"
            echo "2. Retry verification"
            echo "3. Repeat until status changes"
            ;;
        "failed"|"cancelled")
            echo -e "${RED}❌ Payment Status: $status${NC}"
            echo -e "${RED}❌ Payment failed or cancelled${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠️ Unknown Payment Status: $status${NC}"
            ;;
    esac
else
    echo -e "${RED}❌ Verification failed with status code: $http_code${NC}"
    
    error_message=$(echo "$response_body" | jq -r '.message' 2>/dev/null)
    if [ "$error_message" != "null" ] && [ -n "$error_message" ]; then
        echo -e "${RED}Error: $error_message${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📋 Test completed${NC}"
