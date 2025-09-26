// maralemBillsService.js - Core MaralemPay Discount Logic

require('dotenv').config();
const axios = require('axios');

// --- Configuration ---
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const DISCOUNT_RATE = 0.10; // 10% discount for subscribers

/**
 * Calculates the amount the user must pay after the 10% discount.
 * @param {number} totalAmount - The face value of the airtime/data.
 * @returns {number} The discounted amount the subscriber pays.
 */
function calculateDiscountedAmount(totalAmount) {
    const discount = totalAmount * DISCOUNT_RATE;
    // Round to 2 decimal places for currency
    return Math.round((totalAmount - discount) * 100) / 100;
}

/**
 * Calculates the subsidy amount that MaralemPay covers
 * @param {number} totalAmount - The face value of the airtime/data.
 * @returns {number} The subsidy amount (10% of total)
 */
function calculateSubsidyAmount(totalAmount) {
    const discount = totalAmount * DISCOUNT_RATE;
    return Math.round(discount * 100) / 100;
}

/**
 * Handles the purchase of airtime or data with a 10% discount for a subscriber.
 * This function orchestrates the payment flow:
 * 1. Calculates discounted amount for user
 * 2. Processes full payment via Flutterwave Bills API
 * 3. Records transaction with discount details
 * 
 * @param {object} billDetails - The airtime or data purchase request
 * @param {string} billDetails.type - 'AIRTIME' or 'DATA'
 * @param {string} billDetails.customer - The recipient phone number
 * @param {number} billDetails.amount - The full nominal price (e.g., 100 NGN)
 * @param {string} billDetails.biller_name - e.g., 'MTN', 'Airtel'
 * @param {string} billDetails.tx_ref - Unique transaction reference
 * @param {string} billDetails.biller_code - Flutterwave biller code (e.g., 'BIL108')
 * @param {object} user - User object with subscription details
 */
async function initiateMaralemPurchase(billDetails, user) {
    const { type, customer, amount, biller_name, tx_ref, biller_code } = billDetails;

    // 1. Calculate the discount amounts
    const discountedAmount = calculateDiscountedAmount(amount);
    const subsidyAmount = calculateSubsidyAmount(amount);

    console.log(`[MaralemPay] Full Amount: ${amount}, User Pays: ${discountedAmount}, Subsidy: ${subsidyAmount}`);

    // 2. Verify user subscription status
    if (!user.isActiveSubscriber()) {
        throw new Error('User must be an active subscriber to receive discounts');
    }

    // 3. Prepare the Flutterwave API Payload (Full Amount)
    const payload = {
        country: "NG",
        customer: customer,
        amount: amount, // The network receives the FULL amount
        type: type,
        biller_name: biller_name,
        biller_code: biller_code,
        // Use a unique reference for each attempt
        reference: `${tx_ref}-${Date.now()}`, 
        // For Airtime: 'ONCE', For Data/Cable: check specific biller docs
        recurrence: "ONCE", 
    };
    
    // 4. Make the Flutterwave API Call
    try {
        console.log(`[MaralemPay] Making Flutterwave API call with payload:`, payload);
        
        const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/bills`, payload, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const flwData = response.data;
        console.log(`[MaralemPay] Flutterwave response:`, flwData);

        // 5. Handle Flutterwave Response
        if (flwData.status === 'success') {
            // Transaction successful
            return {
                status: 'success',
                message: `Successfully purchased ${amount} ${type} for ${customer}. Discount applied.`,
                transaction_details: flwData.data,
                discount_details: {
                    full_amount: amount,
                    user_paid: discountedAmount,
                    subsidy_amount: subsidyAmount,
                    discount_percentage: DISCOUNT_RATE * 100
                },
                flw_reference: flwData.data.reference,
                flw_transaction_id: flwData.data.id
            };
        } else {
            // Transaction failed (e.g., network timeout, provider issue)
            return {
                status: 'error',
                message: flwData.message || 'Flutterwave transaction failed.',
                details: flwData,
                discount_details: {
                    full_amount: amount,
                    user_paid: discountedAmount,
                    subsidy_amount: subsidyAmount,
                    discount_percentage: DISCOUNT_RATE * 100
                }
            };
        }

    } catch (error) {
        console.error('Flutterwave API Error:', error.response ? error.response.data : error.message);
        
        // Handle different types of errors
        if (error.response) {
            // Server responded with error status
            return {
                status: 'api_error',
                message: `Flutterwave API Error: ${error.response.data.message || 'Unknown error'}`,
                details: error.response.data,
                discount_details: {
                    full_amount: amount,
                    user_paid: discountedAmount,
                    subsidy_amount: subsidyAmount,
                    discount_percentage: DISCOUNT_RATE * 100
                }
            };
        } else if (error.request) {
            // Request was made but no response received
            return {
                status: 'network_error',
                message: 'Network error: Unable to reach Flutterwave API',
                details: error.message,
                discount_details: {
                    full_amount: amount,
                    user_paid: discountedAmount,
                    subsidy_amount: subsidyAmount,
                    discount_percentage: DISCOUNT_RATE * 100
                }
            };
        } else {
            // Something else happened
            return {
                status: 'fatal_error',
                message: 'Unexpected error occurred',
                details: error.message,
                discount_details: {
                    full_amount: amount,
                    user_paid: discountedAmount,
                    subsidy_amount: subsidyAmount,
                    discount_percentage: DISCOUNT_RATE * 100
                }
            };
        }
    }
}

/**
 * Verify a bill payment transaction
 * @param {string} reference - Transaction reference to verify
 * @returns {object} Verification result
 */
async function verifyMaralemPayment(reference) {
    try {
        const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/bills/${reference}`, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const flwData = response.data;
        
        if (flwData.status === 'success') {
            return {
                status: 'success',
                transaction: flwData.data,
                message: 'Transaction verified successfully'
            };
        } else {
            return {
                status: 'error',
                message: flwData.message || 'Transaction verification failed',
                details: flwData
            };
        }
    } catch (error) {
        console.error('Payment verification error:', error.response ? error.response.data : error.message);
        return {
            status: 'error',
            message: 'Failed to verify transaction',
            details: error.response ? error.response.data : error.message
        };
    }
}

/**
 * Get bill categories from Flutterwave
 * @returns {object} Bill categories
 */
async function getBillCategories() {
    try {
        const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/bill-categories`, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        return {
            status: 'success',
            categories: response.data.data
        };
    } catch (error) {
        console.error('Get bill categories error:', error.response ? error.response.data : error.message);
        return {
            status: 'error',
            message: 'Failed to fetch bill categories',
            details: error.response ? error.response.data : error.message
        };
    }
}

/**
 * Get billers for a specific category
 * @param {string} category - Category ID
 * @returns {object} Billers list
 */
async function getBillers(category) {
    try {
        const response = await axios.get(`${FLUTTERWAVE_BASE_URL}/billers?category=${category}`, {
            headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        return {
            status: 'success',
            billers: response.data.data
        };
    } catch (error) {
        console.error('Get billers error:', error.response ? error.response.data : error.message);
        return {
            status: 'error',
            message: 'Failed to fetch billers',
            details: error.response ? error.response.data : error.message
        };
    }
}

module.exports = {
    initiateMaralemPurchase,
    calculateDiscountedAmount,
    calculateSubsidyAmount,
    verifyMaralemPayment,
    getBillCategories,
    getBillers,
    DISCOUNT_RATE
};

