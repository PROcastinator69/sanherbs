-- Sample products for GreenTap Health marketplace
INSERT OR IGNORE INTO products (
    id, name, subtitle, description, price, category, stock_quantity, 
    benefits, ingredients, is_featured, is_active
) VALUES 

-- Vitamins Category
('PROD_001', 'Vitamin D3 Tablets', 'Sunshine Vitamin for Bone Health', 'High-potency Vitamin D3 supplement to support bone health, immune function, and overall wellness. Each tablet provides 2000 IU of Vitamin D3.', 299.00, 'vitamins', 150, 
'["Supports bone health", "Boosts immune system", "Improves calcium absorption", "Enhances muscle function"]', 
'["Vitamin D3 (Cholecalciferol) 2000 IU", "Microcrystalline Cellulose", "Magnesium Stearate"]', 1, 1),

('PROD_002', 'Vitamin B Complex', 'Energy & Nervous System Support', 'Complete B-vitamin complex to support energy metabolism, nervous system function, and red blood cell formation.', 399.00, 'vitamins', 200, 
'["Increases energy levels", "Supports nervous system", "Improves metabolism", "Reduces fatigue"]', 
'["Vitamin B1", "Vitamin B2", "Vitamin B6", "Vitamin B12", "Folic Acid", "Biotin"]', 1, 1),

('PROD_003', 'Vitamin C 1000mg', 'Immune System Booster', 'High-potency Vitamin C tablets to boost immune system and provide antioxidant protection.', 249.00, 'vitamins', 180, 
'["Boosts immune system", "Antioxidant protection", "Supports collagen synthesis", "Enhances iron absorption"]', 
'["Ascorbic Acid 1000mg", "Rose Hip Extract", "Citrus Bioflavonoids"]', 1, 1),

-- Minerals Category
('PROD_004', 'Calcium Magnesium Zinc', 'Bone & Muscle Health', 'Essential mineral combination for strong bones, healthy muscles, and proper nerve function.', 449.00, 'minerals', 120, 
'["Strengthens bones", "Supports muscle function", "Improves nerve transmission", "Enhances immune function"]', 
'["Calcium Carbonate 500mg", "Magnesium Oxide 250mg", "Zinc Gluconate 15mg"]', 1, 1),

('PROD_005', 'Iron Complex', 'Blood Health Support', 'Gentle iron supplement with Vitamin C for better absorption and blood health support.', 319.00, 'minerals', 100, 
'["Prevents iron deficiency", "Supports red blood cell formation", "Reduces fatigue", "Improves oxygen transport"]', 
'["Ferrous Fumarate 18mg", "Vitamin C 100mg", "Folic Acid"]', 0, 1),

-- Proteins Category
('PROD_006', 'Whey Protein Isolate', 'Pure Muscle Building Protein', 'Premium whey protein isolate with 90% protein content for muscle building and recovery.', 1899.00, 'proteins', 80, 
'["Builds lean muscle", "Fast absorption", "Low carbs and fats", "Supports recovery"]', 
'["Whey Protein Isolate", "Natural Flavors", "Stevia Extract", "Lecithin"]', 1, 1),

('PROD_007', 'Plant Protein Powder', 'Vegan Protein Blend', 'Complete plant-based protein with all essential amino acids from pea, rice, and hemp proteins.', 1599.00, 'proteins', 60, 
'["100% plant-based", "Complete amino profile", "Easy to digest", "Sustainable source"]', 
'["Pea Protein", "Rice Protein", "Hemp Protein", "Natural Vanilla"]', 1, 1),

-- Herbal Category
('PROD_008', 'Ashwagandha Extract', 'Stress Relief & Energy', 'Standardized ashwagandha root extract to help manage stress and boost natural energy levels.', 599.00, 'herbal', 150, 
'["Reduces stress", "Boosts energy", "Improves focus", "Supports adrenal function"]', 
'["Ashwagandha Root Extract 500mg", "Withanolides 5%", "Vegetable Capsule"]', 1, 1),

('PROD_009', 'Turmeric Curcumin', 'Anti-inflammatory Support', 'High-potency turmeric extract with black pepper for maximum absorption and anti-inflammatory benefits.', 549.00, 'herbal', 200, 
'["Anti-inflammatory", "Antioxidant protection", "Supports joint health", "Enhances immunity"]', 
'["Turmeric Extract 500mg", "Curcumin 95%", "Black Pepper Extract", "Ginger"]', 1, 1),

('PROD_010', 'Moringa Leaf Powder', 'Superfood Nutrient Dense', 'Pure moringa leaf powder packed with vitamins, minerals, and antioxidants.', 399.00, 'herbal', 100, 
'["Nutrient dense superfood", "Rich in antioxidants", "Supports energy", "Boosts immunity"]', 
'["Organic Moringa Leaf Powder", "No additives", "No preservatives"]', 0, 1),

-- Immunity Category
('PROD_011', 'Immunity Booster', 'Complete Immune Support', 'Comprehensive immune system support with Vitamin C, Zinc, Elderberry, and Echinacea.', 699.00, 'immunity', 120, 
'["Strengthens immune system", "Fights infections", "Reduces cold duration", "Antioxidant support"]', 
'["Vitamin C 1000mg", "Zinc 15mg", "Elderberry Extract", "Echinacea", "Probiotics"]', 1, 1),

('PROD_012', 'Probiotics Complex', 'Gut Health & Immunity', 'Multi-strain probiotic formula with 50 billion CFU for digestive and immune health.', 899.00, 'immunity', 90, 
'["Supports digestive health", "Boosts immunity", "Improves gut flora", "Enhances nutrient absorption"]', 
'["Lactobacillus", "Bifidobacterium", "Prebiotic Fiber", "Vegetable Capsule"]', 1, 1),

-- Weight Management Category
('PROD_013', 'Green Coffee Bean Extract', 'Natural Fat Burner', 'Pure green coffee bean extract with chlorogenic acid for natural weight management support.', 799.00, 'weight-management', 80, 
'["Supports weight loss", "Boosts metabolism", "Burns fat naturally", "Provides energy"]', 
'["Green Coffee Bean Extract 800mg", "Chlorogenic Acid 45%", "Vegetable Capsule"]', 1, 1),

('PROD_014', 'Garcinia Cambogia', 'Appetite Control', 'Natural appetite suppressant and fat blocker with 60% HCA (Hydroxycitric Acid).', 649.00, 'weight-management', 100, 
'["Controls appetite", "Blocks fat production", "Supports weight loss", "Improves mood"]', 
'["Garcinia Cambogia Extract 1000mg", "HCA 60%", "Calcium", "Potassium"]', 0, 1),

-- Fitness Category
('PROD_015', 'Pre-Workout Energy', 'Maximum Performance', 'High-energy pre-workout formula with caffeine, creatine, and amino acids for peak performance.', 1299.00, 'fitness', 70, 
'["Increases energy", "Enhances performance", "Improves focus", "Builds muscle"]', 
'["Caffeine 200mg", "Creatine Monohydrate", "Beta-Alanine", "L-Citrulline", "Taurine"]', 1, 1),

('PROD_016', 'BCAA Recovery', 'Post Workout Recovery', 'Essential branched-chain amino acids for muscle recovery and reduced soreness.', 999.00, 'fitness', 85, 
'["Faster muscle recovery", "Reduces soreness", "Prevents muscle breakdown", "Improves endurance"]', 
'["L-Leucine", "L-Isoleucine", "L-Valine", "Electrolytes", "Natural Flavors"]', 1, 1),

-- Wellness Category
('PROD_017', 'Omega-3 Fish Oil', 'Heart & Brain Health', 'Pure fish oil with EPA and DHA for cardiovascular and cognitive health support.', 899.00, 'wellness', 110, 
'["Supports heart health", "Improves brain function", "Reduces inflammation", "Enhances mood"]', 
'["Fish Oil 1000mg", "EPA 300mg", "DHA 200mg", "Vitamin E", "Softgel Capsule"]', 1, 1),

('PROD_018', 'Multivitamin Complete', 'Daily Nutritional Support', 'Comprehensive multivitamin and mineral formula for complete daily nutrition.', 599.00, 'wellness', 200, 
'["Complete nutrition", "Fills nutritional gaps", "Boosts energy", "Supports overall health"]', 
'["25+ Vitamins & Minerals", "Antioxidants", "Herbal Extracts", "Amino Acids"]', 1, 1),

-- Additional Products
('PROD_019', 'Melatonin Sleep Support', 'Natural Sleep Aid', 'Natural melatonin supplement for better sleep quality and sleep cycle regulation.', 449.00, 'wellness', 90, 
'["Improves sleep quality", "Regulates sleep cycle", "Non-habit forming", "Natural and safe"]', 
'["Melatonin 3mg", "L-Theanine", "Chamomile Extract", "Magnesium"]', 0, 1),

('PROD_020', 'Collagen Peptides', 'Skin & Joint Health', 'Hydrolyzed collagen peptides for healthy skin, hair, nails, and joint support.', 1199.00, 'wellness', 75, 
'["Improves skin elasticity", "Strengthens hair and nails", "Supports joint health", "Anti-aging benefits"]', 
'["Hydrolyzed Collagen Peptides", "Vitamin C", "Hyaluronic Acid", "Biotin"]', 1, 1);
