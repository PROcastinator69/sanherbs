const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const razorpayService = require('../services/razorpay');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const shiprocketService = require('../services/shiprocket');

// Middleware to verify JWT token (your existing middleware)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'greentap-health-secret-key-2025';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Create new order (Enhanced with payment options)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, deliveryAddress, contactNumber, notes, paymentMethod = 'cod', customerDetails } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        if (!deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required'
            });
        }

        // Generate unique order number
        const orderNumber = paymentMethod === 'razorpay' ? 
            'GT' + Date.now().toString().slice(-6) : 
            'GT' + Date.now().toString().slice(-6);
        
        let totalAmount = 0;

        // Validate items and calculate total (your existing logic)
        const validatedItems = [];
        for (const item of items) {
            const product = await req.db.get(
                'SELECT id, name, price, stock_quantity FROM products WHERE id = ? AND is_active = 1',
                [item.productId]
            );

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product with ID ${item.productId} not found`
                });
            }

            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`
                });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            validatedItems.push({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                price: product.price,
                total: itemTotal
            });
        }

        // **NEW: Handle Razorpay payment orders**
        if (paymentMethod === 'razorpay') {
            // Create Razorpay order
            const razorpayResult = await razorpayService.createOrder(
                totalAmount,
                'INR',
                orderNumber,
                { customer: customerDetails?.name || req.user.firstName, items: JSON.stringify(validatedItems) }
            );

            if (!razorpayResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create payment order',
                    error: razorpayResult.error
                });
            }

            // Create order with payment_pending status
            const orderResult = await req.db.run(
                `INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, 
                 delivery_address, contact_number, notes, razorpay_order_id, customer_name, customer_email, customer_phone)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.userId, 
                    orderNumber, 
                    totalAmount, 
                    'payment_pending', 
                    paymentMethod, 
                    JSON.stringify(deliveryAddress), 
                    contactNumber, 
                    notes || '',
                    razorpayResult.order.id,
                    customerDetails?.name || req.user.firstName,
                    customerDetails?.email || req.user.email,
                    customerDetails?.phone || contactNumber
                ]
            );

            const orderId = orderResult.id;

            // Add order items
            for (const item of validatedItems) {
                await req.db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.productId, item.quantity, item.price]
                );
            }

            // Return payment details for frontend
            return res.status(201).json({
                success: true,
                message: 'Payment order created successfully',
                order: {
                    id: orderId,
                    orderNumber,
                    totalAmount,
                    status: 'payment_pending',
                    items: validatedItems
                },
                payment: {
                    orderId: orderNumber,
                    razorpayOrderId: razorpayResult.order.id,
                    amount: totalAmount,
                    currency: 'INR',
                    razorpayKeyId: process.env.RAZORPAY_KEY_ID
                }
            });
        }

        // **EXISTING: Handle COD orders (your original logic)**
        const orderResult = await req.db.run(
            `INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, delivery_address, contact_number, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.userId, orderNumber, totalAmount, 'processing', paymentMethod, deliveryAddress, contactNumber, notes || '']
        );

        const orderId = orderResult.id;

        // Add order items (your existing logic)
        for (const item of validatedItems) {
            await req.db.run(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.price]
            );

            // Update product stock
            await req.db.run(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: {
                id: orderId,
                orderNumber,
                totalAmount,
                status: 'processing',
                items: validatedItems
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// **NEW: Verify Razorpay payment**
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderNumber } = req.body;

        // Verify payment signature
        const isValidSignature = razorpayService.verifyPayment(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            // Update order status to failed
            await req.db.run(
                'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?',
                ['payment_failed', orderNumber]
            );

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update order status to paid
        await req.db.run(
            'UPDATE orders SET status = ?, payment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?',
            ['paid', razorpay_payment_id, orderNumber]
        );

        // Get order details for notifications
        const order = await req.db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);

        if (order) {
            // Update product stock (now that payment is confirmed)
            const items = await req.db.all(
                'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
                [order.id]
            );

            for (const item of items) {
                await req.db.run(
                    'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // Send confirmations
            const orderDetails = {
                orderId: order.order_number,
                amount: order.total_amount,
                status: 'Order Confirmed'
            };

            if (order.customer_email) {
                emailService.sendOrderConfirmation(order.customer_email, orderDetails);
            }

            if (order.customer_phone) {
                smsService.sendOrderConfirmation(order.customer_phone, orderDetails);
            }
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            orderNumber: orderNumber
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
});

// Get user orders (your existing logic - enhanced)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0, status } = req.query;

        let sql = `
            SELECT o.*, 
                   GROUP_CONCAT(p.name || ' x' || oi.quantity) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
        `;
        
        let params = [req.user.userId];

        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }

        sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const orders = await req.db.all(sql, params);

        res.json({
            success: true,
            orders: orders.map(order => ({
                ...order,
                items: order.items ? order.items.split(',') : [],
                // Parse delivery address if it's JSON
                delivery_address: order.delivery_address ? 
                    (order.delivery_address.startsWith('{') ? JSON.parse(order.delivery_address) : order.delivery_address) 
                    : null
            }))
        });

    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// **KEEP ALL YOUR EXISTING ENDPOINTS:**
// Get single order details (your existing code)
router.get('/:orderId', authenticateToken, async (req, res) => {
    // Your existing code here...
});

// Update order status (your existing code)
router.put('/:orderId/status', async (req, res) => {
    // Your existing code here...
});

// Cancel order (your existing code)
router.put('/:orderId/cancel', authenticateToken, async (req, res) => {
    // Your existing code here...
});

// Quick order via WhatsApp (your existing code)
router.post('/whatsapp', async (req, res) => {
    // Your existing code here...
});

module.exports = router;
