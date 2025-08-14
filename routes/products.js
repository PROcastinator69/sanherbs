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
            count: 0 // You can calculate actual count if needed
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

// Update product stock (for inventory management)
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'

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

module.exports = router;
