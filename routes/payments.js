const express = require('express');
const router = express.Router();
const razorpayService = require('../services/razorpay');
const emailService = require('../services/emailservice');
const smsService = require('../services/smsservice');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// Create payment order - SECURE VERSION
router.post('/create-order', authenticateToken, [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('items').isArray().withMessage('Items must be an array'),
    body('customerDetails').isObject().withMessage('Customer details required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { amount, items, customerDetails, deliveryAddress } = req.body;
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Create Razorpay order
        const razorpayResult = await razorpayService.createOrder(
            amount,
            'INR',
            orderId,
            { customer: customerDetails.name, items: JSON.stringify(items) }
        );

        if (!razorpayResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment order',
                error: razorpayResult.error
            });
        }

        // Save order to database
        const dbResult = await req.db.run(`
            INSERT INTO orders (
                order_number, user_id, razorpay_order_id, total_amount, status, 
                delivery_address, contact_number, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderId,
            req.user.userId,
            razorpayResult.order.id,
            amount,
            'created',
            JSON.stringify(deliveryAddress || {}),
            customerDetails.phone || null,
            JSON.stringify({ items, customerDetails }),
            new Date().toISOString()
        ]);

        // Save order items
        for (const item of items) {
            await req.db.run(`
                INSERT INTO order_items (
                    order_id, product_name, quantity, unit_price, total_price
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                dbResult.id,
                item.name,
                item.quantity || 1,
                item.price,
                (item.quantity || 1) * item.price
            ]);
        }

        console.log('✅ Order created with ID:', orderId);

        res.json({
            success: true,
            orderId: orderId,
            razorpayOrderId: razorpayResult.order.id,
            amount: amount,
            currency: 'INR',
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('❌ Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Verify payment - SECURE VERSION
router.post('/verify-payment', [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
    body('orderId').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        // Verify payment signature
        const isValidSignature = razorpayService.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            await req.db.run(
                'UPDATE orders SET status = ?, updated_at = ? WHERE order_number = ?',
                ['payment_failed', new Date().toISOString(), orderId]
            );
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Get payment details from Razorpay
        const paymentDetails = await razorpayService.getPaymentDetails(razorpay_payment_id);

        // Get order from database
        const order = await req.db.get('SELECT * FROM orders WHERE order_number = ?', [orderId]);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Save payment record
        await req.db.run(`
            INSERT INTO payments (
                order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature,
                amount, currency, method, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            order.id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentDetails.payment?.amount / 100 || order.total_amount,
            paymentDetails.payment?.currency || 'INR',
            paymentDetails.payment?.method || 'unknown',
            'completed',
            new Date().toISOString()
        ]);

        // Update order status
        await req.db.run(
            'UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?',
            ['processing', 'completed', new Date().toISOString(), order.id]
        );

        // Send notifications
        if (order.notes) {
            try {
                const orderData = JSON.parse(order.notes);
                const customerDetails = orderData.customerDetails;

                const orderDetails = {
                    orderId: order.order_number,
                    amount: order.total_amount,
                    status: 'Order Confirmed',
                    items: orderData.items?.map(item => item.name).join(', ') || 'Items',
                    address: JSON.parse(order.delivery_address || '{}')
                };

                // Send email notification
                if (customerDetails?.email) {
                    try {
                        await emailService.sendOrderConfirmation(customerDetails.email, orderDetails);
                    } catch (emailError) {
                        console.error('Email notification error:', emailError);
                    }
                }

                // Send SMS notification (if SMS service is enabled)
                if (customerDetails?.phone && process.env.TWILIO_ACCOUNT_SID) {
                    try {
                        await smsService.sendOrderConfirmation(customerDetails.phone, orderDetails);
                    } catch (smsError) {
                        console.error('SMS notification error:', smsError);
                    }
                }
            } catch (parseError) {
                console.error('Error parsing order data for notifications:', parseError);
            }
        }

        console.log('✅ Payment verified successfully for order:', orderId);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: orderId,
            status: 'confirmed'
        });

    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
});

// Get payment history - SECURE VERSION
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const payments = await req.db.all(`
            SELECT p.*, o.order_number, o.total_amount, o.status as order_status,
                   o.created_at as order_date
            FROM payments p 
            JOIN orders o ON p.order_id = o.id 
            WHERE o.user_id = ? 
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [req.user.userId]);

        res.json({
            success: true,
            payments: payments
        });

    } catch (error) {
        console.error('❌ Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history',
            error: error.message
        });
    }
});

// Refund payment - SECURE VERSION
router.post('/refund', authenticateToken, [
    body('orderId').notEmpty(),
    body('reason').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { orderId, reason } = req.body;

        // Get order details
        const order = await req.db.get(
            'SELECT * FROM orders WHERE order_number = ? AND user_id = ?', 
            [orderId, req.user.userId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order is eligible for refund
        if (!['processing', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order is not eligible for refund'
            });
        }

        // Get payment details
        const payment = await req.db.get(
            'SELECT * FROM payments WHERE order_id = ? AND status = ?', 
            [order.id, 'completed']
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No completed payment found for this order'
            });
        }

        // Process refund through Razorpay
        const refundResult = await razorpayService.refundPayment(
            payment.razorpay_payment_id,
            payment.amount * 100, // Convert to paise for Razorpay
            reason
        );

        if (!refundResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Refund processing failed',
                error: refundResult.error
            });
        }

        // Update order and payment status
        await req.db.run(
            'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
            ['refunded', new Date().toISOString(), order.id]
        );

        await req.db.run(
            'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?',
            ['refunded', new Date().toISOString(), payment.id]
        );

        console.log('✅ Refund processed for order:', orderId);

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refundId: refundResult.refund?.id || 'PENDING'
        });

    } catch (error) {
        console.error('❌ Refund processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Refund processing failed',
            error: error.message
        });
    }
});

// Get order details - SECURE VERSION
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await req.db.get(`
            SELECT o.*, p.razorpay_payment_id, p.method as payment_method,
                   p.status as payment_status
            FROM orders o
            LEFT JOIN payments p ON o.id = p.order_id
            WHERE o.order_number = ? AND o.user_id = ?
        `, [orderId, req.user.userId]);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get order items
        const orderItems = await req.db.all(
            'SELECT * FROM order_items WHERE order_id = ?',
            [order.id]
        );

        res.json({
            success: true,
            order: {
                ...order,
                items: orderItems,
                delivery_address: JSON.parse(order.delivery_address || '{}'),
                notes: order.notes ? JSON.parse(order.notes) : null
            }
        });

    } catch (error) {
        console.error('❌ Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details',
            error: error.message
        });
    }
});

module.exports = router;
