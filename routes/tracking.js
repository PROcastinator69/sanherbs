const express = require('express');
const router = express.Router();
const db = require('../database/database');
const shiprocketService = require('../services/shiprocket');
const emailService = require('../services/emailservice');
const smsService = require('../services/smsservice');

// Track order by ID (public endpoint)
router.get('/order/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get order and delivery details
        const getOrderTracking = db.prepare(`
            SELECT o.id, o.status as order_status, o.customer_name, o.amount,
                   o.created_at, o.updated_at,
                   d.tracking_id, d.courier_name, d.status as delivery_status,
                   d.estimated_delivery, d.current_location
            FROM orders o 
            LEFT JOIN delivery d ON o.id = d.order_id 
            WHERE o.id = ?
        `);

        const tracking = getOrderTracking.get(orderId);

        if (!tracking) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // If we have a tracking ID, get live tracking data
        if (tracking.tracking_id) {
            const liveTracking = await shiprocketService.trackShipment(tracking.tracking_id);
            if (liveTracking.success) {
                tracking.live_tracking = liveTracking.tracking;
            }
        }

        res.json({
            success: true,
            tracking: tracking
        });

    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track order',
            error: error.message
        });
    }
});

// Update delivery status (Webhook endpoint for courier partners)
router.post('/webhook/update', async (req, res) => {
    try {
        const { tracking_id, status, location, estimated_delivery } = req.body;

        // Update delivery record
        const updateDelivery = db.prepare(`
            UPDATE delivery 
            SET status = ?, current_location = ?, estimated_delivery = ?, updated_at = ?
            WHERE tracking_id = ?
        `);

        updateDelivery.run(
            status,
            location,
            estimated_delivery,
            new Date().toISOString(),
            tracking_id
        );

        // Get order details for notifications
        const getOrderDetails = db.prepare(`
            SELECT o.*, d.courier_name 
            FROM orders o 
            JOIN delivery d ON o.id = d.order_id 
            WHERE d.tracking_id = ?
        `);

        const order = getOrderDetails.get(tracking_id);

        if (order) {
            // Update order status based on delivery status
            let orderStatus = order.status;
            if (status === 'delivered') {
                orderStatus = 'delivered';
            } else if (status === 'out_for_delivery') {
                orderStatus = 'shipped';
            }

            // Update order status
            const updateOrder = db.prepare(
                'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
            );
            updateOrder.run(orderStatus, new Date().toISOString(), order.id);

            // Send notifications for important status updates
            if (status === 'delivered') {
                const orderDetails = {
                    orderId: order.id,
                    status: 'Delivered',
                    amount: order.amount
                };

                // Send delivery confirmation
                if (order.customer_email) {
                    emailService.sendDeliveryNotification(order.customer_email, orderDetails);
                }

                if (order.customer_phone) {
                    smsService.sendDeliveryNotification(order.customer_phone, orderDetails);
                }
            }
        }

        res.json({
            success: true,
            message: 'Delivery status updated successfully'
        });

    } catch (error) {
        console.error('Delivery webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update delivery status',
            error: error.message
        });
    }
});

// Get delivery updates for an order
router.get('/delivery/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;

        // Get delivery timeline
        const getDeliveryUpdates = db.prepare(`
            SELECT * FROM delivery 
            WHERE order_id = ? 
            ORDER BY created_at DESC
        `);

        const deliveryInfo = getDeliveryUpdates.get(orderId);

        if (!deliveryInfo) {
            return res.status(404).json({
                success: false,
                message: 'Delivery information not found'
            });
        }

        // Get live tracking if available
        let liveTracking = null;
        if (deliveryInfo.tracking_id) {
            const trackingResult = await shiprocketService.trackShipment(deliveryInfo.tracking_id);
            if (trackingResult.success) {
                liveTracking = trackingResult.tracking;
            }
        }

        res.json({
            success: true,
            delivery: deliveryInfo,
            live_tracking: liveTracking
        });

    } catch (error) {
        console.error('Get delivery updates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery updates',
            error: error.message
        });
    }
});

// Check delivery serviceability
router.post('/check-serviceability', async (req, res) => {
    try {
        const { pickup_pincode, delivery_pincode, weight = 0.5 } = req.body;

        if (!pickup_pincode || !delivery_pincode) {
            return res.status(400).json({
                success: false,
                message: 'Pickup and delivery pincodes are required'
            });
        }

        const serviceability = await shiprocketService.getShippingRates(
            pickup_pincode,
            delivery_pincode,
            weight,
            0 // COD value
        );

        if (!serviceability.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to check serviceability',
                error: serviceability.error
            });
        }

        res.json({
            success: true,
            serviceability: serviceability.rates
        });

    } catch (error) {
        console.error('Check serviceability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check serviceability',
            error: error.message
        });
    }
});

// Manual tracking update (for testing)
router.post('/manual-update', async (req, res) => {
    try {
        const { orderId, status, location, notes } = req.body;

        // Update delivery record
        const updateDelivery = db.prepare(`
            UPDATE delivery 
            SET status = ?, current_location = ?, notes = ?, updated_at = ?
            WHERE order_id = ?
        `);

        updateDelivery.run(
            status,
            location,
            notes,
            new Date().toISOString(),
            orderId
        );

        // Update order status if delivered
        if (status === 'delivered') {
            const updateOrder = db.prepare(
                'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
            );
            updateOrder.run('delivered', new Date().toISOString(), orderId);
        }

        res.json({
            success: true,
            message: 'Tracking updated successfully'
        });

    } catch (error) {
        console.error('Manual tracking update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tracking',
            error: error.message
        });
    }
});

module.exports = router;

