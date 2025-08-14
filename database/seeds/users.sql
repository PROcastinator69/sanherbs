-- Sample users for testing
INSERT OR IGNORE INTO users (
    id, mobile, password, firstName, lastName, email, 
    role, is_active, mobile_verified, created_at
) VALUES 
-- Test user accounts (password: test123)
('USER_001', '9876543210', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Rahul', 'Sharma', 'rahul@example.com', 'user', 1, 1, datetime('now')),
('USER_002', '9876543211', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Priya', 'Patel', 'priya@example.com', 'user', 1, 1, datetime('now')),
('USER_003', '9876543212', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Amit', 'Kumar', 'amit@example.com', 'user', 1, 1, datetime('now')),
('USER_004', '9876543213', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sneha', 'Gupta', 'sneha@example.com', 'user', 1, 1, datetime('now')),
('USER_005', '9876543214', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Vikram', 'Singh', 'vikram@example.com', 'user', 1, 1, datetime('now')),

-- Admin user (password: admin123)
('ADMIN_001', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin@greentaphealth.com', 'admin', 1, 1, datetime('now')),

-- Demo users for different scenarios
('DEMO_001', '1234567890', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'Customer', 'demo@example.com', 'user', 1, 1, datetime('now')),
('DEMO_002', '9988776655', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Buyer', 'test@example.com', 'user', 1, 1, datetime('now'));

-- Note: All passwords are hashed versions of 'test123' or 'admin123'
-- In a real application, these would be properly hashed with bcrypt
