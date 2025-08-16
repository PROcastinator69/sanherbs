const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            // Use .env DB_PATH variable if set for deploy
            const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, 'greentap.db');
            console.log('🔗 Initializing database at:', dbPath);
            
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('❌ Error opening database:', err);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }
    
    async createTables() {
        console.log('🔨 Creating database tables...');
        
        const tables = [
            // Users table - FIXED VERSION
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mobile VARCHAR(10) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                firstName VARCHAR(100),
                lastName VARCHAR(100),
                email VARCHAR(255) UNIQUE,
                address TEXT,
                age INTEGER,
                gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
                role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                is_active INTEGER DEFAULT 1,
                email_verified INTEGER DEFAULT 0,
                mobile_verified INTEGER DEFAULT 0,
                healthGoals TEXT,
                allergies TEXT,
                notifications TEXT,
                privacy TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            // Products table - ENHANCED VERSION
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                original_price DECIMAL(10,2),
                category VARCHAR(100),
                benefits TEXT,
                ingredients TEXT,
                image_url VARCHAR(255),
                stock_quantity INTEGER DEFAULT 0,
                is_featured INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            // Orders table
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'processing',
                payment_method VARCHAR(50) DEFAULT 'online',
                payment_status VARCHAR(50) DEFAULT 'pending',
                razorpay_order_id VARCHAR(100),
                razorpay_payment_id VARCHAR(100),
                delivery_address TEXT,
                contact_number VARCHAR(15),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            // Order items table
            `CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_id INTEGER,
                product_name VARCHAR(255),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,
            // Subscription plans table
            `CREATE TABLE IF NOT EXISTS subscription_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                duration_months INTEGER DEFAULT 1,
                features TEXT,
                products TEXT,
                is_featured INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            // User subscriptions table
            `CREATE TABLE IF NOT EXISTS user_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                plan_id INTEGER,
                status VARCHAR(50) DEFAULT 'active',
                start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_date DATETIME,
                next_billing_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
            )`,
            // Payments table (for Razorpay integration)
            `CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                razorpay_order_id VARCHAR(100),
                razorpay_payment_id VARCHAR(100),
                razorpay_signature VARCHAR(255),
                amount DECIMAL(10,2),
                currency VARCHAR(10) DEFAULT 'INR',
                status VARCHAR(50) DEFAULT 'pending',
                method VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )`
        ];
        
        for (const table of tables) {
            await this.run(table);
        }
        
        // Create indexes for better performance
        await this.createIndexes();
        // Insert sample data - THIS IS THE KEY PART
        await this.insertSampleData();
        
        console.log('✅ Database tables created successfully');
    }
    
    async createIndexes() {
        console.log('🔨 Creating database indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
            'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured)',
            'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
            'CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)',
            'CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id)',
            'CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id)'
        ];
        
        for (const index of indexes) {
            await this.run(index);
        }
        
        console.log('✅ Database indexes created successfully');
    }
    
    async insertSampleData() {
        console.log('📦 FORCING CLEANUP - Removing ALL existing products...');
        
        try {
            // AGGRESSIVE CLEANUP - Remove all existing products every time
            await this.run('DELETE FROM products');
            await this.run('DELETE FROM subscription_plans');
            console.log('🗑️ Deleted ALL existing products and plans');
            
            // Check if ANY products exist after cleanup
            const existingProducts = await this.get('SELECT COUNT(*) as count FROM products');
            console.log(`🔍 Products after cleanup: ${existingProducts.count}`);
            
            // Only insert if NO products exist
            if (existingProducts.count === 0) {
                // Insert only your Spirulina Capsules as the main product
                const product = {
                    name: 'SanHerbs Spirulina Capsules',
                    subtitle: '60 Veg Capsules • Dietary Food Supplement',
                    description: 'Proudly organic Spirulina capsules by SanHerbs. Natural nutraceutical supplement to support daily nutritional needs, immunity, and vitality. FSSAI certified food supplement. Not a medicine.',
                    price: 459,
                    original_price: 599,
                    category: 'food supplement',
                    benefits: JSON.stringify([
                        '🌿 100% Natural and Organic',
                        '🛡️ Supports Immunity',
                        '💪 Boosts Vitality and Energy',
                        '🌱 Rich Plant Protein',
                        'FSSAI Certified Food Supplement'
                    ]),
                    ingredients: 'Organic Spirulina Powder (500 mg per capsule)',
                    image_url: '/images/products/spirulina.jpg',
                    stock_quantity: 200,
                    is_featured: 1
                };
                
                await this.run(
                    `INSERT INTO products (name, subtitle, description, price, original_price, category, benefits, ingredients, image_url, stock_quantity, is_featured, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        product.name,
                        product.subtitle,
                        product.description,
                        product.price,
                        product.original_price,
                        product.category,
                        product.benefits,
                        product.ingredients,
                        product.image_url,
                        product.stock_quantity,
                        product.is_featured
                    ]
                );
                
                console.log('✅ SUCCESSFULLY inserted ONLY Spirulina product - all dummy products permanently removed');
                
                // Verify insertion
                const finalCount = await this.get('SELECT COUNT(*) as count FROM products');
                console.log(`🎯 Final product count: ${finalCount.count} (should be 1)`);
                
            } else {
                console.log('⚠️ Products still exist after cleanup - this should not happen');
            }
            
            console.log('✅ Sample data insertion completed - ONLY SPIRULINA PRODUCT EXISTS');
            
        } catch (error) {
            console.error('❌ Error inserting sample data:', error);
            throw error;
        }
    }
    
    // Promisified database methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('❌ Database run error:', err);
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
    
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, result) => {
                if (err) {
                    console.error('❌ Database get error:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    // Health check method
    async healthCheck() {
        try {
            const result = await this.get('SELECT 1 as test');
            return { healthy: true, result };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
    
    // Get database statistics
    async getStats() {
        try {
            const userCount = await this.get('SELECT COUNT(*) as count FROM users');
            const productCount = await this.get('SELECT COUNT(*) as count FROM products');
            const orderCount = await this.get('SELECT COUNT(*) as count FROM orders WHERE 1=1');
            const planCount = await this.get('SELECT COUNT(*) as count FROM subscription_plans');
            
            return {
                users: userCount?.count || 0,
                products: productCount?.count || 0,
                orders: orderCount?.count || 0,
                plans: planCount?.count || 0
            };
        } catch (error) {
            console.error('❌ Database stats error:', error);
            return { error: error.message };
        }
    }
    
    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('📦 Database connection closed');
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                console.log('📦 Database already closed');
                resolve();
            }
        });
    }
}

// Create and export a singleton instance
const database = new Database();
module.exports = database;
