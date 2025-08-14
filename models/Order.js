const db = require('../database/database');

class Order {
    constructor(data = {}) {
        this.id = data.id || null;
        this.user_id = data.user_id || null;
        this.order_number = data.order_number || null;
        this.razorpay_order_id = data.razorpay_order_id || null;
        this.amount = data.amount || 0;
        this.status = data.status || 'created';
        this.payment_method = data.payment_method || 'cod';
        this.payment_id = data.payment_id || null;
        this.items = data.items || '[]';
        this.customer_name = data.customer_name || null;
        this.customer_email = data.customer_email || null;
        this.customer_phone = data.customer_phone || null;
        this.delivery_address = data.delivery_address || '{}';
        this.notes = data.notes || '';
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();
    }

    // Create new order
    async save() {
        try {
            if (this.id) {
                // Update existing order
                const stmt = db.prepare(`
                    UPDATE orders SET 
                        status = ?, payment_method = ?, payment_id = ?, 
                        customer_name = ?, customer_email = ?, customer_phone = ?,
                        delivery_address = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                `);

                await stmt.run(
                    this.status, this.payment_method, this.payment_id,
                    this.customer_name, this.customer_email, this.customer_phone,
                    this.delivery_address, this.notes, new Date().toISOString(),
                    this.id
                );
            } else {
                // Create new order
                this.id = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                
                const stmt = db.prepare(`
                    INSERT INTO orders (
                        id, user_id, order_number, razorpay_order_id, amount, 
                        status, payment_method, items, customer_name, 
                        customer_email, customer_phone, delivery_address, 
                        notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                await stmt.run(
                    this.id, this.user_id, this.order_number, this.razorpay_order_id,
                    this.amount, this.status, this.payment_method, this.items,
                    this.customer_name, this.customer_email, this.customer_phone,
                    this.delivery_address, this.notes, this.created_at, this.updated_at
                );
            }

            return this;
        } catch (error) {
            console.error('Order save error:', error);
            throw error;
        }
    }

    // Find order by ID
    static async findById(id) {
        try {
            const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
            const row = await stmt.get(id);
            
            return row ? new Order(row) : null;
        } catch (error) {
            console.error('Find order by ID error:', error);
            throw error;
        }
    }

    // Find orders by user ID
    static async findByUserId(userId, options = {}) {
        try {
            const { limit = 20, offset = 0, status } = options;
            let sql = 'SELECT * FROM orders WHERE user_id = ?';
            let params = [userId];

            if (status) {
                sql += ' AND status = ?';
                params.push(status);
            }

            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = db.prepare(sql);
            const rows = await stmt.all(...params);
            
            return rows.map(row => new Order(row));
        } catch (error) {
            console.error('Find orders by user ID error:', error);
            throw error;
        }
    }

    // Find order by Razorpay order ID
    static async findByRazorpayOrderId(razorpayOrderId) {
        try {
            const stmt = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?');
            const row = await stmt.get(razorpayOrderId);
            
            return row ? new Order(row) : null;
        } catch (error) {
            console.error('Find order by Razorpay ID error:', error);
            throw error;
        }
    }

    // Get order with payment details
    async getWithPayment() {
        try {
            const stmt = db.prepare(`
                SELECT o.*, p.method as payment_method_detail, p.status as payment_status,
                       p.razorpay_payment_id, p.amount as payment_amount
                FROM orders o
                LEFT JOIN payments p ON o.payment_id = p.id
                WHERE o.id = ?
            `);
            
            const row = await stmt.get(this.id);
            return row;
        } catch (error) {
            console.error('Get order with payment error:', error);
            throw error;
        }
    }

    // Get order with delivery details
    async getWithDelivery() {
        try {
            const stmt = db.prepare(`
                SELECT o.*, d.tracking_id, d.courier_name, d.status as delivery_status,
                       d.current_location, d.estimated_delivery
                FROM orders o
                LEFT JOIN delivery d ON o.id = d.order_id
                WHERE o.id = ?
            `);
            
            const row = await stmt.get(this.id);
            return row;
        } catch (error) {
            console.error('Get order with delivery error:', error);
            throw error;
        }
    }

    // Get order statistics
    static async getStats(userId) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
                    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_order_value
                FROM orders 
                WHERE user_id = ?
            `);
            
            return await stmt.get(userId);
        } catch (error) {
            console.error('Get order stats error:', error);
            throw error;
        }
    }

    // Update order status
    async updateStatus(newStatus, notes = null) {
        try {
            this.status = newStatus;
            this.updated_at = new Date().toISOString();
            
            if (notes) {
                this.notes = notes;
            }

            const stmt = db.prepare(
                'UPDATE orders SET status = ?, notes = ?, updated_at = ? WHERE id = ?'
            );
            
            await stmt.run(this.status, this.notes, this.updated_at, this.id);
            return this;
        } catch (error) {
            console.error('Update order status error:', error);
            throw error;
        }
    }

    // Cancel order
    async cancel(reason) {
        try {
            if (['delivered', 'shipped', 'cancelled'].includes(this.status)) {
                throw new Error('Order cannot be cancelled in current status');
            }

            this.status = 'cancelled';
            this.notes = `Cancelled: ${reason}`;
            this.updated_at = new Date().toISOString();

            await this.save();
            return this;
        } catch (error) {
            console.error('Cancel order error:', error);
            throw error;
        }
    }

    // Get parsed items
    getParsedItems() {
        try {
            return typeof this.items === 'string' ? JSON.parse(this.items) : this.items;
        } catch (error) {
            console.error('Parse items error:', error);
            return [];
        }
    }

    // Get parsed delivery address
    getParsedDeliveryAddress() {
        try {
            return typeof this.delivery_address === 'string' ? 
                JSON.parse(this.delivery_address) : this.delivery_address;
        } catch (error) {
            console.error('Parse delivery address error:', error);
            return {};
        }
    }

    // Get status display name
    getStatusDisplayName() {
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
        return statusMap[this.status] || this.status.charAt(0).toUpperCase() + this.status.slice(1);
    }

    // Check if order can be cancelled
    canBeCancelled() {
        return !['delivered', 'shipped', 'cancelled', 'refunded'].includes(this.status);
    }

    // Check if order can be refunded
    canBeRefunded() {
        return ['paid', 'processing', 'shipped'].includes(this.status) && 
               this.payment_method === 'razorpay';
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            user_id: this.user_id,
            order_number: this.order_number,
            razorpay_order_id: this.razorpay_order_id,
            amount: this.amount,
            status: this.status,
            status_display: this.getStatusDisplayName(),
            payment_method: this.payment_method,
            payment_id: this.payment_id,
            items: this.getParsedItems(),
            customer_name: this.customer_name,
            customer_email: this.customer_email,
            customer_phone: this.customer_phone,
            delivery_address: this.getParsedDeliveryAddress(),
            notes: this.notes,
            can_be_cancelled: this.canBeCancelled(),
            can_be_refunded: this.canBeRefunded(),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Order;
