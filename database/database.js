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

        // Insert sample data
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
        console.log('📦 Checking for existing data...');
        
        try {
            // Check if products already exist - FIXED VERSION
            const existingProducts = await this.get('SELECT COUNT(*) as count FROM products');
            const productCount = existingProducts && existingProducts.count ? existingProducts.count : 0;
            
            if (productCount > 0) {
                console.log(`📦 Found ${productCount} existing products, skipping sample data insertion...`);
                return;
            }

            console.log('📦 Inserting sample products...');

            // Insert sample products
            const products = [
                {
                    name: 'Premium Immunity Booster',
                    subtitle: '60 Tablets • 1 Month Supply',
                    description: 'Advanced formula with natural ingredients to boost your immune system and overall health.',
                    price: 899,
                    original_price: 1299,
                    category: 'immunity',
                    benefits: JSON.stringify(['🛡️ Immunity Boost', '⚡ Energy Enhancement', '🌿 Natural Ingredients', '🧪 Lab Tested']),
                    is_featured: 1,
                    stock_quantity: 100
                },
                {
                    name: 'Complete Multivitamin',
                    subtitle: '90 Tablets • 3 Month Supply',
                    description: 'Complete daily nutrition with 26 essential vitamins and minerals.',
                    price: 1299,
                    original_price: 1599,
                    category: 'vitamins',
                    benefits: JSON.stringify(['💊 26 Nutrients', '⚡ Daily Energy', '💪 Overall Health', '🌿 Natural Source']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Pure Omega-3 Fish Oil',
                    subtitle: '60 Capsules • 2 Month Supply',
                    description: 'Premium fish oil for heart and brain health support.',
                    price: 799,
                    original_price: 999,
                    category: 'immunity',
                    benefits: JSON.stringify(['❤️ Heart Health', '🧠 Brain Support', '🐟 Pure Fish Oil', '💪 Joint Health']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Vitamin D3 5000 IU',
                    subtitle: '60 Capsules • 2 Month Supply',
                    description: 'High-potency Vitamin D3 for bone health and immunity.',
                    price: 599,
                    original_price: 799,
                    category: 'vitamins',
                    benefits: JSON.stringify(['🦴 Bone Health', '🛡️ Immunity Support', '☀️ High Potency', '💊 Easy Absorption']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Advanced Probiotics',
                    subtitle: '60 Capsules • 2 Month Supply',
                    description: 'Advanced probiotic formula with 50 billion CFU and 10 strains.',
                    price: 1199,
                    original_price: 1499,
                    category: 'immunity',
                    benefits: JSON.stringify(['🦠 50 Billion CFU', '🌿 10 Strains', '💚 Digestive Health', '🛡️ Immune Support']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Magnesium Glycinate',
                    subtitle: '90 Capsules • 3 Month Supply',
                    description: 'Gentle magnesium for sleep support and muscle recovery.',
                    price: 899,
                    original_price: 1099,
                    category: 'minerals',
                    benefits: JSON.stringify(['😴 Sleep Support', '💪 Muscle Recovery', '🌿 Gentle Formula', '⚡ Energy Production']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Organic Ashwagandha',
                    subtitle: '60 Tablets • 2 Month Supply',
                    description: 'Organic ashwagandha for stress relief and energy boost.',
                    price: 749,
                    original_price: 949,
                    category: 'energy',
                    benefits: JSON.stringify(['😌 Stress Relief', '⚡ Energy Boost', '🌿 Organic', '💪 Adaptogenic']),
                    is_featured: 0,
                    stock_quantity: 100
                },
                {
                    name: 'Whey Protein Isolate',
                    subtitle: '500g • 1 Month Supply',
                    description: 'Premium whey protein isolate with 25g protein per serving.',
                    price: 1599,
                    original_price: 1899,
                    category: 'protein',
                    benefits: JSON.stringify(['💪 25g Protein', '🏃‍♂️ Fast Absorption', '🥤 Chocolate Flavor', '🧪 Lab Tested']),
                    is_featured: 0,
                    stock_quantity: 50
                }
            ];

            // Insert products
            for (const product of products) {
                await this.run(
                    `INSERT INTO products (name, subtitle, description, price, original_price, category, benefits, is_featured, stock_quantity, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        product.name, 
                        product.subtitle, 
                        product.description, 
                        product.price, 
                        product.original_price, 
                        product.category, 
                        product.benefits, 
                        product.is_featured, 
                        product.stock_quantity, 
                        1
                    ]
                );
            }

            console.log(`✅ Inserted ${products.length} sample products`);

            // Insert subscription plans
            console.log('📦 Inserting sample subscription plans...');
            
            const plans = [
                {
                    name: 'Starter Plan',
                    description: 'Perfect for beginners to start their health journey',
                    price: 999,
                    duration_months: 1,
                    features: JSON.stringify([
                        '✅ 2 Premium Supplements',
                        '✅ Monthly Delivery',
                        '✅ Free Shipping',
                        '✅ Basic Health Tips',
                        '✅ Email Support'
                    ]),
                    products: JSON.stringify(['Premium Immunity Booster', 'Complete Multivitamin']),
                    is_featured: 0
                },
                {
                    name: 'Premium Plan',
                    description: 'Most popular plan with comprehensive health support',
                    price: 1899,
                    duration_months: 1,
                    features: JSON.stringify([
                        '✅ 4 Premium Supplements',
                        '✅ Monthly Delivery',
                        '✅ Free Express Shipping',
                        '✅ Personalized Health Tips',
                        '✅ Priority Support',
                        '✅ Monthly Consultation',
                        '✅ 15% Extra Discount'
                    ]),
                    products: JSON.stringify(['Premium Immunity Booster', 'Complete Multivitamin', 'Omega-3 Fish Oil', 'Vitamin D3']),
                    is_featured: 1
                },
                {
                    name: 'Elite Plan',
                    description: 'Complete health transformation with premium benefits',
                    price: 2999,
                    duration_months: 1,
                    features: JSON.stringify([
                        '✅ 6 Premium Supplements',
                        '✅ Bi-weekly Delivery',
                        '✅ Same-day Delivery',
                        '✅ Personal Health Coach',
                        '✅ 24/7 Support',
                        '✅ Weekly Consultation',
                        '✅ 25% Extra Discount',
                        '✅ Custom Meal Plans'
                    ]),
                    products: JSON.stringify(['All Premium Supplements', 'Custom Combinations', 'Exclusive Products']),
                    is_featured: 0
                }
            ];

            // Insert plans
            for (const plan of plans) {
                await this.run(
                    `INSERT INTO subscription_plans (name, description, price, duration_months, features, products, is_featured, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        plan.name, 
                        plan.description, 
                        plan.price, 
                        plan.duration_months, 
                        plan.features, 
                        plan.products, 
                        plan.is_featured, 
                        1
                    ]
                );
            }

            console.log(`✅ Inserted ${plans.length} sample subscription plans`);
            console.log('✅ Sample data insertion completed successfully');

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

