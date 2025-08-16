const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'greentap-health-secret-key-2025';

// JWT authentication middleware
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

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { mobile, password, firstName, lastName, email } = req.body;
        // Basic validation
        if (!mobile || !password) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and password are required'
            });
        }
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
        // User existence checks
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
        // Password hashing
        const hashedPassword = await bcrypt.hash(password, 12);
        // Create user
        const result = await req.db.run(
            `INSERT INTO users (mobile, password, firstName, lastName, email, role, is_active, email_verified, mobile_verified) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cleanMobile,
                hashedPassword,
                firstName || '',
                lastName || '',
                email || null,
                'user',
                1, // is_active
                0, // email_verified
                0  // mobile_verified
            ]
        );
        res.status(201).json({
            success: true,
            message: 'Account created successfully! You can now login.',
            userId: result.id
        });
    } catch (error) {
        // SQLite unique constraint handler
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

// Login user
router.post('/login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        if (!mobile || !password) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and password are required'
            });
        }
        const cleanMobile = mobile.replace(/\D/g, '');
        const user = await req.db.get(
            'SELECT * FROM users WHERE mobile = ? AND is_active = 1',
            [cleanMobile]
        );
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number or password'
            });
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number or password'
            });
        }
        const token = jwt.sign(
            { 
                userId: user.id,
                mobile: user.mobile,
                firstName: user.firstName,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        delete user.password; // don't expose password hash
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Get user profile
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
        // JSON parse fields
        try { if (user.healthGoals) user.healthGoals = JSON.parse(user.healthGoals); } catch { user.healthGoals = []; }
        try { if (user.allergies) user.allergies = JSON.parse(user.allergies); } catch { user.allergies = []; }
        try { if (user.notifications) user.notifications = JSON.parse(user.notifications); } catch { user.notifications = {}; }
        try { if (user.privacy) user.privacy = JSON.parse(user.privacy); } catch { user.privacy = {}; }
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, email, address, age, gender, healthGoals, allergies, notifications, privacy } = req.body;
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
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        await req.db.run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, req.user.userId]
        );
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
