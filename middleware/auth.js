const jwt = require('jsonwebtoken');
const database = require('../database/database'); // Import database singleton
const JWT_SECRET = process.env.JWT_SECRET || 'greentap-health-secret-key-2025';

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('Token verification error:', err);
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }
            req.user = {
                id: decoded.userId,
                userId: decoded.userId, // Backward compatibility
                mobile: decoded.mobile,
                firstName: decoded.firstName,
                email: decoded.email,
                role: decoded.role
            };
            next();
        });
    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Optional JWT authentication
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            req.user = null;
            return next();
        }
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                req.user = null;
            } else {
                req.user = {
                    id: decoded.userId,
                    userId: decoded.userId,
                    mobile: decoded.mobile,
                    firstName: decoded.firstName,
                    email: decoded.email,
                    role: decoded.role
                };
            }
            next();
        });
    } catch (error) {
        req.user = null;
        next();
    }
};

// Admin authentication
const authenticateAdmin = async (req, res, next) => {
    try {
        // First authenticate token
        authenticateToken(req, res, async () => {
            try {
                // Check if user is admin using async/await
                const user = await req.db.get('SELECT role FROM users WHERE id = ? AND is_active = 1', [req.user.id]);
                if (!user || user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'Admin access required'
                    });
                }
                next();
            } catch (dbError) {
                console.error('Database error in admin auth:', dbError);
                return res.status(500).json({
                    success: false,
                    message: 'Database error during admin authentication'
                });
            }
        });
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Admin authentication error'
        });
    }
};

// Simple rate limiting middleware (supplement to express-rate-limit)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        // Clean old entries
        for (const [key, timestamps] of requests.entries()) {
            requests.set(key, timestamps.filter(time => time > windowStart));
            if (requests.get(key).length === 0) {
                requests.delete(key);
            }
        }
        // Check current client requests
        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }
        const clientRequests = requests.get(clientId);

        if (clientRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        clientRequests.push(now);
        requests.set(clientId, clientRequests);
        next();
    };
};

// API key authentication (for webhook endpoints)
const authenticateAPIKey = (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const validAPIKey = process.env.API_KEY;
        if (!validAPIKey) {
            console.warn('API_KEY not configured in environment');
        }
        if (!apiKey || (validAPIKey && apiKey !== validAPIKey)) {
            return res.status(401).json({
                success: false,
                message: 'Valid API key required'
            });
        }
        next();
    } catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'API authentication error'
        });
    }
};

// Database connection middleware
const attachDatabase = (req, res, next) => {
    try {
        req.db = database; // Attach the initialized database instance
        next();
    } catch (error) {
        console.error('Database attachment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Database connection error'
        });
    }
};

// CORS middleware for API routes
const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    res.header('Access-Control-Allow-Credentials', true);
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    next();
};

module.exports = {
    authenticateToken,
    optionalAuth,
    authenticateAdmin,
    rateLimit,
    authenticateAPIKey,
    attachDatabase,
    corsMiddleware,
    requestLogger
};
