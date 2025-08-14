-- Create users table (FIXED VERSION)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Changed from TEXT to INTEGER AUTOINCREMENT
    mobile TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    dateOfBirth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    mobile_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on mobile for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create products table (FIXED VERSION)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Changed from TEXT to INTEGER AUTOINCREMENT
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    benefits TEXT, -- JSON array of benefits
    ingredients TEXT, -- JSON array of ingredients
    image_url TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
