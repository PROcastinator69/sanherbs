const razorpayService = require('../services/razorpay');
const db = require('../database/database');
const orderController = require('./orderController');

class PaymentController {
    // Create payment order
    async createPaymentOrder(orderData, userId) {
        try {
            const result = await orderController.createOrderWithPayment(orderData, userId);
            
            if (!result.success) {
                throw new Error('Failed to create order');
            }

            return {
                success: true,
                orderId: result.orderId,
                razorpayOrderId: result.razorpayOrderId,
                amount: result.amount,
                currency: 'INR',
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                items: result.items
            };

        } catch (error) {
            console.error('Create payment order error:', error);
            throw error;
        }
    }

    // Verify payment
    async verifyPayment(paymentData) {
        try {
            const result = await orderController.verifyAndCompletePayment(paymentData);
            return result;
        } catch (error) {
            console.error('Verify payment error:', error);
            throw error;
        }
    }

    // Get payment history for user
    async getPaymentHistory(userId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;

            const getPayments = db.prepare(`
                SELECT p.*, o.customer_name, o.items, o.amount as order_amount
                FROM payments p 
                JOIN orders o ON p.order_id = o.id 
                WHERE o.user_id = ? 
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `);

            const payments = getPayments.all(userId, limit, offset);

            // Parse items for each payment
            payments.forEach(payment => {
                if (payment.items) {
                    payment.items = JSON.parse(payment.items);
                }
            });

            return {
                success: true,
                payments: payments
            };

        } catch (error) {
            console.error('Get payment history error:', error);
            throw error;
        }
    }

    // Process refund
    async processRefund(orderId, userId, refundData) {
        try {
            const { reason, amount } = refundData;

            // Get order details
            const getOrder = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
            const order = getOrder.get(orderId, userId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (!['paid', 'processing', 'shipped'].includes(order.status)) {
                throw new Error('Order cannot be refunded in current status');
            }

            // Get payment details
            const getPayment = db.prepare('SELECT * FROM payments WHERE order_id = ?');
            const payment = getPayment.get(orderId);

            if (!payment) {
                throw new Error('Payment not found');
            }

            // Process refund with Razorpay
            const refundAmount = amount || payment.amount;
            const refundResult = await razorpayService.refundPayment(
                payment.razorpay_payment_id,
                refundAmount
            );

            if (!refundResult.success) {
                throw new Error('Refund processing failed: ' + refundResult.error);
            }

            // Update order and payment status
            await orderController.updateOrderStatus(orderId, 'refunded');

            const updatePayment = db.prepare(
                'UPDATE payments SET status = ?, refund_id = ?, updated_at = ? WHERE id = ?'
            );
            updatePayment.run(
                'refunded',
                refundResult.refund.id,
                new Date().toISOString(),
                payment.id
            );

            // Restore product stock
            if (order.items) {
                const items = JSON.parse(order.items);
                await orderController.updateProductStock(items, 'increase');
            }

            return {
                success: true,
                message: 'Refund processed successfully',
                refundId: refundResult.refund.id,
                amount: refundAmount
            };

        } catch (error) {
            console.error('Process refund error:', error);
            throw error;
        }
    }

    // Get payment statistics
    async getPaymentStats(userId) {
        try {
            const getStats = db.prepare(`
                SELECT 
                    COUNT(*) as total_payments,
                    SUM(amount) as total_amount,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
                    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
                    AVG(amount) as average_amount
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE o.user_id = ?
            `);

            const stats = getStats.get(userId);

            return {
                success: true,
                stats: stats
            };

        } catch (error) {
            console.error('Get payment stats error:', error);
            throw error;
        }
    }

    // Handle payment webhooks
    async handleWebhook(event) {
        try {
            switch (event.event) {
                case 'payment.captured':
                    await this.handlePaymentCaptured(event.payload.payment.entity);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailed(event.payload.payment.entity);
                    break;

                case 'refund.created':
                    await this.handleRefundCreated(event.payload.refund.entity);
                    break;

                default:
                    console.log('Unhandled webhook event:', event.event);
            }

            return { success: true };

        } catch (error) {
            console.error('Handle webhook error:', error);
            throw error;
        }
    }

    // Handle payment captured webhook
    async handlePaymentCaptured(payment) {
        try {
            console.log('Processing payment captured:', payment.id);

            // Find order by Razorpay order ID
            const getOrder = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?');
            const order = getOrder.get(payment.order_id);

            if (!order) {
                console.error('Order not found for payment:', payment.id);
                return;
            }

            // Update payment status
            const updatePayment = db.prepare(`
                UPDATE payments 
                SET status = 'captured', method = ?, fee = ?, tax = ?, updated_at = ?
                WHERE razorpay_payment_id = ?
            `);

            updatePayment.run(
                payment.method,
                payment.fee / 100,
                payment.tax / 100,
                new Date().toISOString(),
                payment.id
            );

            // Update order status
            await orderController.updateOrderStatus(order.id, 'processing');

            // Send notifications
            await orderController.sendOrderNotifications(order, 'payment_confirmed');

            console.log('Payment captured successfully processed for order:', order.id);

        } catch (error) {
            console.error('Handle payment captured error:', error);
        }
    }

    // Handle payment failed webhook
    async handlePaymentFailed(payment) {
        try {
            console.log('Processing payment failed:', payment.id);

            const getOrder = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?');
            const order = getOrder.get(payment.order_id);

            if (order) {
                await orderController.updateOrderStatus(
                    order.id,
                    'payment_failed'
                );
                console.log('Payment failure processed for order:', order.id);
            }

        } catch (error) {
            console.error('Handle payment failed error:', error);
        }
    }

    // Handle refund created webhook
    async handleRefundCreated(refund) {
        try {
            console.log('Processing refund created:', refund.id);

            // Update payment status
            const updatePayment = db.prepare(
                'UPDATE payments SET status = ?, refund_id = ?, updated_at = ? WHERE razorpay_payment_id = ?'
            );
            updatePayment.run(
                'refunded',
                refund.id,
                new Date().toISOString(),
                refund.payment_id
            );

            console.log('Refund processed successfully for payment:', refund.payment_id);

        } catch (error) {
            console.error('Handle refund created error:', error);
        }
    }
}

module.exports = new PaymentController();
