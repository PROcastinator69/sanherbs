const db = require('../database/database');
const razorpayService = require('../services/razorpay');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const shiprocketService = require('../services/shiprocket');

class OrderController {
    // Create order with payment processing
    async createOrderWithPayment(orderData, userId) {
        try {
            const { items, deliveryAddress, customerDetails, paymentMethod } = orderData;
            
            // Calculate total amount
            let totalAmount = 0;
            const validatedItems = [];

            for (const item of items) {
                const product = await this.getProductById(item.productId);
                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                if (product.stock_quantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}`);
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

            // Generate order ID
            const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Create Razorpay order if payment method is online
            let razorpayOrderId = null;
            if (paymentMethod === 'razorpay') {
                const razorpayResult = await razorpayService.createOrder(
                    totalAmount,
                    'INR',
                    orderId,
                    { customer: customerDetails.name, items: JSON.stringify(validatedItems) }
                );

                if (!razorpayResult.success) {
                    throw new Error('Failed to create payment order');
                }

                razorpayOrderId = razorpayResult.order.id;
            }

            // Save order to database
            const insertOrder = db.prepare(`
                INSERT INTO orders (
                    id, user_id, razorpay_order_id, amount, status, 
                    items, customer_name, customer_email, customer_phone,
                    delivery_address, payment_method, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertOrder.run(
                orderId,
                userId,
                razorpayOrderId,
                totalAmount,
                paymentMethod === 'razorpay' ? 'payment_pending' : 'processing',
                JSON.stringify(validatedItems),
                customerDetails.name,
                customerDetails.email,
                customerDetails.phone,
                JSON.stringify(deliveryAddress),
                paymentMethod,
                new Date().toISOString()
            );

            // Update stock if COD order
            if (paymentMethod === 'cod') {
                await this.updateProductStock(validatedItems, 'decrease');
            }

            return {
                success: true,
                orderId: orderId,
                razorpayOrderId: razorpayOrderId,
                amount: totalAmount,
                items: validatedItems
            };

        } catch (error) {
            console.error('Order creation error:', error);
            throw error;
        }
    }

    // Verify and complete payment
    async verifyAndCompletePayment(paymentData) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = paymentData;

            // Verify payment signature
            const isValidSignature = razorpayService.verifyPayment(
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            );

            if (!isValidSignature) {
                await this.updateOrderStatus(orderId, 'payment_failed');
                throw new Error('Payment verification failed');
            }

            // Get payment details
            const paymentDetails = await razorpayService.getPaymentDetails(razorpay_payment_id);

            // Save payment record
            const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const insertPayment = db.prepare(`
                INSERT INTO payments (
                    id, order_id, razorpay_payment_id, amount, currency,
                    method, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertPayment.run(
                paymentId,
                orderId,
                razorpay_payment_id,
                paymentDetails.payment?.amount / 100 || 0,
                paymentDetails.payment?.currency || 'INR',
                paymentDetails.payment?.method || 'unknown',
                'completed',
                new Date().toISOString()
            );

            // Update order status
            await this.updateOrderStatus(orderId, 'paid', paymentId);

            // Update product stock
            const order = await this.getOrderById(orderId);
            if (order && order.items) {
                const items = JSON.parse(order.items);
                await this.updateProductStock(items, 'decrease');
            }

            // Send notifications
            if (order) {
                await this.sendOrderNotifications(order, 'payment_confirmed');
            }

            return {
                success: true,
                orderId: orderId,
                paymentId: paymentId
            };

        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status, paymentId = null) {
        try {
            const updateOrder = db.prepare(
                `UPDATE orders SET status = ?, payment_id = ?, updated_at = ? WHERE id = ?`
            );

            updateOrder.run(status, paymentId, new Date().toISOString(), orderId);

            // If order is being shipped, create shipping record
            if (status === 'shipped') {
                const order = await this.getOrderById(orderId);
                if (order) {
                    await this.createShippingRecord(order);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Update order status error:', error);
            throw error;
        }
    }

    // Create shipping record
    async createShippingRecord(order) {
        try {
            const deliveryAddress = JSON.parse(order.delivery_address || '{}');
            const items = JSON.parse(order.items || '[]');

            const shippingData = {
                orderId: order.id,
                customerName: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone,
                address: deliveryAddress.address,
                city: deliveryAddress.city,
                state: deliveryAddress.state,
                pincode: deliveryAddress.pincode,
                amount: order.amount,
                items: items
            };

            const shippingResult = await shiprocketService.createOrder(shippingData);

            if (shippingResult.success) {
                const deliveryId = `DEL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const insertDelivery = db.prepare(`
                    INSERT INTO delivery (
                        id, order_id, shiprocket_order_id, tracking_id, 
                        courier_name, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                insertDelivery.run(
                    deliveryId,
                    order.id,
                    shippingResult.data.order_id,
                    shippingResult.data.shipment_id,
                    shippingResult.data.courier_name || 'TBD',
                    'shipped',
                    new Date().toISOString()
                );

                console.log('Shipping record created for order:', order.id);
            }
        } catch (error) {
            console.error('Create shipping record error:', error);
        }
    }

    // Send order notifications
    async sendOrderNotifications(order, type) {
        try {
            const orderDetails = {
                orderId: order.id,
                amount: order.amount,
                status: this.getStatusDisplayName(order.status),
                items: JSON.parse(order.items || '[]').map(item => item.productName).join(', '),
                address: JSON.parse(order.delivery_address || '{}')
            };

            if (order.customer_email) {
                switch (type) {
                    case 'payment_confirmed':
                        await emailService.sendOrderConfirmation(order.customer_email, orderDetails);
                        break;
                    case 'status_update':
                        await emailService.sendOrderStatusUpdate(order.customer_email, orderDetails);
                        break;
                    case 'delivered':
                        await emailService.sendDeliveryNotification(order.customer_email, orderDetails);
                        break;
                }
            }

            if (order.customer_phone) {
                switch (type) {
                    case 'payment_confirmed':
                        await smsService.sendOrderConfirmation(order.customer_phone, orderDetails);
                        break;
                    case 'status_update':
                        await smsService.sendOrderStatusUpdate(order.customer_phone, orderDetails);
                        break;
                    case 'delivered':
                        await smsService.sendDeliveryNotification(order.customer_phone, orderDetails);
                        break;
                }
            }
        } catch (error) {
            console.error('Send notifications error:', error);
        }
    }

    // Helper methods
    async getProductById(productId) {
        const getProduct = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
        return getProduct.get(productId);
    }

    async getOrderById(orderId) {
        const getOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
        return getOrder.get(orderId);
    }

    async updateProductStock(items, operation) {
        for (const item of items) {
            const operator = operation === 'decrease' ? '-' : '+';
            const updateStock = db.prepare(
                `UPDATE products SET stock_quantity = stock_quantity ${operator} ? WHERE id = ?`
            );
            updateStock.run(item.quantity, item.productId);
        }
    }

    getStatusDisplayName(status) {
        const statusMap = {
            'created': 'Order Created',
            'payment_pending': 'Payment Pending',
            'paid': 'Payment Confirmed',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }
}

module.exports = new OrderController();
