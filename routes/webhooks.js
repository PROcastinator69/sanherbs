const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const razorpayService = require('../services/razorpay');
const shiprocketService = require('../services/shiprocket');
const emailService = require('../services/emailservice');
const smsService = require('../services/smsservice');
const { attachDatabase } = require('../middleware/auth'); // Import database middleware

// Razorpay webhook endpoint - FIXED VERSION
router.post('/razorpay', express.raw({ type: 'application/json' }), attachDatabase, async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body = req.body.toString();

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(body);
        console.log('📥 Razorpay webhook received:', event.event, event.payload);

        switch (event.event) {
            case 'payment.captured':
                await handlePaymentCaptured(event.payload.payment.entity, req.db);
                break;

            case 'payment.failed':
                await handlePaymentFailed(event.payload.payment.entity, req.db);
                break;

            case 'order.paid':
                await handleOrderPaid(event.payload.order.entity, req.db);
                break;

            case 'refund.created':
                await handleRefundCreated(event.payload.refund.entity, req.db);
                break;

            default:
                console.log('⚠️ Unhandled webhook event:', event.event);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Handle successful payment capture - FIXED VERSION
async function handlePaymentCaptured(payment, db) {
    try {
        console.log('💳 Processing payment captured:', payment.id);

        // Find order by Razorpay order ID - FIXED VERSION
        const order = await db.get('SELECT * FROM orders WHERE razorpay_order_id = ?', [payment.order_id]);

        if (!order) {
            console.error('❌ Order not found for payment:', payment.id);
            return;
        }

        // Update payment record - FIXED VERSION
        await db.run(`
            UPDATE payments 
            SET status = 'captured', method = ?, fee = ?, tax = ?, updated_at = ?
            WHERE razorpay_payment_id = ?
        `, [
            payment.method,
            payment.fee / 100,
            payment.tax / 100,
            new Date().toISOString(),
            payment.id
        ]);

        // Update order status - FIXED VERSION
        await db.run(
            'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
            ['processing', new Date().toISOString(), order.id]
        );

        // **CRITICAL: Automatically create Shiprocket order after payment success**
        await createShiprocketOrder(order, db);

        // Send notifications
        const orderDetails = {
            orderId: order.id,
            amount: order.amount,
            status: 'Processing',
            items: JSON.parse(order.items || '[]').map(item => item.name).join(', ')
        };

        if (order.customer_email) {
            try {
                await emailService.sendOrderConfirmation(order.customer_email, orderDetails);
            } catch (emailError) {
                console.error('📧 Email notification error:', emailError);
            }
        }

        if (order.customer_phone) {
            try {
                await smsService.sendOrderConfirmation(order.customer_phone, orderDetails);
            } catch (smsError) {
                console.error('📱 SMS notification error:', smsError);
            }
        }

        console.log('✅ Payment captured successfully processed for order:', order.id);

    } catch (error) {
        console.error('❌ Handle payment captured error:', error);
    }
}

// **NEW: Automatic Shiprocket order creation after payment success**
async function createShiprocketOrder(order, db) {
    try {
        console.log('📦 Creating Shiprocket order for:', order.id);

        // Parse order items and delivery address
        const items = JSON.parse(order.items || '[]');
        const deliveryAddress = JSON.parse(order.delivery_address || '{}');

        // Prepare Shiprocket order data
        const shiprocketOrderData = {
            orderId: order.id,
            customerName: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            address: deliveryAddress.address || deliveryAddress.street,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            pincode: deliveryAddress.pincode,
            amount: order.amount,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity || 1,
                price: item.price || 0,
                sku: item.sku || item.name.replace(/\s+/g, '-').toLowerCase()
            }))
        };

        // Create Shiprocket order
        const shiprocketResult = await shiprocketService.createOrder(shiprocketOrderData);

        if (shiprocketResult.success) {
            // Save delivery record - FIXED VERSION
            await db.run(`
                INSERT INTO delivery (
                    order_id, shiprocket_order_id, awb_number, courier_name,
                    status, tracking_url, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                order.id,
                shiprocketResult.data.order_id,
                shiprocketResult.data.awb_code || null,
                shiprocketResult.data.courier_name || 'TBD',
                'shipped',
                shiprocketResult.data.tracking_url || null,
                new Date().toISOString()
            ]);

            // Update order with shipping info - FIXED VERSION
            await db.run(
                'UPDATE orders SET status = ?, tracking_id = ?, updated_at = ? WHERE id = ?',
                ['shipped', shiprocketResult.data.awb_code, new Date().toISOString(), order.id]
            );

            console.log('✅ Shiprocket order created successfully:', shiprocketResult.data.order_id);
        } else {
            console.error('❌ Shiprocket order creation failed:', shiprocketResult.error);
        }

    } catch (error) {
        console.error('❌ Shiprocket order creation error:', error);
    }
}

// Handle failed payment - FIXED VERSION
async function handlePaymentFailed(payment, db) {
    try {
        console.log('❌ Processing payment failed:', payment.id);

        // Find order by Razorpay order ID - FIXED VERSION
        const order = await db.get('SELECT * FROM orders WHERE razorpay_order_id = ?', [payment.order_id]);

        if (order) {
            // Update order status - FIXED VERSION
            await db.run(
                'UPDATE orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?',
                [
                    'payment_failed',
                    `Payment failed: ${payment.error_description || 'Unknown error'}`,
                    new Date().toISOString(),
                    order.id
                ]
            );

            console.log('💸 Payment failure processed for order:', order.id);
        }

    } catch (error) {
        console.error('❌ Handle payment failed error:', error);
    }
}

// Handle order paid - FIXED VERSION
async function handleOrderPaid(order, db) {
    try {
        console.log('💰 Processing order paid:', order.id);

        // Update order status if found - FIXED VERSION
        await db.run(
            'UPDATE orders SET status = ?, updated_at = ? WHERE razorpay_order_id = ?',
            ['paid', new Date().toISOString(), order.id]
        );

        console.log('✅ Order paid status updated for Razorpay order:', order.id);

    } catch (error) {
        console.error('❌ Handle order paid error:', error);
    }
}

// Handle refund created - FIXED VERSION
async function handleRefundCreated(refund, db) {
    try {
        console.log('💸 Processing refund created:', refund.id);

        // Update payment status - FIXED VERSION
        await db.run(
            'UPDATE payments SET status = ?, updated_at = ? WHERE razorpay_payment_id = ?',
            ['refunded', new Date().toISOString(), refund.payment_id]
        );

        // Update order status - FIXED VERSION
        const order = await db.get(`
            SELECT o.* FROM orders o 
            JOIN payments p ON o.payment_id = p.id 
            WHERE p.razorpay_payment_id = ?
        `, [refund.payment_id]);

        if (order) {
            await db.run(
                'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
                ['refunded', new Date().toISOString(), order.id]
            );

            // Send refund notification
            const orderDetails = {
                orderId: order.id,
                amount: refund.amount / 100,
                status: 'Refunded'
            };

            if (order.customer_email) {
                console.log('💌 Refund notification should be sent to:', order.customer_email);
                // You can implement refund email template
            }
        }

        console.log('✅ Refund processed successfully for payment:', refund.payment_id);

    } catch (error) {
        console.error('❌ Handle refund created error:', error);
    }
}

// Shiprocket webhook endpoint - FIXED VERSION
router.post('/shiprocket', attachDatabase, async (req, res) => {
    try {
        const data = req.body;
        console.log('📦 Shiprocket webhook received:', data);

        // Process tracking update
        if (data.order_id && data.current_status) {
            // Find delivery record by Shiprocket order ID - FIXED VERSION
            const delivery = await req.db.get('SELECT * FROM delivery WHERE shiprocket_order_id = ?', [data.order_id]);

            if (delivery) {
                // Update delivery status - FIXED VERSION
                await req.db.run(`
                    UPDATE delivery 
                    SET status = ?, current_location = ?, updated_at = ?
                    WHERE id = ?
                `, [
                    data.current_status.toLowerCase().replace(' ', '_'),
                    data.current_location || delivery.current_location,
                    new Date().toISOString(),
                    delivery.id
                ]);

                // Update order status if delivered
                if (data.current_status.toLowerCase().includes('delivered')) {
                    await req.db.run(
                        'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
                        ['delivered', new Date().toISOString(), delivery.order_id]
                    );

                    // Send delivery notification - FIXED VERSION
                    const order = await req.db.get('SELECT * FROM orders WHERE id = ?', [delivery.order_id]);

                    if (order) {
                        const orderDetails = {
                            orderId: order.id,
                            status: 'Delivered',
                            amount: order.amount
                        };

                        if (order.customer_email) {
                            try {
                                await emailService.sendDeliveryNotification(order.customer_email, orderDetails);
                            } catch (emailError) {
                                console.error('📧 Delivery email error:', emailError);
                            }
                        }

                        if (order.customer_phone) {
                            try {
                                await smsService.sendDeliveryNotification(order.customer_phone, orderDetails);
                            } catch (smsError) {
                                console.error('📱 Delivery SMS error:', smsError);
                            }
                        }
                    }
                }

                console.log('✅ Shiprocket tracking updated for order:', delivery.order_id);
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('❌ Shiprocket webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Test webhook endpoint - FIXED VERSION
router.post('/test', attachDatabase, async (req, res) => {
    try {
        console.log('🧪 Test webhook received:', req.body);
        
        res.json({
            success: true,
            message: 'Test webhook received successfully',
            received_data: req.body,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Test webhook error:', error);
        res.status(500).json({ error: 'Test webhook failed' });
    }
});

module.exports = router;

