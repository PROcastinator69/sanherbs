// Twilio SMS service disabled by user preference
// const twilio = require('twilio');

console.log('📱 SMS service is disabled - Twilio not loaded');

module.exports = {
    sendSMS: async (to, message) => {
        console.log(`📱 SMS would have been sent to ${to}: ${message}`);
        console.log('📱 SMS service is disabled - no message sent');
        return Promise.resolve({ success: true, disabled: true });
    },
    
    sendOrderNotification: async (to, orderData) => {
        console.log(`📱 Order SMS would have been sent to ${to}:`, orderData);
        console.log('📱 SMS service is disabled - no notification sent');
        return Promise.resolve({ success: true, disabled: true });
    },
    
    sendDeliveryUpdate: async (to, trackingData) => {
        console.log(`📱 Delivery SMS would have been sent to ${to}:`, trackingData);
        console.log('📱 SMS service is disabled - no update sent');
        return Promise.resolve({ success: true, disabled: true });
    }
};
