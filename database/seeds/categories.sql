-- Product categories for GreenTap Health
-- Note: Categories are stored as text in products table, this is for reference

-- Sample category data that will be used in products
-- Categories: 'vitamins', 'minerals', 'proteins', 'herbal', 'immunity', 'weight-management', 'fitness', 'wellness'

-- You can create a categories table if you want to manage categories separately
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

-- Insert category data
INSERT OR IGNORE INTO categories (id, name, description, slug) VALUES 
('CAT_001', 'Vitamins', 'Essential vitamins for daily health', 'vitamins'),
('CAT_002', 'Minerals', 'Important minerals for body functions', 'minerals'),
('CAT_003', 'Proteins', 'Protein supplements for muscle growth', 'proteins'),
('CAT_004', 'Herbal', 'Natural herbal health supplements', 'herbal'),
('CAT_005', 'Immunity', 'Boost your immune system naturally', 'immunity'),
('CAT_006', 'Weight Management', 'Supplements for healthy weight management', 'weight-management'),
('CAT_007', 'Fitness', 'Pre and post workout supplements', 'fitness'),
('CAT_008', 'Wellness', 'General wellness and health supplements', 'wellness'),
('CAT_009', 'Digestive Health', 'Supplements for better digestion', 'digestive-health'),
('CAT_010', 'Heart Health', 'Cardiovascular health supplements', 'heart-health');
