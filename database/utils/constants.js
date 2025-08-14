// Database constants for GreenTap Health
const DATABASE_CONSTANTS = {
    // Table names
    TABLES: {
        USERS: 'users',
        PRODUCTS: 'products',
        ORDERS: 'orders',
        ORDER_ITEMS: 'order_items',
        PAYMENTS: 'payments',
        PAYMENT_LOGS: 'payment_logs',
        DELIVERY: 'delivery',
        TRACKING_UPDATES: 'tracking_updates',
        SHIPPING_RATES: 'shipping_rates',
        CATEGORIES: 'categories'
    },

    // User roles
    USER_ROLES: {
        USER: 'user',
        ADMIN: 'admin'
    },

    // Order statuses
    ORDER_STATUS: {
        CREATED: 'created',
        PAYMENT_PENDING: 'payment_pending',
        PAID: 'paid',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    },

    // Payment methods
    PAYMENT_METHODS: {
        COD: 'cod',
        RAZORPAY: 'razorpay',
        CARD: 'card',
        UPI: 'upi',
        NETBANKING: 'netbanking',
        WALLET: 'wallet'
    },

    // Payment statuses
    PAYMENT_STATUS: {
        PENDING: 'pending',
        COMPLETED: 'completed',
        CAPTURED: 'captured',
        FAILED: 'failed',
        REFUNDED: 'refunded',
        CANCELLED: 'cancelled'
    },

    // Delivery statuses
    DELIVERY_STATUS: {
        CREATED: 'created',
        SHIPPED: 'shipped',
        IN_TRANSIT: 'in_transit',
        OUT_FOR_DELIVERY: 'out_for_delivery',
        DELIVERED: 'delivered',
        RETURNED: 'returned',
        CANCELLED: 'cancelled',
        LOST: 'lost'
    },

    // Product categories
    PRODUCT_CATEGORIES: {
        VITAMINS: 'vitamins',
        MINERALS: 'minerals',
        PROTEINS: 'proteins',
        HERBAL: 'herbal',
        IMMUNITY: 'immunity',
        WEIGHT_MANAGEMENT: 'weight-management',
        FITNESS: 'fitness',
        WELLNESS: 'wellness',
        DIGESTIVE_HEALTH: 'digestive-health',
        HEART_HEALTH: 'heart-health'
    },

    // Pagination defaults
    PAGINATION: {
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
        DEFAULT_OFFSET: 0
    },

    // Validation constants
    VALIDATION: {
        MOBILE_REGEX: /^[6-9]\d{9}$/,
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PINCODE_REGEX: /^[1-9][0-9]{5}$/,
        PASSWORD_MIN_LENGTH: 4,
        NAME_MIN_LENGTH: 2,
        ORDER_ID_PREFIX: 'ORDER_',
        PAYMENT_ID_PREFIX: 'PAY_',
        USER_ID_PREFIX: 'USER_',
        PRODUCT_ID_PREFIX: 'PROD_',
        DELIVERY_ID_PREFIX: 'DEL_'
    },

    // Price limits
    PRICING: {
        MIN_ORDER_AMOUNT: 100,
        FREE_SHIPPING_THRESHOLD: 500,
        SHIPPING_CHARGE: 50,
        COD_CHARGE_THRESHOLD: 500,
        COD_CHARGE: 20
    },

    // Stock constants
    STOCK: {
        LOW_STOCK_THRESHOLD: 10,
        OUT_OF_STOCK: 0,
        DEFAULT_STOCK_QUANTITY: 100
    },

    // Time constants (in milliseconds)
    TIME: {
        TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
        OTP_EXPIRY: 10 * 60 * 1000, // 10 minutes
        CACHE_TTL: 5 * 60 * 1000, // 5 minutes
        RATE_LIMIT_WINDOW: 15 * 60 * 1000 // 15 minutes
    },

    // Error messages
    ERROR_MESSAGES: {
        INVALID_CREDENTIALS: 'Invalid mobile number or password',
        USER_NOT_FOUND: 'User not found',
        PRODUCT_NOT_FOUND: 'Product not found',
        ORDER_NOT_FOUND: 'Order not found',
        INSUFFICIENT_STOCK: 'Insufficient stock available',
        INVALID_MOBILE: 'Invalid mobile number format',
        INVALID_EMAIL: 'Invalid email address format',
        INVALID_PINCODE: 'Invalid pincode format',
        PASSWORD_TOO_SHORT: 'Password must be at least 4 characters long',
        REQUIRED_FIELD_MISSING: 'Required field is missing',
        DUPLICATE_MOBILE: 'Mobile number already registered',
        DUPLICATE_EMAIL: 'Email address already registered',
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Access forbidden',
        INTERNAL_ERROR: 'Internal server error'
    },

    // Success messages
    SUCCESS_MESSAGES: {
        USER_CREATED: 'User registered successfully',
        LOGIN_SUCCESS: 'Login successful',
        ORDER_CREATED: 'Order placed successfully',
        PAYMENT_SUCCESS: 'Payment completed successfully',
        ORDER_UPDATED: 'Order updated successfully',
        PROFILE_UPDATED: 'Profile updated successfully'
    }
};

module.exports = DATABASE_CONSTANTS;
