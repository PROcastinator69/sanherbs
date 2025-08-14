const twilio = require('twilio');

class SMSService {
    constructor() {
        // Check if Twilio credentials are configured
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !phoneNumber || 
            accountSid === 'your_twilio_account_sid' || 
            authToken === 'your_twilio_auth_token' ||
            phoneNumber === 'your_twilio_phone_number') {
            
            console.log('📱 SMS service disabled - Twilio credentials not configured');
            this.client = null;
            this.enabled = false;
            return;
        }

        try {
            this.client = twilio(accountSid, authToken);
            this.enabled = true;
            console.log('📱 SMS service enabled');
        } catch (error) {
            console.error('📱 SMS service initialization failed:', error.message);
            this.client = null;
            this.enabled = false;
        }
    }

    // Send order confirmation SMS
    async sendOrderConfirmation(phoneNumber, orderDetails) {
        if (!this.enabled) {
            console.log('📱 SMS notification skipped (service disabled)');
            return { success: false, error: 'SMS service not configured' };
        }

        try {
            const message = `🌿 GreenTap Health: Order confirmed! Order ID: ${orderDetails.orderId}, Amount: ₹${orderDetails.amount}. Track at ${process.env.APP_URL}/order-tracking.html?orderId=${orderDetails.orderId}`;

            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${phoneNumber}`
            });

            console.log('Order confirmation SMS sent:', result.sid);
            return { success: true, messageId: result.sid };
        } catch (error) {
            console.error('Order confirmation SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send order status update SMS
    async sendOrderStatusUpdate(phoneNumber, orderDetails) {
        if (!this.enabled) {
            console.log('📱 SMS status update skipped (service disabled)');
            return { success: false, error: 'SMS service not configured' };
        }

        try {
            const message = `🌿 GreenTap Health: Order ${orderDetails.orderId} status updated to "${orderDetails.status}". Track your order at ${process.env.APP_URL}/order-tracking.html?orderId=${orderDetails.orderId}`;

            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${phoneNumber}`
            });

            console.log('Order status SMS sent:', result.sid);
            return { success: true, messageId: result.sid };
        } catch (error) {
            console.error('Order status SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send delivery notification SMS
    async sendDeliveryNotification(phoneNumber, orderDetails) {
        if (!this.enabled) {
            console.log('📱 SMS delivery notification skipped (service disabled)');
            return { success: false, error: 'SMS service not configured' };
        }

        try {
            const message = `🎉 GreenTap Health: Your order ${orderDetails.orderId} has been delivered! Thank you for choosing us. Shop again at ${process.env.APP_URL}`;

            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${phoneNumber}`
            });

            console.log('Delivery notification SMS sent:', result.sid);
            return { success: true, messageId: result.sid };
        } catch (error) {
            console.error('Delivery notification SMS error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send OTP
    async sendOTP(phoneNumber, otp) {
        if (!this.enabled) {
            console.log('📱 OTP SMS skipped (service disabled)');
            return { success: false, error: 'SMS service not configured' };
        }

        try {
            const message = `Your GreenTap Health verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `+91${phoneNumber}`
            });

            console.log('OTP SMS sent:', result.sid);
            return { success: true, messageId: result.sid };
        } catch (error) {
            console.error('OTP SMS error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SMSService();
