const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'greentap-health-secret-key-2025';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Register new user - FIXED FOR INTEGER PRIMARY KEY
router.post('/register', async (req, res) => {
    try {
        const { mobile, password, firstName, lastName, email } = req.body;

        console.log('🔍 Registration attempt:', { mobile, firstName, lastName, email });

        // Validation
        if (!mobile || !password) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and password are required'
            });
        }

        // Clean mobile number (remove spaces, special chars)
        const cleanMobile = mobile.replace(/\D/g, '');

        if (!/^[0-9]{10}$/.test(cleanMobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit mobile number'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 4 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await req.db.get(
            'SELECT id FROM users WHERE mobile = ?',
            [cleanMobile]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this mobile number already exists'
            });
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await req.db.get(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
        }

        // Hash password with higher salt rounds for better security
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);
        console.log('✅ Password hashed successfully');

        // Create user - FIXED VERSION (NO UUID, uses auto-increment)
        const result = await req.db.run(
            `INSERT INTO users (mobile, password, firstName, lastName, email, role, is_active, email_verified, mobile_verified) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cleanMobile,              // cleaned mobile number
                hashedPassword,           // hashed password
                firstName || '',          // firstName
                lastName || '',           // lastName
                email || null,            // email (can be null)
                'user',                   // default role
                1,                        // is_active = true
                0,                        // email_verified = false
                0                         // mobile_verified = false
            ]
        );

        console.log('✅ User created with ID:', result.id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully! You can now login.',
            userId: result.id  // This will be an auto-generated integer
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // Handle specific SQLite errors
        if (error.message.includes('UNIQUE constraint failed')) {
            if (error.message.includes('mobile')) {
                return res.status(400).json({
                    success: false,
                    message: 'Mobile number already registered'
                });
            }
            if (error.message.includes('email')) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// Login user - FIXED FOR INTEGER PRIMARY KEY
router.post('/login', async (req, res) => {
    try {
        const { mobile, password } = req.body;

        console.log('🔍 Login attempt:', { mobile, password: '***' });

        // Validation
        if (!mobile || !password) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and password are required'
            });
        }

        // Clean mobile number
        const cleanMobile = mobile.replace(/\D/g, '');

        // Find user - check if user is active
        const user = await req.db.get(
            'SELECT * FROM users WHERE mobile = ? AND is_active = 1',
            [cleanMobile]
        );

        console.log('👤 User found:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('❌ User not found in database or inactive');
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number or password'
            });
        }

        console.log('🔐 Comparing passwords...');
        console.log('Stored hash length:', user.password ? user.password.length : 'null');
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('✅ Password valid:', isValidPassword);

        if (!isValidPassword) {
            console.log('❌ Invalid password');
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number or password'
            });
        }

        // Generate JWT token - FIXED to use user.id (INTEGER)
        console.log('🎫 Generating JWT token...');
        const token = jwt.sign(
            { 
                userId: user.id,        // Use integer ID from database
                mobile: user.mobile,
                firstName: user.firstName,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        delete user.password;

        console.log('✅ Login successful for user:', user.mobile);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await req.db.get(
            `SELECT id, mobile, firstName, lastName, email, address, age, gender, role, 
                    is_active, email_verified, mobile_verified, healthGoals, allergies, 
                    notifications, privacy, created_at 
             FROM users WHERE id = ? AND is_active = 1`,
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Parse JSON fields safely
        try {
            if (user.healthGoals) user.healthGoals = JSON.parse(user.healthGoals);
        } catch (e) { user.healthGoals = []; }
        
        try {
            if (user.allergies) user.allergies = JSON.parse(user.allergies);
        } catch (e) { user.allergies = []; }
        
        try {
            if (user.notifications) user.notifications = JSON.parse(user.notifications);
        } catch (e) { user.notifications = {}; }
        
        try {
            if (user.privacy) user.privacy = JSON.parse(user.privacy);
        } catch (e) { user.privacy = {}; }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, email, address, age, gender, healthGoals, allergies, notifications, privacy } = req.body;

        // Validate email if provided
        if (email) {
            const existingEmail = await req.db.get(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.userId]
            );

            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use by another account'
                });
            }
        }

        // Validate gender if provided
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid gender value'
            });
        }

        await req.db.run(
            `UPDATE users SET 
             firstName = ?, lastName = ?, email = ?, address = ?, age = ?, gender = ?,
             healthGoals = ?, allergies = ?, notifications = ?, privacy = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                firstName || '', 
                lastName || '', 
                email || null, 
                address || '', 
                age || null, 
                gender || null,
                JSON.stringify(healthGoals || []),
                JSON.stringify(allergies || []),
                JSON.stringify(notifications || {}),
                JSON.stringify(privacy || {}),
                req.user.userId
            ]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 4 characters long'
            });
        }

        // Get current user
        const user = await req.db.get(
            'SELECT password FROM users WHERE id = ? AND is_active = 1',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await req.db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, req.user.userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Logout endpoint (optional - client-side can just remove token)
router.post('/logout', authenticateToken, (req, res) => {
    // Since JWT is stateless, logout is handled client-side by removing the token
    // This endpoint exists for consistency and potential future server-side token blacklisting
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
