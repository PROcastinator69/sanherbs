-- Create delivery table for shipment tracking
CREATE TABLE IF NOT EXISTS delivery (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    shiprocket_order_id TEXT UNIQUE,
    tracking_id TEXT UNIQUE,
    courier_name TEXT,
    status TEXT DEFAULT 'created' CHECK (status IN (
        'created', 'shipped', 'in_transit', 'out_for_delivery', 
        'delivered', 'returned', 'cancelled', 'lost'
    )),
    current_location TEXT,
    estimated_delivery DATETIME,
    actual_delivery DATETIME,
    pickup_date DATETIME,
    delivery_attempts INTEGER DEFAULT 0,
    remarks TEXT,
    tracking_data TEXT, -- JSON data from courier API
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create tracking_updates table for detailed tracking history
CREATE TABLE IF NOT EXISTS tracking_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    message TEXT,
    timestamp DATETIME NOT NULL,
    courier_update TEXT, -- JSON from courier API
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES delivery(id) ON DELETE CASCADE
);

-- Create shipping_rates table for dynamic pricing
CREATE TABLE IF NOT EXISTS shipping_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_pincode TEXT NOT NULL,
    to_pincode TEXT NOT NULL,
    weight_min DECIMAL(5,2) NOT NULL,
    weight_max DECIMAL(5,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    courier_partner TEXT,
    delivery_days INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_delivery_order_id ON delivery(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_id ON delivery(tracking_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery(status);
CREATE INDEX IF NOT EXISTS idx_delivery_created_at ON delivery(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_delivery_id ON tracking_updates(delivery_id);
CREATE INDEX IF NOT EXISTS idx_tracking_updates_timestamp ON tracking_updates(timestamp);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_pincodes ON shipping_rates(from_pincode, to_pincode);
