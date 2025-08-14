const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const CONSTANTS = require('./constants');

class DatabaseHelpers {
    // Generate unique ID with prefix
    static generateId(prefix = '') {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        return `${prefix}${timestamp}_${randomString}`.toUpperCase();
    }

    // Generate order number
    static generateOrderNumber() {
        return `GT${Date.now().toString().slice(-6)}`;
    }

    // Hash password
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    // Compare password
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // Validate mobile number
    static isValidMobile(mobile) {
        return CONSTANTS.VALIDATION.MOBILE_REGEX.test(mobile);
    }

    // Validate email
    static isValidEmail(email) {
        return CONSTANTS.VALIDATION.EMAIL_REGEX.test(email);
    }

    // Validate pincode
    static isValidPincode(pincode) {
        return CONSTANTS.VALIDATION.PINCODE_REGEX.test(pincode);
    }

    // Format currency
    static formatCurrency(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Format date
    static formatDate(date, locale = 'en-IN') {
        return new Date(date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Calculate shipping cost
    static calculateShipping(orderAmount) {
        if (orderAmount >= CONSTANTS.PRICING.FREE_SHIPPING_THRESHOLD) {
            return 0;
        }
        return CONSTANTS.PRICING.SHIPPING_CHARGE;
    }

    // Calculate COD charges
    static calculateCODCharges(orderAmount, paymentMethod) {
        if (paymentMethod === 'cod' && orderAmount < CONSTANTS.PRICING.COD_CHARGE_THRESHOLD) {
            return CONSTANTS.PRICING.COD_CHARGE;
        }
        return 0;
    }

    // Sanitize input
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    // Parse JSON safely
    static parseJSON(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON parse error:', error);
            return defaultValue;
        }
    }

    // Generate OTP
    static generateOTP(length = 6) {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Check if stock is low
    static isLowStock(quantity) {
        return quantity <= CONSTANTS.STOCK.LOW_STOCK_THRESHOLD && quantity > 0;
    }

    // Check if out of stock
    static isOutOfStock(quantity) {
        return quantity <= CONSTANTS.STOCK.OUT_OF_STOCK;
    }

    // Get stock status
    static getStockStatus(quantity) {
        if (this.isOutOfStock(quantity)) {
            return 'out_of_stock';
        } else if (this.isLowStock(quantity)) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    // Calculate order total
    static calculateOrderTotal(items, shippingCost = 0, codCharges = 0) {
        const subtotal = items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        return {
            subtotal: subtotal,
            shipping: shippingCost,
            cod_charges: codCharges,
            total: subtotal + shippingCost + codCharges
        };
    }

    // Get pagination info
    static getPaginationInfo(total, limit, offset) {
        const totalPages = Math.ceil(total / limit);
        const currentPage = Math.floor(offset / limit) + 1;
        const hasNextPage = currentPage < totalPages;
        const hasPrevPage = currentPage > 1;

        return {
            total: total,
            limit: limit,
            offset: offset,
            totalPages: totalPages,
            currentPage: currentPage,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
        };
    }

    // Create SQL WHERE clause from filters
    static buildWhereClause(filters, params = []) {
        let whereClause = '';
        const conditions = [];

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => '?').join(',');
                    conditions.push(`${key} IN (${placeholders})`);
                    params.push(...value);
                } else if (typeof value === 'string' && value.includes('%')) {
                    conditions.push(`${key} LIKE ?`);
                    params.push(value);
                } else {
                    conditions.push(`${key} = ?`);
                    params.push(value);
                }
            }
        });

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        return { whereClause, params };
    }

    // Validate required fields
    static validateRequiredFields(data, requiredFields) {
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                missingFields.push(field);
            }
        });

        return {
            isValid: missingFields.length === 0,
            missingFields: missingFields
        };
    }

    // Create database transaction wrapper
    static async executeTransaction(db, operations) {
        await db.run('BEGIN TRANSACTION');
        try {
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            await db.run('COMMIT');
            return results;
        } catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    }

    // Escape SQL identifiers
    static escapeIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    // Generate random string
    static generateRandomString(length = 10) {
        return crypto.randomBytes(length).toString('hex').substring(0, length);
    }

    // Create audit log entry
    static createAuditLog(action, entityType, entityId, userId = null, changes = null) {
        return {
            id: this.generateId('AUDIT_'),
            action: action,
            entity_type: entityType,
            entity_id: entityId,
            user_id: userId,
            changes: changes ? JSON.stringify(changes) : null,
            timestamp: new Date().toISOString(),
            ip_address: null, // Set from request
            user_agent: null  // Set from request
        };
    }
}

module.exports = DatabaseHelpers;
