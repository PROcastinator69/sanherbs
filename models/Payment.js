const db = require('../database/database');

class Payment {
    constructor(data = {}) {
        this.id = data.id || null;
        this.order_id = data.order_id || null;
        this.razorpay_payment_id = data.razorpay_payment_id || null;
        this.amount = data.amount || 0;
        this.currency = data.currency || 'INR';
        this.method = data.method || 'unknown';
        this.status = data.status || 'pending';
        this.fee = data.fee || 0;
        this.tax = data.tax || 0;
        this.refund_id = data.refund_id || null;
        this.created_at = data.created_at || new Date().toISOString();
        this.updated_at = data.updated_at || new Date().toISOString();
    }

    // Create new payment
    async save() {
        try {
            if (this.id) {
                // Update existing payment
                const stmt = db.prepare(`
                    UPDATE payments SET 
                        status = ?, fee = ?, tax = ?, refund_id = ?, updated_at = ?
                    WHERE id = ?
                `);

                await stmt.run(
                    this.status, this.fee, this.tax, this.refund_id,
                    new Date().toISOString(), this.id
                );
            } else {
                // Create new payment
                this.id = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                
                const stmt = db.prepare(`
                    INSERT INTO payments (
                        id, order_id, razorpay_payment_id, amount, currency,
                        method, status, fee, tax, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                await stmt.run(
                    this.id, this.order_id, this.razorpay_payment_id,
                    this.amount, this.currency, this.method, this.status,
                    this.fee, this.tax, this.created_at, this.updated_at
                );
            }

            return this;
        } catch (error) {
            console.error('Payment save error:', error);
            throw error;
        }
    }

    // Find payment by ID
    static async findById(id) {
        try {
            const stmt = db.prepare('SELECT * FROM payments WHERE id = ?');
            const row = await stmt.get(id);
            
            return row ? new Payment(row) : null;
        } catch (error) {
            console.error('Find payment by ID error:', error);
            throw error;
        }
    }

    // Find payment by order ID
    static async findByOrderId(orderId) {
        try {
            const stmt = db.prepare('SELECT * FROM payments WHERE order_id = ?');
            const row = await stmt.get(orderId);
            
            return row ? new Payment(row) : null;
        } catch (error) {
            console.error('Find payment by order ID error:', error);
            throw error;
        }
    }

    // Find payment by Razorpay payment ID
    static async findByRazorpayPaymentId(razorpayPaymentId) {
        try {
            const stmt = db.prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?');
            const row = await stmt.get(razorpayPaymentId);
            
            return row ? new Payment(row) : null;
        } catch (error) {
            console.error('Find payment by Razorpay payment ID error:', error);
            throw error;
        }
    }

    // Get payment history for user
    static async getHistoryByUserId(userId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;
            
            const stmt = db.prepare(`
                SELECT p.*, o.customer_name, o.items, o.amount as order_amount
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE o.user_id = ?
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `);
            
            const rows = await stmt.all(userId, limit, offset);
            return rows.map(row => new Payment(row));
        } catch (error) {
            console.error('Get payment history error:', error);
            throw error;
        }
    }

    // Get payment statistics
    static async getStats(userId) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    COUNT(*) as total_payments,
                    SUM(amount) as total_amount,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
                    COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_payments,
                    AVG(amount) as average_payment
                FROM payments p
                JOIN orders o ON p.order_id = o.id
                WHERE o.user_id = ?
            `);
            
            return await stmt.get(userId);
        } catch (error) {
            console.error('Get payment stats error:', error);
            throw error;
        }
    }

    // Update payment status
    async updateStatus(newStatus, additionalData = {}) {
        try {
            this.status = newStatus;
            this.updated_at = new Date().toISOString();
            
            if (additionalData.fee !== undefined) this.fee = additionalData.fee;
            if (additionalData.tax !== undefined) this.tax = additionalData.tax;
            if (additionalData.refund_id !== undefined) this.refund_id = additionalData.refund_id;

            await this.save();
            return this;
        } catch (error) {
            console.error('Update payment status error:', error);
            throw error;
        }
    }

    // Mark as refunded
    async markAsRefunded(refundId) {
        try {
            this.status = 'refunded';
            this.refund_id = refundId;
            this.updated_at = new Date().toISOString();

            await this.save();
            return this;
        } catch (error) {
            console.error('Mark as refunded error:', error);
            throw error;
        }
    }

    // Get payment method display name
    getMethodDisplayName() {
        const methodMap = {
            'card': 'Credit/Debit Card',
            'netbanking': 'Net Banking',
            'wallet': 'Digital Wallet',
            'upi': 'UPI',
            'emi': 'EMI',
            'unknown': 'Unknown'
        };
        return methodMap[this.method] || this.method.charAt(0).toUpperCase() + this.method.slice(1);
    }

    // Get status display name
    getStatusDisplayName() {
        const statusMap = {
            'pending': 'Pending',
            'completed': 'Completed',
            'captured': 'Captured',
            'failed': 'Failed',
            'refunded': 'Refunded',
            'cancelled': 'Cancelled'
        };
        return statusMap[this.status] || this.status.charAt(0).toUpperCase() + this.status.slice(1);
    }

    // Check if payment can be refunded
    canBeRefunded() {
        return ['completed', 'captured'].includes(this.status);
    }

    // Get net amount (after fees and tax)
    getNetAmount() {
        return this.amount - this.fee - this.tax;
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            order_id: this.order_id,
            razorpay_payment_id: this.razorpay_payment_id,
            amount: this.amount,
            net_amount: this.getNetAmount(),
            currency: this.currency,
            method: this.method,
            method_display: this.getMethodDisplayName(),
            status: this.status,
            status_display: this.getStatusDisplayName(),
            fee: this.fee,
            tax: this.tax,
            refund_id: this.refund_id,
            can_be_refunded: this.canBeRefunded(),
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Payment;
