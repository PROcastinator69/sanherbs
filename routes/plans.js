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

// Get all subscription plans
router.get('/', async (req, res) => {
    try {
        const plans = await req.db.all(
            'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY is_featured DESC, price ASC'
        );

        const formattedPlans = plans.map(plan => ({
            ...plan,
            features: plan.features ? JSON.parse(plan.features) : [],
            products: plan.products ? JSON.parse(plan.products) : []
        }));

        res.json({
            success: true,
            plans: formattedPlans
        });
    } catch (error) {
        console.error('Plans fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plans'
        });
    }
});

// Get single subscription plan
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const plan = await req.db.get(
            'SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1',
            [id]
        );

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }

        const formattedPlan = {
            ...plan,
            features: plan.features ? JSON.parse(plan.features) : [],
            products: plan.products ? JSON.parse(plan.products) : []
        };

        res.json({
            success: true,
            plan: formattedPlan
        });
    } catch (error) {
        console.error('Plan fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plan'
        });
    }
});

// Subscribe to a plan (Online payment only)
router.post('/subscribe', authenticateToken, async (req, res) => {
    try {
        const { planId, startDate } = req.body;

        if (!planId) {
            return res.status(400).json({
                success: false,
                message: 'Plan ID is required'
            });
        }

        // Get plan details
        const plan = await req.db.get(
            'SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1',
            [planId]
        );

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Subscription plan not found'
            });
        }

        // Check if user already has an active subscription for this plan
        const existingSubscription = await req.db.get(
            'SELECT id FROM user_subscriptions WHERE user_id = ? AND plan_id = ? AND status = "active"',
            [req.user.userId, planId]
        );

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active subscription for this plan'
            });
        }

        // Calculate end date and next billing date
        const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
        const endDate = new Date(subscriptionStartDate);
        endDate.setMonth(endDate.getMonth() + plan.duration_months);
        const nextBillingDate = new Date(endDate);

        // Create subscription
        const result = await req.db.run(
            `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date, next_billing_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.user.userId,
                planId,
                'active',
                subscriptionStartDate.toISOString(),
                endDate.toISOString(),
                nextBillingDate.toISOString()
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Subscription created successfully',
            subscription: {
                id: result.id,
                planName: plan.name,
                startDate: subscriptionStartDate,
                endDate: endDate,
                nextBillingDate: nextBillingDate,
                status: 'active'
            }
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create subscription'
        });
    }
});

// Get user subscriptions
router.get('/user/subscriptions', authenticateToken, async (req, res) => {
    try {
        const subscriptions = await req.db.all(
            `SELECT us.*, sp.name as plan_name, sp.price, sp.duration_months, sp.features, sp.products
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.user_id = ?
             ORDER BY us.created_at DESC`,
            [req.user.userId]
        );

        const formattedSubscriptions = subscriptions.map(sub => ({
            ...sub,
            features: sub.features ? JSON.parse(sub.features) : [],
            products: sub.products ? JSON.parse(sub.products) : []
        }));

        res.json({
            success: true,
            subscriptions: formattedSubscriptions
        });
    } catch (error) {
        console.error('User subscriptions fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscriptions'
        });
    }
});

// Cancel subscription
router.put('/subscription/:subscriptionId/cancel', authenticateToken, async (req, res) => {
    try {
        const { subscriptionId } = req.params;

        const subscription = await req.db.get(
            'SELECT * FROM user_subscriptions WHERE id = ? AND user_id = ?',
            [subscriptionId, req.user.userId]
        );

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        if (subscription.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Subscription is already cancelled'
            });
        }

        await req.db.run(
            'UPDATE user_subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['cancelled', subscriptionId]
        );

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Subscription cancellation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription'
        });
    }
});

module.exports = router;
