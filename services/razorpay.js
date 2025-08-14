const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }

    // Create Razorpay order
    async createOrder(amount, currency = 'INR', receipt, notes = {}) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Convert to paise
                currency: currency,
                receipt: receipt,
                notes: notes,
                payment_capture: 1 // Auto capture payment
            };

            console.log('Creating Razorpay order:', options);
            const order = await this.razorpay.orders.create(options);
            console.log('Razorpay order created:', order);
            
            return { success: true, order };
        } catch (error) {
            console.error('Razorpay order creation error:', error);
            return { success: false, error: error.message };
        }
    }

    // Verify payment signature
    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
        try {
            const sign = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSign = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(sign.toString())
                .digest("hex");

            const isValid = razorpay_signature === expectedSign;
            console.log('Payment verification:', { isValid, expected: expectedSign, received: razorpay_signature });
            
            return isValid;
        } catch (error) {
            console.error('Payment verification error:', error);
            return false;
        }
    }

    // Get payment details
    async getPaymentDetails(paymentId) {
        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return { success: true, payment };
        } catch (error) {
            console.error('Get payment details error:', error);
            return { success: false, error: error.message };
        }
    }

    // Refund payment
    async refundPayment(paymentId, amount) {
        try {
            const refund = await this.razorpay.payments.refund(paymentId, {
                amount: Math.round(amount * 100), // Convert to paise
                speed: 'optimum'
            });
            return { success: true, refund };
        } catch (error) {
            console.error('Refund payment error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new RazorpayService();
