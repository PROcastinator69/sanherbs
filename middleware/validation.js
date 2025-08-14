const { body, query, param, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Order validation rules
const validateCreateOrder = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    
    body('items.*.productId')
        .isString()
        .notEmpty()
        .withMessage('Product ID is required'),
    
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    
    body('deliveryAddress')
        .isObject()
        .withMessage('Delivery address is required'),
    
    body('deliveryAddress.address')
        .isString()
        .isLength({ min: 10 })
        .withMessage('Full address is required (minimum 10 characters)'),
    
    body('deliveryAddress.city')
        .isString()
        .isLength({ min: 2 })
        .withMessage('City is required'),
    
    body('deliveryAddress.state')
        .isString()
        .isLength({ min: 2 })
        .withMessage('State is required'),
    
    body('deliveryAddress.pincode')
        .isString()
        .matches(/^[1-9][0-9]{5}$/)
        .withMessage('Valid 6-digit pincode is required'),
    
    body('contactNumber')
        .isMobilePhone('en-IN')
        .withMessage('Valid Indian mobile number is required'),
    
    body('paymentMethod')
        .optional()
        .isIn(['cod', 'razorpay'])
        .withMessage('Payment method must be cod or razorpay'),
    
    body('customerDetails')
        .optional()
        .isObject(),
    
    body('customerDetails.name')
        .optional()
        .isString()
        .isLength({ min: 2 })
        .withMessage('Customer name must be at least 2 characters'),
    
    body('customerDetails.email')
        .optional()
        .isEmail()
        .withMessage('Valid email is required'),
    
    handleValidationErrors
];

// Payment validation rules
const validatePaymentVerification = [
    body('razorpay_order_id')
        .isString()
        .notEmpty()
        .withMessage('Razorpay order ID is required'),
    
    body('razorpay_payment_id')
        .isString()
        .notEmpty()
        .withMessage('Razorpay payment ID is required'),
    
    body('razorpay_signature')
        .isString()
        .notEmpty()
        .withMessage('Razorpay signature is required'),
    
    body('orderId')
        .isString()
        .notEmpty()
        .withMessage('Order ID is required'),
    
    handleValidationErrors
];

// User registration validation
const validateUserRegistration = [
    body('mobile')
        .isMobilePhone('en-IN')
        .withMessage('Valid Indian mobile number is required'),
    
    body('password')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long'),
    
    body('firstName')
        .optional()
        .isString()
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Valid email address is required'),
    
    handleValidationErrors
];

// User login validation
const validateUserLogin = [
    body('mobile')
        .isMobilePhone('en-IN')
        .withMessage('Valid Indian mobile number is required'),
    
    body('password')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long'),
    
    handleValidationErrors
];

// Order status update validation
const validateOrderStatus = [
    param('orderId')
        .isString()
        .notEmpty()
        .withMessage('Order ID is required'),
    
    body('status')
        .isIn(['created', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
        .withMessage('Invalid order status'),
    
    body('notes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Notes must be less than 500 characters'),
    
    handleValidationErrors
];

// Refund validation
const validateRefund = [
    param('orderId')
        .isString()
        .notEmpty()
        .withMessage('Order ID is required'),
    
    body('reason')
        .isString()
        .isLength({ min: 10 })
        .withMessage('Refund reason is required (minimum 10 characters)'),
    
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Refund amount must be positive'),
    
    handleValidationErrors
];

// Tracking validation
const validateTrackingUpdate = [
    body('tracking_id')
        .isString()
        .notEmpty()
        .withMessage('Tracking ID is required'),
    
    body('status')
        .isString()
        .notEmpty()
        .withMessage('Status is required'),
    
    body('location')
        .optional()
        .isString(),
    
    body('estimated_delivery')
        .optional()
        .isISO8601()
        .withMessage('Estimated delivery must be a valid date'),
    
    handleValidationErrors
];

// Product validation (for admin)
const validateProduct = [
    body('name')
        .isString()
        .isLength({ min: 3 })
        .withMessage('Product name must be at least 3 characters'),
    
    body('price')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be positive'),
    
    body('stock_quantity')
        .isInt({ min: 0 })
        .withMessage('Stock quantity must be non-negative'),
    
    body('category')
        .optional()
        .isString(),
    
    body('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    
    handleValidationErrors
];

// Newsletter subscription validation
const validateNewsletterSubscription = [
    body('email')
        .isEmail()
        .withMessage('Valid email address is required'),
    
    body('name')
        .optional()
        .isString()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters'),
    
    handleValidationErrors
];

// Contact form validation
const validateContactForm = [
    body('name')
        .isString()
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters'),
    
    body('email')
        .isEmail()
        .withMessage('Valid email address is required'),
    
    body('mobile')
        .optional()
        .isMobilePhone('en-IN')
        .withMessage('Valid Indian mobile number required'),
    
    body('subject')
        .isString()
        .isLength({ min: 5 })
        .withMessage('Subject must be at least 5 characters'),
    
    body('message')
        .isString()
        .isLength({ min: 20 })
        .withMessage('Message must be at least 20 characters'),
    
    handleValidationErrors
];

// Pagination validation
const validatePagination = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be non-negative'),
    
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateCreateOrder,
    validatePaymentVerification,
    validateUserRegistration,
    validateUserLogin,
    validateOrderStatus,
    validateRefund,
    validateTrackingUpdate,
    validateProduct,
    validateNewsletterSubscription,
    validateContactForm,
    validatePagination
};
