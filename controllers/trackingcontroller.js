const db = require('../database/database');
const shiprocketService = require('../services/shiprocket');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

class TrackingController {
    // Track order by ID (public endpoint)
    async trackOrder(req, res) {
        try {
            const { orderId } = req.params;

            // Get order and delivery details
            const stmt = db.prepare(`
                SELECT 
                    o.id, 
                    o.order_number,
                    o.status as order_status, 
                    o.customer_name, 
                    o.customer_phone,
                    o.customer_email,
                    o.amount,
                    o.created_at, 
                    o.updated_at,
                    o.delivery_address,
                    d.id as delivery_id,
                    d.tracking_id, 
                    d.courier_name, 
                    d.status as delivery_status,
                    d.estimated_delivery, 
                    d.current_location,
                    d.shiprocket_order_id,
                    d.created_at as shipped_at,
                    d.updated_at as last_updated
                FROM orders o 
                LEFT JOIN delivery d ON o.id = d.order_id 
                WHERE o.id = ? OR o.order_number = ?
            `);

            const tracking = await stmt.get(orderId, orderId);

            if (!tracking) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Parse delivery address
            let deliveryAddress = {};
            if (tracking.delivery_address) {
                try {
                    deliveryAddress = JSON.parse(tracking.delivery_address);
                } catch (e) {
                    deliveryAddress = { address: tracking.delivery_address };
                }
            }

            // Get live tracking data if available
            let liveTracking = null;
            if (tracking.tracking_id) {
                try {
                    const liveTrackingResult = await shiprocketService.trackShipment(tracking.tracking_id);
                    if (liveTrackingResult.success) {
                        liveTracking = liveTrackingResult.tracking;
                    }
                } catch (error) {
                    console.error('Live tracking error:', error);
                }
            }

            // Get tracking timeline
            const timeline = this.generateTrackingTimeline(tracking, liveTracking);

            res.json({
                success: true,
                tracking: {
                    order_id: tracking.id,
                    order_number: tracking.order_number,
                    order_status: tracking.order_status,
                    delivery_status: tracking.delivery_status,
                    customer_name: tracking.customer_name,
                    amount: tracking.amount,
                    tracking_id: tracking.tracking_id,
                    courier_name: tracking.courier_name,
                    current_location: tracking.current_location,
                    estimated_delivery: tracking.estimated_delivery,
                    delivery_address: deliveryAddress,
                    created_at: tracking.created_at,
                    shipped_at: tracking.shipped_at,
                    last_updated: tracking.last_updated,
                    timeline: timeline,
                    live_tracking: liveTracking
                }
            });

        } catch (error) {
            console.error('Track order error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track order',
                error: error.message
            });
        }
    }

    // Update delivery status (Webhook endpoint for courier partners)
    async updateDeliveryStatus(req, res) {
        try {
            const { 
                tracking_id, 
                order_id,
                status, 
                location, 
                estimated_delivery,
                courier_name,
                remarks 
            } = req.body;

            if (!tracking_id && !order_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Either tracking_id or order_id is required'
                });
            }

            // Update delivery record
            let updateStmt;
            let params;

            if (tracking_id) {
                updateStmt = db.prepare(`
                    UPDATE delivery 
                    SET status = ?, current_location = ?, estimated_delivery = ?, 
                        courier_name = ?, remarks = ?, updated_at = ?
                    WHERE tracking_id = ?
                `);
                params = [status, location, estimated_delivery, courier_name, remarks, new Date().toISOString(), tracking_id];
            } else {
                updateStmt = db.prepare(`
                    UPDATE delivery 
                    SET status = ?, current_location = ?, estimated_delivery = ?, 
                        courier_name = ?, remarks = ?, updated_at = ?
                    WHERE order_id = ?
                `);
                params = [status, location, estimated_delivery, courier_name, remarks, new Date().toISOString(), order_id];
            }

            const result = await updateStmt.run(...params);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Delivery record not found'
                });
            }

            // Get order details for notifications
            const orderStmt = db.prepare(`
                SELECT o.*, d.courier_name, d.tracking_id
                FROM orders o 
                JOIN delivery d ON o.id = d.order_id 
                WHERE ${tracking_id ? 'd.tracking_id = ?' : 'd.order_id = ?'}
            `);

            const order = await orderStmt.get(tracking_id || order_id);

            if (order) {
                // Update order status based on delivery status
                let orderStatus = order.status;
                if (status === 'delivered') {
                    orderStatus = 'delivered';
                } else if (status === 'out_for_delivery') {
                    orderStatus = 'shipped';
                } else if (status === 'in_transit' && order.status === 'processing') {
                    orderStatus = 'shipped';
                }

                // Update order status if changed
                if (orderStatus !== order.status) {
                    const updateOrderStmt = db.prepare(
                        'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
                    );
                    await updateOrderStmt.run(orderStatus, new Date().toISOString(), order.id);
                }

                // Send notifications for important status updates
                await this.sendTrackingNotifications(order, status, location);
            }

            res.json({
                success: true,
                message: 'Delivery status updated successfully'
            });

        } catch (error) {
            console.error('Update delivery status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update delivery status',
                error: error.message
            });
        }
    }

    // Get delivery updates for an order
    async getDeliveryUpdates(req, res) {
        try {
            const { orderId } = req.params;

            // Get delivery information
            const stmt = db.prepare(`
                SELECT d.*, o.customer_name, o.customer_phone, o.customer_email, o.delivery_address
                FROM delivery d
                JOIN orders o ON d.order_id = o.id
                WHERE d.order_id = ?
                ORDER BY d.created_at DESC
            `);

            const deliveryInfo = await stmt.get(orderId);

            if (!deliveryInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'Delivery information not found'
                });
            }

            // Get live tracking if available
            let liveTracking = null;
            if (deliveryInfo.tracking_id) {
                try {
                    const trackingResult = await shiprocketService.trackShipment(deliveryInfo.tracking_id);
                    if (trackingResult.success) {
                        liveTracking = trackingResult.tracking;
                    }
                } catch (error) {
                    console.error('Live tracking fetch error:', error);
                }
            }

            res.json({
                success: true,
                delivery: {
                    ...deliveryInfo,
                    delivery_address: deliveryInfo.delivery_address ? 
                        JSON.parse(deliveryInfo.delivery_address) : null
                },
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
    }

    // Check delivery serviceability
    async checkServiceability(req, res) {
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
                serviceability: serviceability.rates,
                pickup_pincode: pickup_pincode,
                delivery_pincode: delivery_pincode,
                weight: weight
            });

        } catch (error) {
            console.error('Check serviceability error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check serviceability',
                error: error.message
            });
        }
    }

    // Manual tracking update (for admin/testing)
    async manualUpdate(req, res) {
        try {
            const { orderId, status, location, notes, courier_name } = req.body;

            if (!orderId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID and status are required'
                });
            }

            // Update delivery record
            const updateStmt = db.prepare(`
                UPDATE delivery 
                SET status = ?, current_location = ?, remarks = ?, courier_name = ?, updated_at = ?
                WHERE order_id = ?
            `);

            const result = await updateStmt.run(
                status,
                location,
                notes,
                courier_name,
                new Date().toISOString(),
                orderId
            );

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Delivery record not found'
                });
            }

            // Update order status if delivered
            if (status === 'delivered') {
                const updateOrderStmt = db.prepare(
                    'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?'
                );
                await updateOrderStmt.run('delivered', new Date().toISOString(), orderId);
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
    }

    // Get tracking statistics
    async getTrackingStats(req, res) {
        try {
            const { timeframe = '7d' } = req.query;
            
            let dateFilter = '';
            switch (timeframe) {
                case '24h':
                    dateFilter = "AND d.created_at >= datetime('now', '-1 day')";
                    break;
                case '7d':
                    dateFilter = "AND d.created_at >= datetime('now', '-7 days')";
                    break;
                case '30d':
                    dateFilter = "AND d.created_at >= datetime('now', '-30 days')";
                    break;
            }

            const stmt = db.prepare(`
                SELECT 
                    COUNT(*) as total_shipments,
                    COUNT(CASE WHEN d.status = 'delivered' THEN 1 END) as delivered,
                    COUNT(CASE WHEN d.status = 'in_transit' THEN 1 END) as in_transit,
                    COUNT(CASE WHEN d.status = 'shipped' THEN 1 END) as shipped,
                    COUNT(CASE WHEN d.status = 'out_for_delivery' THEN 1 END) as out_for_delivery,
                    AVG(CASE 
                        WHEN d.status = 'delivered' 
                        THEN julianday(d.updated_at) - julianday(d.created_at)
                        ELSE NULL 
                    END) as avg_delivery_days
                FROM delivery d
                WHERE 1=1 ${dateFilter}
            `);

            const stats = await stmt.get();

            res.json({
                success: true,
                stats: {
                    ...stats,
                    timeframe: timeframe,
                    delivery_rate: stats.total_shipments > 0 ? 
                        ((stats.delivered / stats.total_shipments) * 100).toFixed(2) : 0
                }
            });

        } catch (error) {
            console.error('Get tracking stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch tracking statistics',
                error: error.message
            });
        }
    }

    // Helper methods
    generateTrackingTimeline(tracking, liveTracking = null) {
        const timeline = [];

        // Order created
        timeline.push({
            status: 'created',
            title: 'Order Placed',
            description: 'Your order has been received',
            timestamp: tracking.created_at,
            completed: true,
            icon: '📝'
        });

        // Payment confirmed
        if (['paid', 'processing', 'shipped', 'delivered'].includes(tracking.order_status)) {
            timeline.push({
                status: 'paid',
                title: 'Payment Confirmed',
                description: 'Payment has been processed',
                timestamp: tracking.created_at,
                completed: true,
                icon: '💳'
            });
        }

        // Processing
        if (['processing', 'shipped', 'delivered'].includes(tracking.order_status)) {
            timeline.push({
                status: 'processing',
                title: 'Order Processing',
                description: 'Your order is being prepared',
                timestamp: tracking.created_at,
                completed: true,
                icon: '📦'
            });
        }

        // Shipped
        if (tracking.shipped_at) {
            timeline.push({
                status: 'shipped',
                title: 'Order Shipped',
                description: `Shipped via ${tracking.courier_name || 'courier partner'}`,
                timestamp: tracking.shipped_at,
                completed: true,
                icon: '🚚',
                tracking_id: tracking.tracking_id
            });
        }

        // In transit
        if (['in_transit', 'out_for_delivery', 'delivered'].includes(tracking.delivery_status)) {
            timeline.push({
                status: 'in_transit',
                title: 'In Transit',
                description: tracking.current_location || 'Package is on the way',
                timestamp: tracking.last_updated,
                completed: tracking.delivery_status !== 'in_transit',
                icon: '🛣️'
            });
        }

        // Out for delivery
        if (['out_for_delivery', 'delivered'].includes(tracking.delivery_status)) {
            timeline.push({
                status: 'out_for_delivery',
                title: 'Out for Delivery',
                description: 'Package is out for delivery',
                timestamp: tracking.last_updated,
                completed: tracking.delivery_status === 'delivered',
                icon: '🚛'
            });
        }

        // Delivered
        if (tracking.delivery_status === 'delivered') {
            timeline.push({
                status: 'delivered',
                title: 'Delivered',
                description: 'Package has been delivered',
                timestamp: tracking.last_updated,
                completed: true,
                icon: '✅'
            });
        }

        return timeline;
    }

    async sendTrackingNotifications(order, status, location) {
        try {
            const orderDetails = {
                orderId: order.id,
                orderNumber: order.order_number,
                trackingId: order.tracking_id,
                status: this.getStatusDisplayName(status),
                location: location,
                courierName: order.courier_name
            };

            // Send notifications for important status updates
            const notificationStatuses = ['shipped', 'out_for_delivery', 'delivered'];
            
            if (notificationStatuses.includes(status)) {
                if (order.customer_email) {
                    await emailService.sendOrderStatusUpdate(order.customer_email, orderDetails);
                }

                if (order.customer_phone) {
                    await smsService.sendOrderStatusUpdate(order.customer_phone, orderDetails);
                }
            }

        } catch (error) {
            console.error('Send tracking notifications error:', error);
        }
    }

    getStatusDisplayName(status) {
        const statusMap = {
            'created': 'Order Created',
            'processing': 'Processing',
            'shipped': 'Shipped',
            'in_transit': 'In Transit',
            'out_for_delivery': 'Out for Delivery',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'returned': 'Returned'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }
}

module.exports = new TrackingController();
