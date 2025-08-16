const express = require('express');
const router = express.Router();

// Get all products with optional filtering
router.get('/', async (req, res) => {
    try {
        const { category, search, featured, limit = 50, offset = 0 } = req.query;
        
        let sql = 'SELECT * FROM products WHERE is_active = 1';
        let params = [];
        
        // Add category filter
        if (category && category !== 'all') {
            sql += ' AND category LIKE ?';
            params.push(`%${category}%`);
        }
        
        // Add search filter
        if (search) {
            sql += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // Add featured filter
        if (featured === 'true') {
            sql += ' AND is_featured = 1';
        }
        
        // Add ordering and pagination
        sql += ' ORDER BY is_featured DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const products = await req.db.all(sql, params);
        
        // Parse benefits JSON for each product
        const formattedProducts = products.map(product => ({
            ...product,
            benefits: product.benefits ? JSON.parse(product.benefits) : [],
            categoryList: product.category ? product.category.split(',') : []
        }));
        
        res.json({
            success: true,
            products: formattedProducts,
            count: formattedProducts.length
        });
    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await req.db.get(
            'SELECT * FROM products WHERE id = ? AND is_active = 1',
            [id]
        );
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Parse benefits JSON
        const formattedProduct = {
            ...product,
            benefits: product.benefits ? JSON.parse(product.benefits) : [],
            categoryList: product.category ? product.category.split(',') : []
        };
        
        res.json({
            success: true,
            product: formattedProduct
        });
    } catch (error) {
        console.error('Product fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
});

// Get featured products
router.get('/featured/list', async (req, res) => {
    try {
        const products = await req.db.all(
            'SELECT * FROM products WHERE is_featured = 1 AND is_active = 1 ORDER BY created_at DESC LIMIT 5'
        );
        
        const formattedProducts = products.map(product => ({
            ...product,
            benefits: product.benefits ? JSON.parse(product.benefits) : [],
            categoryList: product.category ? product.category.split(',') : []
        }));
        
        res.json({
            success: true,
            products: formattedProducts
        });
    } catch (error) {
        console.error('Featured products fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch featured products'
        });
    }
});

// Get product categories
router.get('/categories/list', async (req, res) => {
    try {
        const products = await req.db.all(
            'SELECT DISTINCT category FROM products WHERE is_active = 1 AND category IS NOT NULL'
        );
        
        const categories = new Set();
        
        products.forEach(product => {
            if (product.category) {
                product.category.split(',').forEach(cat => {
                    categories.add(cat.trim());
                });
            }
        });
        
        const categoryList = Array.from(categories).map(category => ({
            value: category,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            count: 0
        }));
        
        res.json({
            success: true,
            categories: [
                { value: 'all', label: 'All Products', count: products.length },
                ...categoryList
            ]
        });
    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// Update product stock
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation = 'set' } = req.body;
        
        if (!quantity && quantity !== 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity is required'
            });
        }
        
        let sql, params;
        if (operation === 'set') {
            sql = 'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            params = [quantity, id];
        } else if (operation === 'add') {
            sql = 'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            params = [quantity, id];
        } else if (operation === 'subtract') {
            sql = 'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock_quantity >= ?';
            params = [quantity, id, quantity];
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid operation. Use "set", "add", or "subtract"'
            });
        }
        
        const result = await req.db.run(sql, params);
        
        if (result.changes === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product not found or insufficient stock'
            });
        }
        
        res.json({
            success: true,
            message: 'Stock updated successfully'
        });
    } catch (error) {
        console.error('Stock update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update stock'
        });
    }
});

// EMERGENCY: Nuclear product reset - CORRECT SYNTAX
router.post('/admin/nuclear-reset', async (req, res) => {
    try {
        console.log('🚨 EMERGENCY NUCLEAR RESET TRIGGERED');
        
        // Nuclear deletion
        await req.db.run('DELETE FROM products WHERE 1=1');
        await req.db.run('DELETE FROM subscription_plans WHERE 1=1');
        
        // Insert only Spirulina
        const result = await req.db.run(`
            INSERT INTO products (name, subtitle, description, price, original_price, category, benefits, ingredients, image_url, stock_quantity, is_featured, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            'SanHerbs Spirulina Capsules',
            '60 Veg Capsules • Dietary Food Supplement',
            'Proudly organic Spirulina capsules by SanHerbs. Natural nutraceutical supplement to support daily nutritional needs, immunity, and vitality. FSSAI certified food supplement.',
            459, 599, 'food supplement',
            JSON.stringify(['🌿 100% Natural and Organic', '🛡️ Supports Immunity', '💪 Boosts Vitality and Energy', '🌱 Rich Plant Protein', 'FSSAI Certified Food Supplement']),
            'Organic Spirulina Powder (500 mg per capsule)',
            'https://sanherbs.com/images/products/spirulina.jpg',
            200, 1
        ]);
        
        // Verify
        const count = await req.db.get('SELECT COUNT(*) as count FROM products');
        const product = await req.db.get('SELECT name FROM products LIMIT 1');
        
        console.log(`💥 NUCLEAR RESET COMPLETE: ${count.count} products, name: ${product?.name}`);
        
        res.json({ 
            success: true, 
            message: 'Nuclear reset complete',
            products: count.count,
            productName: product?.name
        });
        
    } catch (error) {
        console.error('Nuclear reset error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
