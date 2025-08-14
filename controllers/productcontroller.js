const db = require('../database/database');
const Product = require('../models/Product');

class ProductController {
    // Get all products with filtering and pagination
    async getAllProducts(req, res) {
        try {
            const { 
                category, 
                search, 
                limit = 20, 
                offset = 0, 
                sortBy = 'created_at', 
                sortOrder = 'DESC',
                minPrice,
                maxPrice,
                inStock = true
            } = req.query;

            let sql = `
                SELECT p.*, 
                       CASE WHEN p.stock_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END as stock_status
                FROM products p 
                WHERE p.is_active = 1
            `;
            let params = [];

            // Category filter
            if (category && category !== 'all') {
                sql += ' AND p.category = ?';
                params.push(category);
            }

            // Search filter
            if (search) {
                sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.subtitle LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            // Price range filter
            if (minPrice) {
                sql += ' AND p.price >= ?';
                params.push(parseFloat(minPrice));
            }

            if (maxPrice) {
                sql += ' AND p.price <= ?';
                params.push(parseFloat(maxPrice));
            }

            // Stock filter
            if (inStock === 'true') {
                sql += ' AND p.stock_quantity > 0';
            }

            // Sorting
            const validSortFields = ['name', 'price', 'created_at', 'stock_quantity'];
            const validSortOrders = ['ASC', 'DESC'];
            
            if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
                sql += ` ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}`;
            } else {
                sql += ' ORDER BY p.created_at DESC';
            }

            // Pagination
            sql += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const stmt = db.prepare(sql);
            const products = await stmt.all(...params);

            // Get total count for pagination
            let countSql = 'SELECT COUNT(*) as total FROM products p WHERE p.is_active = 1';
            let countParams = [];

            if (category && category !== 'all') {
                countSql += ' AND p.category = ?';
                countParams.push(category);
            }

            if (search) {
                countSql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.subtitle LIKE ?)';
                countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            const countStmt = db.prepare(countSql);
            const countResult = await countStmt.get(...countParams);
            const totalProducts = countResult.total;

            res.json({
                success: true,
                products: products,
                pagination: {
                    total: totalProducts,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + products.length) < totalProducts
                }
            });

        } catch (error) {
            console.error('Get all products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch products',
                error: error.message
            });
        }
    }

    // Get single product by ID
    async getProductById(req, res) {
        try {
            const { productId } = req.params;

            const stmt = db.prepare(`
                SELECT p.*, 
                       CASE WHEN p.stock_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END as stock_status,
                       CASE WHEN p.stock_quantity <= 5 AND p.stock_quantity > 0 THEN 1 ELSE 0 END as low_stock
                FROM products p 
                WHERE p.id = ? AND p.is_active = 1
            `);

            const product = await stmt.get(productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Parse JSON fields
            if (product.benefits) {
                try {
                    product.benefits = JSON.parse(product.benefits);
                } catch (e) {
                    product.benefits = [];
                }
            }

            if (product.ingredients) {
                try {
                    product.ingredients = JSON.parse(product.ingredients);
                } catch (e) {
                    product.ingredients = [];
                }
            }

            res.json({
                success: true,
                product: product
            });

        } catch (error) {
            console.error('Get product by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product details',
                error: error.message
            });
        }
    }

    // Get products by category
    async getProductsByCategory(req, res) {
        try {
            const { category } = req.params;
            const { limit = 12, offset = 0 } = req.query;

            const stmt = db.prepare(`
                SELECT p.*, 
                       CASE WHEN p.stock_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END as stock_status
                FROM products p 
                WHERE p.category = ? AND p.is_active = 1 AND p.stock_quantity > 0
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?
            `);

            const products = await stmt.all(category, parseInt(limit), parseInt(offset));

            res.json({
                success: true,
                products: products,
                category: category
            });

        } catch (error) {
            console.error('Get products by category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category products',
                error: error.message
            });
        }
    }

    // Get featured/recommended products
    async getFeaturedProducts(req, res) {
        try {
            const { limit = 6 } = req.query;

            const stmt = db.prepare(`
                SELECT p.*, 
                       CASE WHEN p.stock_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END as stock_status
                FROM products p 
                WHERE p.is_active = 1 AND p.is_featured = 1 AND p.stock_quantity > 0
                ORDER BY p.created_at DESC
                LIMIT ?
            `);

            const products = await stmt.all(parseInt(limit));

            res.json({
                success: true,
                products: products
            });

        } catch (error) {
            console.error('Get featured products error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch featured products',
                error: error.message
            });
        }
    }

    // Get product categories
    async getCategories(req, res) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    p.category,
                    COUNT(*) as product_count,
                    MIN(p.price) as min_price,
                    MAX(p.price) as max_price
                FROM products p 
                WHERE p.is_active = 1 AND p.stock_quantity > 0
                GROUP BY p.category
                ORDER BY product_count DESC
            `);

            const categories = await stmt.all();

            res.json({
                success: true,
                categories: categories
            });

        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: error.message
            });
        }
    }

    // Search products
    async searchProducts(req, res) {
        try {
            const { q: query, limit = 20, offset = 0 } = req.query;

            if (!query || query.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters long'
                });
            }

            const searchTerm = `%${query.trim()}%`;

            const stmt = db.prepare(`
                SELECT p.*, 
                       CASE WHEN p.stock_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END as stock_status,
                       CASE 
                           WHEN p.name LIKE ? THEN 3
                           WHEN p.subtitle LIKE ? THEN 2
                           WHEN p.description LIKE ? THEN 1
                           ELSE 0
                       END as relevance_score
                FROM products p 
                WHERE p.is_active = 1 
                AND (p.name LIKE ? OR p.subtitle LIKE ? OR p.description LIKE ? OR p.category LIKE ?)
                ORDER BY relevance_score DESC, p.created_at DESC
                LIMIT ? OFFSET ?
            `);

            const products = await stmt.all(
                searchTerm, searchTerm, searchTerm,
                searchTerm, searchTerm, searchTerm, searchTerm,
                parseInt(limit), parseInt(offset)
            );

            // Get search suggestions
            const suggestionStmt = db.prepare(`
                SELECT DISTINCT p.name
                FROM products p 
                WHERE p.is_active = 1 AND p.name LIKE ?
                ORDER BY p.name
                LIMIT 5
            `);

            const suggestions = await suggestionStmt.all(searchTerm);

            res.json({
                success: true,
                products: products,
                query: query,
                suggestions: suggestions.map(s => s.name),
                results_count: products.length
            });

        } catch (error) {
            console.error('Search products error:', error);
            res.status(500).json({
                success: false,
                message: 'Search failed',
                error: error.message
            });
        }
    }

    // Check product availability
    async checkAvailability(req, res) {
        try {
            const { productId } = req.params;
            const { quantity = 1 } = req.query;

            const stmt = db.prepare(`
                SELECT 
                    p.id,
                    p.name,
                    p.stock_quantity,
                    p.is_active,
                    CASE 
                        WHEN p.stock_quantity >= ? THEN 'available'
                        WHEN p.stock_quantity > 0 THEN 'limited'
                        ELSE 'out_of_stock'
                    END as availability_status
                FROM products p 
                WHERE p.id = ?
            `);

            const product = await stmt.get(parseInt(quantity), productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                product_id: product.id,
                product_name: product.name,
                requested_quantity: parseInt(quantity),
                available_stock: product.stock_quantity,
                availability_status: product.availability_status,
                is_available: product.is_active && product.stock_quantity >= parseInt(quantity)
            });

        } catch (error) {
            console.error('Check availability error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check product availability',
                error: error.message
            });
        }
    }

    // Get product reviews/ratings (placeholder - you can implement reviews later)
    async getProductReviews(req, res) {
        try {
            const { productId } = req.params;
            
            // For now, return mock reviews - implement actual review system later
            const mockReviews = [
                {
                    id: 1,
                    user_name: "Rahul S.",
                    rating: 5,
                    comment: "Excellent product! Very effective and good quality.",
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    user_name: "Priya M.",
                    rating: 4,
                    comment: "Good product, delivery was fast.",
                    created_at: new Date().toISOString()
                }
            ];

            res.json({
                success: true,
                reviews: mockReviews,
                average_rating: 4.5,
                total_reviews: mockReviews.length
            });

        } catch (error) {
            console.error('Get product reviews error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product reviews',
                error: error.message
            });
        }
    }

    // Admin functions (for future implementation)
    
    // Create new product (Admin only)
    async createProduct(req, res) {
        try {
            const {
                name,
                subtitle,
                description,
                price,
                category,
                stock_quantity,
                benefits,
                ingredients,
                is_featured = false
            } = req.body;

            const productId = `PROD_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            const stmt = db.prepare(`
                INSERT INTO products (
                    id, name, subtitle, description, price, category, 
                    stock_quantity, benefits, ingredients, is_featured, 
                    is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            await stmt.run(
                productId,
                name,
                subtitle,
                description,
                parseFloat(price),
                category,
                parseInt(stock_quantity),
                JSON.stringify(benefits || []),
                JSON.stringify(ingredients || []),
                is_featured ? 1 : 0,
                1, // is_active
                new Date().toISOString(),
                new Date().toISOString()
            );

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                product_id: productId
            });

        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create product',
                error: error.message
            });
        }
    }

    // Update product stock
    async updateStock(req, res) {
        try {
            const { productId } = req.params;
            const { quantity, operation = 'set' } = req.body;

            let sql;
            if (operation === 'decrease') {
                sql = 'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?';
            } else if (operation === 'increase') {
                sql = 'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?';
            } else {
                sql = 'UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?';
            }

            const stmt = db.prepare(sql);
            const result = await stmt.run(parseInt(quantity), new Date().toISOString(), productId);

            if (result.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                message: 'Stock updated successfully'
            });

        } catch (error) {
            console.error('Update stock error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update stock',
                error: error.message
            });
        }
    }
}

module.exports = new ProductController();
