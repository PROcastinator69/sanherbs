const express = require('express');
const router = express.Router();
const razorpayService = require('../services/razorpay');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// Create payment order
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

        // Save order to database - FIXED VERSION using promisified methods
        const dbResult = await req.db.run(`
            INSERT INTO orders (
                id, user_id, razorpay_order_id, amount, status, 
                items, customer_name, customer_email, customer_phone,
                delivery_address, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            orderId,
            req.user.userId, // Using userId from your auth middleware
            razorpayResult.order.id,
            amount,
            'created',
            JSON.stringify(items),
            customerDetails.name,
            customerDetails.email,
            customerDetails.phone,
            JSON.stringify(deliveryAddress),
            new Date().toISOString()
        ]);

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

// Verify payment - FIXED VERSION
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
            // Update order status to failed - FIXED VERSION
            await req.db.run(
                'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
                ['payment_failed', new Date().toISOString(), orderId]
            );

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Get payment details
        const paymentDetails = await razorpayService.getPaymentDetails(razorpay_payment_id);

        // Save payment record - FIXED VERSION
        const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await req.db.run(`
            INSERT INTO payments (
                id, order_id, razorpay_payment_id, amount, currency,
                method, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            paymentId,
            orderId,
            razorpay_payment_id,
            paymentDetails.payment?.amount / 100 || 0,
            paymentDetails.payment?.currency || 'INR',
            paymentDetails.payment?.method || 'unknown',
            'completed',
            new Date().toISOString()
        ]);

        // Update order status - FIXED VERSION
        await req.db.run(
            'UPDATE orders SET status = ?, payment_id = ?, updated_at = ? WHERE id = ?',
            ['paid', paymentId, new Date().toISOString(), orderId]
        );

        // Get order details for notifications - FIXED VERSION
        const order = await req.db.get('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (order) {
            // Send confirmation email and SMS
            const orderDetails = {
                orderId: order.id,
                amount: order.amount,
                status: 'Order Confirmed',
                items: JSON.parse(order.items || '[]').map(item => item.name).join(', '),
                address: JSON.parse(order.delivery_address || '{}')
            };

            // Send email notification
            if (order.customer_email) {
                try {
                    await emailService.sendOrderConfirmation(order.customer_email, orderDetails);
                } catch (emailError) {
                    console.error('Email notification error:', emailError);
                }
            }

            // Send SMS notification
            if (order.customer_phone) {
                try {
                    await smsService.sendOrderConfirmation(order.customer_phone, orderDetails);
                } catch (smsError) {
                    console.error('SMS notification error:', smsError);
                }
            }
        }

        console.log('✅ Payment verified successfully for order:', orderId);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderId: orderId,
            paymentId: paymentId
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

// Get payment history - FIXED VERSION
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const payments = await req.db.all(`
            SELECT p.*, o.customer_name, o.items 
            FROM payments p 
            JOIN orders o ON p.order_id = o.id 
            WHERE o.user_id = ? 
            ORDER BY p.created_at DESC
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

// Refund payment - FIXED VERSION
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

        // Get order details - FIXED VERSION
        const order = await req.db.get(
            'SELECT * FROM orders WHERE id = ? AND user_id = ?', 
            [orderId, req.user.userId]
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get payment details - FIXED VERSION
        const payment = await req.db.get(
            'SELECT * FROM payments WHERE order_id = ?', 
            [orderId]
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Process refund
        const refundResult = await razorpayService.refundPayment(
            payment.razorpay_payment_id,
            payment.amount * 100 // Convert to paise for Razorpay
        );

        if (!refundResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Refund processing failed',
                error: refundResult.error
            });
        }

        // Update order and payment status - FIXED VERSION
        await req.db.run(
            'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
            ['refunded', new Date().toISOString(), orderId]
        );

        await req.db.run(
            'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?',
            ['refunded', new Date().toISOString(), payment.id]
        );

        console.log('✅ Refund processed for order:', orderId);

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refundId: refundResult.refund.id
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

// Get order details
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await req.db.get(`
            SELECT o.*, p.razorpay_payment_id, p.method as payment_method
            FROM orders o
            LEFT JOIN payments p ON o.id = p.order_id
            WHERE o.id = ? AND o.user_id = ?
        `, [orderId, req.user.userId]);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            order: {
                ...order,
                items: JSON.parse(order.items || '[]'),
                delivery_address: JSON.parse(order.delivery_address || '{}')
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
