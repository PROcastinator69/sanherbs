require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database initialization - FIXED IMPORT
const database = require('./database/database'); // Import the singleton database instance

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for development
    crossOriginEmbedderPolicy: false
}));

// CORS configuration - Updated for your architecture
// CORS configuration - FIXED for GitHub Pages + Render
app.use(cors({
    origin: [
        'https://sanherbs.com',
        'https://www.sanherbs.com', 
        'http://localhost:3000', 
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Increased limit for better UX
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Raw body parser for webhooks
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// ❌ REMOVED: Static file serving (frontend is on GitHub Pages)
// app.use(express.static(path.join(__dirname, 'public')));

// Middleware
const { attachDatabase, requestLogger } = require('./middleware/auth');

// Request logging middleware
app.use(requestLogger);

// Attach database to all requests
app.use(attachDatabase);

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database first
        await database.init();
        console.log('✅ Database initialized successfully');

        // API Routes
        app.use('/api/auth', require('./routes/auth'));
        app.use('/api/products', require('./routes/products'));
        app.use('/api/plans', require('./routes/plans'));
        app.use('/api/orders', require('./routes/orders'));
        app.use('/api/payments', require('./routes/payments'));
        app.use('/api/tracking', require('./routes/tracking'));
        app.use('/api/users', require('./routes/users'));
        app.use('/api/webhooks', require('./routes/webhooks'));

        // Health check endpoint
        app.get('/api/health', async (req, res) => {
            try {
                const dbHealth = await database.healthCheck();
                const dbStats = await database.getStats();
                
                res.json({
                    success: true,
                    message: 'SanHerbs API is running',
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development',
                    database: dbHealth,
                    database_stats: dbStats,
                    services: {
                        razorpay: !!process.env.RAZORPAY_KEY_ID,
                        email: !!process.env.EMAIL_USER,
                        sms: !!process.env.TWILIO_ACCOUNT_SID,
                        shipping: !!process.env.SHIPROCKET_EMAIL
                    }
                });
            } catch (error) {
                console.error('Health check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Health check failed',
                    error: error.message
                });
            }
        });

        // ✅ NEW: API-only root endpoint
        app.get('/', (req, res) => {
            res.json({
                message: '🌿 SanHerbs API Server',
                status: 'Running',
                version: '1.0.0',
                website: 'https://sanherbs.com',
                architecture: {
                    frontend: 'GitHub Pages (sanherbs.com)',
                    backend: 'Render API Server',
                    database: 'SQLite'
                },
                features: [
                    'User Authentication (JWT)',
                    'Product Catalog Management', 
                    'Shopping Cart System',
                    'Order Management',
                    'Payment Processing (Razorpay)',
                    'Delivery Tracking (Shiprocket)',
                    'Email/SMS Notifications',
                    'Real-time Order Status',
                    'Subscription Plans',
                    'Rate Limiting & Security'
                ],
                endpoints: {
                    health: '/api/health',
                    auth: '/api/auth',
                    products: '/api/products',
                    plans: '/api/plans',
                    orders: '/api/orders',
                    payments: '/api/payments',
                    tracking: '/api/tracking',
                    users: '/api/users',
                    webhooks: '/api/webhooks'
                }
            });
        });

        // API info endpoint
        app.get('/api', (req, res) => {
            res.json({
                success: true,
                message: 'Welcome to SanHerbs E-commerce API',
                version: '1.0.0',
                website: 'https://sanherbs.com',
                features: [
                    'User Authentication (JWT)',
                    'Product Catalog Management', 
                    'Shopping Cart System',
                    'Order Management',
                    'Payment Processing (Razorpay)',
                    'Delivery Tracking (Shiprocket)',
                    'Email/SMS Notifications',
                    'Real-time Order Status',
                    'Subscription Plans',
                    'Rate Limiting & Security'
                ],
                endpoints: {
                    auth: '/api/auth',
                    products: '/api/products',
                    plans: '/api/plans',
                    orders: '/api/orders',
                    payments: '/api/payments',
                    tracking: '/api/tracking',
                    users: '/api/users',
                    webhooks: '/api/webhooks',
                    health: '/api/health'
                }
            });
        });

        // ❌ REMOVED: Static HTML page serving (frontend is on GitHub Pages)
        // servePage functions and HTML routes removed

        // 404 handler for API routes
        app.use('/api/*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint not found',
                requested_path: req.originalUrl,
                available_endpoints: [
                    '/api/auth',
                    '/api/products', 
                    '/api/plans',
                    '/api/orders',
                    '/api/payments',
                    '/api/tracking',
                    '/api/users',
                    '/api/webhooks',
                    '/api/health'
                ]
            });
        });

        // ✅ UPDATED: Redirect non-API requests to main website
        app.use('*', (req, res) => {
            res.redirect('https://sanherbs.com');
        });

        // Global error handler
        app.use((err, req, res, next) => {
            console.error('Global error handler:', err);
            
            // Handle different types of errors
            if (err.type === 'entity.parse.failed') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid JSON in request body'
                });
            }
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    success: false,
                    message: 'Request entity too large'
                });
            }

            if (err.code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            // JWT errors
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid authentication token'
                });
            }

            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication token expired'
                });
            }

            // Default error response
            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });

        // Start server
        const server = app.listen(PORT, () => {
            console.log('🌿 SanHerbs E-commerce API Started');
            console.log('━'.repeat(60));
            console.log(`🚀 API Server running at: http://localhost:${PORT}`);
            console.log(`📊 API endpoints at: http://localhost:${PORT}/api`);
            console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Frontend website: https://sanherbs.com`);
            console.log(`💳 Payment Gateway: ${process.env.RAZORPAY_KEY_ID ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`📧 Email Service: ${process.env.EMAIL_USER ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`📱 SMS Service: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`🚚 Shipping Service: ${process.env.SHIPROCKET_EMAIL ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log('━'.repeat(60));
            console.log('✅ Ready for API requests from sanherbs.com!');
            console.log('🛒 Features: Cart → Checkout → Razorpay Payment → Tracking');
            console.log('━'.repeat(60));
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close(async () => {
                console.log('HTTP server closed.');
                try {
                    await database.close();
                    console.log('Database connection closed.');
                    process.exit(0);
                } catch (err) {
                    console.error('Error closing database:', err);
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            server.close(() => {
                process.exit(1);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;

