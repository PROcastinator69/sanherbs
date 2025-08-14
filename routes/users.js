const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'greentap-health-secret-key-2025';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Get user basic info
        const user = await req.db.get(
            'SELECT id, mobile, firstName, lastName, email, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get order statistics
        const orderStats = await req.db.get(
            `SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
                COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
                SUM(total_amount) as total_spent
             FROM orders WHERE user_id = ?`,
            [req.user.userId]
        );

        // Get active subscriptions count
        const subscriptionStats = await req.db.get(
            'SELECT COUNT(*) as active_subscriptions FROM user_subscriptions WHERE user_id = ? AND status = "active"',
            [req.user.userId]
        );

        // Get recent orders
        const recentOrders = await req.db.all(
            `SELECT id, order_number, total_amount, status, created_at 
             FROM orders WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT 5`,
            [req.user.userId]
        );

        // Health tips
        const healthTips = [
            "💡 Take supplements with meals for better absorption",
            "💧 Drink plenty of water throughout the day", 
            "🏃‍♂️ Combine supplements with regular exercise",
            "😴 Get 7-8 hours of quality sleep daily",
            "🥗 Maintain a balanced diet rich in fruits and vegetables"
        ];

        res.json({
            success: true,
            dashboard: {
                user: {
                    ...user,
                    memberSince: user.created_at
                },
                stats: {
                    totalOrders: orderStats.total_orders || 0,
                    deliveredOrders: orderStats.delivered_orders || 0,
                    processingOrders: orderStats.processing_orders || 0,
                    totalSpent: orderStats.total_spent || 0,
                    activeSubscriptions: subscriptionStats.active_subscriptions || 0
                },
                recentOrders,
                healthTips
            }
        });

    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
});

// Get user activity history
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        // Get recent orders
        const orders = await req.db.all(
            `SELECT 'order' as type, id, order_number as reference, total_amount as amount, status, created_at
             FROM orders WHERE user_id = ?`,
            [req.user.userId]
        );

        // Get subscription activities
        const subscriptions = await req.db.all(
            `SELECT 'subscription' as type, us.id, sp.name as reference, sp.price as amount, us.status, us.created_at
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.user_id = ?`,
            [req.user.userId]
        );

        // Combine and sort activities
        const activities = [...orders, ...subscriptions]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        res.json({
            success: true,
            activities
        });

    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity'
        });
    }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const { 
            emailNotifications, 
            smsNotifications, 
            marketingEmails,
            shareHealthData,
            allowResearch 
        } = req.body;

        const notifications = {
            email: emailNotifications !== undefined ? emailNotifications : true,
            sms: smsNotifications !== undefined ? smsNotifications : true,
            marketing: marketingEmails !== undefined ? marketingEmails : false
        };

        const privacy = {
            shareHealthData: shareHealthData !== undefined ? shareHealthData : true,
            allowResearch: allowResearch !== undefined ? allowResearch : false
        };

        await req.db.run(
            'UPDATE users SET notifications = ?, privacy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [JSON.stringify(notifications), JSON.stringify(privacy), req.user.userId]
        );

        res.json({
            success: true,
            message: 'Preferences updated successfully'
        });

    } catch (error) {
        console.error('Preferences update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences'
        });
    }
});

// Get user health profile
router.get('/health-profile', authenticateToken, async (req, res) => {
    try {
        const user = await req.db.get(
            'SELECT age, gender, healthGoals, allergies FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const healthProfile = {
            age: user.age,
            gender: user.gender,
            healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
            allergies: user.allergies ? JSON.parse(user.allergies) : []
        };

        res.json({
            success: true,
            healthProfile
        });

    } catch (error) {
        console.error('Health profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health profile'
        });
    }
});

// Update health profile
router.put('/health-profile', authenticateToken, async (req, res) => {
    try {
        const { age, gender, healthGoals, allergies } = req.body;

        await req.db.run(
            'UPDATE users SET age = ?, gender = ?, healthGoals = ?, allergies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
                age, 
                gender, 
                JSON.stringify(healthGoals || []), 
                JSON.stringify(allergies || []), 
                req.user.userId
            ]
        );

        res.json({
            success: true,
            message: 'Health profile updated successfully'
        });

    } catch (error) {
        console.error('Health profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update health profile'
        });
    }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const { confirmPassword } = req.body;

        if (!confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password confirmation required'
            });
        }

        // Verify password
        const user = await req.db.get(
            'SELECT password FROM users WHERE id = ?',
            [req.user.userId]
        );

        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(confirmPassword, user.password);

        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }

        // Cancel all active subscriptions
        await req.db.run(
            'UPDATE user_subscriptions SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = "active"',
            [req.user.userId]
        );

        // Mark user as deleted (instead of actually deleting for data integrity)
        await req.db.run(
            'UPDATE users SET email = NULL, mobile = CONCAT("deleted_", mobile), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [req.user.userId]
        );

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
});

module.exports = router;
