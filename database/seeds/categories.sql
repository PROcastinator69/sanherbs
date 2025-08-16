-- Product categories for SanHerbs Food Supplements
-- Note: Categories are stored as text in products table, this is for reference
-- Sample category data that will be used in products
-- Categories: 'food supplement', 'organic', 'spirulina', 'natural', 'dietary supplements'

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    parent_id TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Clear existing categories and insert food supplement categories
DELETE FROM categories;

-- Insert food supplement category data
INSERT OR IGNORE INTO categories (id, name, description, slug, display_order) VALUES 
('CAT_001', 'Food Supplements', 'FSSAI certified dietary food supplements', 'food-supplements', 1),
('CAT_002', 'Organic Products', 'Certified organic food supplements', 'organic', 2),
('CAT_003', 'Spirulina', 'Premium Spirulina food supplements', 'spirulina', 3),
('CAT_004', 'Natural Supplements', 'Natural dietary food supplements', 'natural', 4),
('CAT_005', 'Plant Protein', 'Plant-based protein food supplements', 'plant-protein', 5),
('CAT_006', 'Immunity Support', 'Natural immunity supporting food supplements', 'immunity-support', 6),
('CAT_007', 'Wellness', 'General wellness food supplements', 'wellness', 7),
('CAT_008', 'Nutraceuticals', 'Science-backed nutraceutical products', 'nutraceuticals', 8),
('CAT_009', 'Dietary Supplements', 'FSSAI approved dietary supplements', 'dietary-supplements', 9),
('CAT_010', 'Nutritional Support', 'Daily nutritional support supplements', 'nutritional-support', 10);
