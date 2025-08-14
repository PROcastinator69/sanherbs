const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({

            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Send order confirmation email
    async sendOrderConfirmation(customerEmail, orderDetails) {
        try {
            const mailOptions = {
                from: `"GreenTap Health" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `Order Confirmation - ${orderDetails.orderId}`,
                html: this.getOrderConfirmationTemplate(orderDetails)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Order confirmation email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Order confirmation email error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send order status update email
    async sendOrderStatusUpdate(customerEmail, orderDetails) {
        try {
            const mailOptions = {
                from: `"GreenTap Health" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `Order Update - ${orderDetails.orderId}`,
                html: this.getOrderUpdateTemplate(orderDetails)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Order status update email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Order status update email error:', error);
            return { success: false, error: error.message };
        }
    }

    // Send delivery notification email
    async sendDeliveryNotification(customerEmail, orderDetails) {
        try {
            const mailOptions = {
                from: `"GreenTap Health" <${process.env.EMAIL_USER}>`,
                to: customerEmail,
                subject: `Your Order Has Been Delivered - ${orderDetails.orderId}`,
                html: this.getDeliveryTemplate(orderDetails)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Delivery notification email sent:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Delivery notification email error:', error);
            return { success: false, error: error.message };
        }
    }

    // Order confirmation email template
    getOrderConfirmationTemplate(orderDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .order-details { background: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .footer { background: #f1f1f1; padding: 20px; text-align: center; font-size: 14px; }
                .btn { background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌿 GreenTap Health</h1>
                <h2>Order Confirmation</h2>
            </div>
            <div class="content">
                <p>Dear Customer,</p>
                <p>Thank you for your order! We've received your payment and are processing your order.</p>
                
                <div class="order-details">
                    <h3>Order Details:</h3>
                    <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                    <p><strong>Amount:</strong> ₹${orderDetails.amount}</p>
                    <p><strong>Status:</strong> ${orderDetails.status}</p>
                    <p><strong>Items:</strong> ${orderDetails.items || 'N/A'}</p>
                    <p><strong>Delivery Address:</strong> ${orderDetails.address || 'N/A'}</p>
                </div>
                
                <p>You can track your order status by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="${process.env.APP_URL}/order-tracking.html?orderId=${orderDetails.orderId}" class="btn">Track Your Order</a>
                </p>
                
                <p>We'll send you updates as your order progresses.</p>
                <p>Thank you for choosing GreenTap Health!</p>
            </div>
            <div class="footer">
                <p>© 2025 GreenTap Health. Your trusted partner for premium health supplements.</p>
                <p>Contact us: info@greentaphealth.com | +91 9876543210</p>
            </div>
        </body>
        </html>
        `;
    }

    // Order update email template
    getOrderUpdateTemplate(orderDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Update</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #2e7d32; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .status-update { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4caf50; }
                .footer { background: #f1f1f1; padding: 20px; text-align: center; font-size: 14px; }
                .btn { background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌿 GreenTap Health</h1>
                <h2>Order Update</h2>
            </div>
            <div class="content">
                <p>Dear Customer,</p>
                <p>We have an update on your order!</p>
                
                <div class="status-update">
                    <h3>Order Status Update:</h3>
                    <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                    <p><strong>Current Status:</strong> <span style="color: #4caf50; font-weight: bold;">${orderDetails.status}</span></p>
                    <p><strong>Updated On:</strong> ${new Date().toLocaleDateString()}</p>
                    ${orderDetails.trackingId ? `<p><strong>Tracking ID:</strong> ${orderDetails.trackingId}</p>` : ''}
                </div>
                
                <p style="text-align: center;">
                    <a href="${process.env.APP_URL}/order-tracking.html?orderId=${orderDetails.orderId}" class="btn">Track Your Order</a>
                </p>
                
                <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
                <p>© 2025 GreenTap Health. Your trusted partner for premium health supplements.</p>
                <p>Contact us: info@greentaphealth.com | +91 9876543210</p>
            </div>
        </body>
        </html>
        `;
    }

    // Delivery notification email template
    getDeliveryTemplate(orderDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Delivered</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .delivery-info { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .footer { background: #f1f1f1; padding: 20px; text-align: center; font-size: 14px; }
                .btn { background: #ff5722; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🌿 GreenTap Health</h1>
                <h2>🎉 Order Delivered!</h2>
            </div>
            <div class="content">
                <p>Dear Customer,</p>
                <p>Great news! Your order has been successfully delivered!</p>
                
                <div class="delivery-info">
                    <h3>Delivery Details:</h3>
                    <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                    <p><strong>Delivered On:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span style="color: #4caf50; font-weight: bold;">Delivered</span></p>
                </div>
                
                <p>We hope you're satisfied with your GreenTap Health products!</p>
                <p>Please leave us a review and let us know about your experience.</p>
                
                <p style="text-align: center;">
                    <a href="${process.env.APP_URL}/marketplace.html" class="btn">Shop Again</a>
                </p>
                
                <p>Thank you for choosing GreenTap Health for your wellness journey!</p>
            </div>
            <div class="footer">
                <p>© 2025 GreenTap Health. Your trusted partner for premium health supplements.</p>
                <p>Contact us: info@greentaphealth.com | +91 9876543210</p>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = new EmailService();
