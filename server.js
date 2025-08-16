require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Database initialization
const database = require('./database/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ HTTPS REDIRECT MIDDLEWARE - Forces SSL
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});

// ✅ ENHANCED SECURITY HEADERS - SSL Security
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: { 
        maxAge: 31536000, 
        includeSubDomains: true,
        preload: true 
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
}));

// ✅ ADDITIONAL SECURITY HEADERS
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// CORS configuration - UPDATED for HTTPS
app.use(cors({
    origin: [
        'https://sanherbs.com',        // ✅ HTTPS FIRST
        'https://www.sanherbs.com',    // ✅ HTTPS FIRST
        'http://sanherbs.com',         // Fallback for redirects
        'http://www.sanherbs.com',     // Fallback for redirects
        'http://localhost:3000',       // Development
        'http://127.0.0.1:3000'        // Development
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Rate limiting - Enhanced for security
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Raw body parser for webhooks
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

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
      //  app.use('/api/orders', require('./routes/orders'));//
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
                    ssl_enabled: req.secure || req.header('x-forwarded-proto') === 'https',
                    database: dbHealth,
                    database_stats: dbStats,
                    services: {
                        razorpay: !!process.env.RAZORPAY_KEY_ID,
                        email: !!process.env.EMAIL_USER,
                        sms: !!process.env.TWILIO_ACCOUNT_SID,
                        shipping: !!process.env.SHIPROCKET_EMAIL,
                        jwt_configured: !!process.env.JWT_SECRET
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

        // API-only root endpoint
        app.get('/', (req, res) => {
            res.json({
                message: '🌿 SanHerbs API Server',
                status: 'Running',
                version: '1.0.0',
                ssl_enabled: req.secure || req.header('x-forwarded-proto') === 'https',
                website: 'https://sanherbs.com',
                architecture: {
                    frontend: 'GitHub Pages (sanherbs.com)',
                    backend: 'Render API Server with SSL',
                    database: 'SQLite',
                    security: 'HTTPS + JWT + bcrypt'
                },
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
                ssl_enabled: req.secure || req.header('x-forwarded-proto') === 'https',
                website: 'https://sanherbs.com',
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

        // Redirect non-API requests to HTTPS frontend
        app.use('*', (req, res) => {
            if (!req.originalUrl.startsWith('/api/') && !req.originalUrl.startsWith('/auth/')) {
                console.log(`Redirecting non-API request: ${req.originalUrl}`);
                res.redirect(301, 'https://sanherbs.com');
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Endpoint not found',
                    requested_path: req.originalUrl
                });
            }
        });

        // Global error handler - Enhanced
        app.use((err, req, res, next) => {
            console.error('Global error handler:', err);
            
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

            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            });
        });

        // Start server
        const server = app.listen(PORT, () => {
            console.log('🔒 SanHerbs SECURE E-commerce API Started');
            console.log('━'.repeat(70));
            console.log(`🚀 API Server: http://localhost:${PORT}`);
            console.log(`🔐 HTTPS Redirect: ENABLED`);
            console.log(`📊 API Endpoints: http://localhost:${PORT}/api`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🌐 Frontend: https://sanherbs.com`);
            console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Configured ✅' : 'Missing ❌'}`);
            console.log(`💳 Razorpay: ${process.env.RAZORPAY_KEY_ID ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`📧 Email: ${process.env.EMAIL_USER ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`📱 SMS: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log(`🚚 Shipping: ${process.env.SHIPROCKET_EMAIL ? 'Configured ✅' : 'Not Configured ❌'}`);
            console.log('━'.repeat(70));
            console.log('✅ READY: SSL/HTTPS + Security Headers + Rate Limiting');
            console.log('🛒 Features: Cart → Checkout → Razorpay → Tracking');
            console.log('━'.repeat(70));
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

