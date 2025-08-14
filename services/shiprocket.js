const axios = require('axios');

class ShiprocketService {
    constructor() {
        // Fixed with fallback URL
        this.baseURL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null; // Track token expiry
    }

    // Enhanced authentication with token refresh
    async authenticate() {
        try {
            // Check if token is still valid (10 days expiry)
            if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
                console.log('✅ Using cached Shiprocket token');
                return { success: true, token: this.token };
            }

            console.log('🔐 Authenticating with Shiprocket...');
            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_PASSWORD
            });

            this.token = response.data.token;
            // Set token expiry to 10 days from now (Shiprocket token validity)
            this.tokenExpiry = new Date(Date.now() + (10 * 24 * 60 * 60 * 1000));
            
            console.log('✅ Shiprocket authentication successful');
            return { success: true, token: this.token };
        } catch (error) {
            console.error('❌ Shiprocket authentication error:', error.response?.data || error.message);
            
            // Clear invalid token
            this.token = null;
            this.tokenExpiry = null;
            
            return { success: false, error: error.response?.data?.message || error.message };
        }
    }

    // Enhanced order creation with validation
    async createOrder(orderDetails) {
        try {
            if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            // Validate address length (Shiprocket requirement)
            if (orderDetails.address && orderDetails.address.length > 190) {
                throw new Error('Address cannot be longer than 190 characters');
            }

            if (orderDetails.address && orderDetails.address.length < 3) {
                throw new Error('Address cannot be shorter than 3 characters');
            }

            // Enhanced shipping data with proper validation
            const shippingData = {
                order_id: orderDetails.orderId,
                order_date: new Date().toISOString().split('T')[0],
                pickup_location: "Primary",
                billing_customer_name: orderDetails.customerName || orderDetails.billing_customer_name,
                billing_last_name: orderDetails.lastName || "",
                billing_address: orderDetails.address || orderDetails.billing_address,
                billing_city: orderDetails.city || orderDetails.billing_city,
                billing_pincode: orderDetails.pincode || orderDetails.billing_pincode,
                billing_state: orderDetails.state || orderDetails.billing_state,
                billing_country: "India",
                billing_email: orderDetails.email || orderDetails.billing_email,
                billing_phone: orderDetails.phone || orderDetails.billing_phone,
                shipping_is_billing: true,
                order_items: orderDetails.items.map(item => ({
                    name: item.name,
                    sku: item.sku || item.name.replace(/\s+/g, '-').toLowerCase(),
                    units: item.quantity,
                    selling_price: parseFloat(item.price) // Ensure price is number
                })),
                payment_method: "Prepaid",
                shipping_charges: orderDetails.shipping_charges || 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: orderDetails.discount || 0,
                sub_total: parseFloat(orderDetails.amount), // Ensure amount is number
                // Dynamic dimensions based on order or defaults
                length: orderDetails.dimensions?.length || 15,
                breadth: orderDetails.dimensions?.breadth || 10,
                height: orderDetails.dimensions?.height || 5,
                weight: orderDetails.dimensions?.weight || 0.5
            };

            console.log('📦 Creating Shiprocket order:', shippingData.order_id);

            const response = await axios.post(`${this.baseURL}/orders/create/adhoc`, shippingData, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Shiprocket order created successfully:', response.data);
            return { 
                success: true, 
                data: response.data,
                shipment_id: response.data.shipment_id,
                order_id: response.data.order_id
            };
        } catch (error) {
            console.error('❌ Shiprocket order creation error:', error.response?.data || error.message);
            
            // If token expired, clear it for next attempt
            if (error.response?.status === 401) {
                this.token = null;
                this.tokenExpiry = null;
            }
            
            return { 
                success: false, 
                error: error.response?.data?.message || error.message,
                details: error.response?.data
            };
        }
    }

    // Enhanced tracking with better error handling
    async trackShipment(shipmentId) {
        try {
            if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            const response = await axios.get(`${this.baseURL}/courier/track/shipment/${shipmentId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('📍 Shipment tracking data retrieved:', response.data);
            return { success: true, tracking: response.data };
        } catch (error) {
            console.error('❌ Shipment tracking error:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                this.token = null;
                this.tokenExpiry = null;
            }
            
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    // Enhanced shipping rates with validation
    async getShippingRates(pickupPostcode, deliveryPostcode, weight, cod = 0) {
        try {
            if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            // Validate postcodes (6 digits for India)
            if (!/^[0-9]{6}$/.test(pickupPostcode)) {
                throw new Error('Pickup postcode must be 6 digits');
            }
            
            if (!/^[0-9]{6}$/.test(deliveryPostcode)) {
                throw new Error('Delivery postcode must be 6 digits');
            }

            const response = await axios.get(`${this.baseURL}/courier/serviceability`, {
                params: {
                    pickup_postcode: pickupPostcode,
                    delivery_postcode: deliveryPostcode,
                    weight: parseFloat(weight),
                    cod: parseInt(cod)
                },
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            console.log('💰 Shipping rates retrieved successfully');
            return { success: true, rates: response.data };
        } catch (error) {
            console.error('❌ Shipping rates error:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                this.token = null;
                this.tokenExpiry = null;
            }
            
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    // New method: Cancel shipment
    async cancelShipment(awb) {
        try {
            if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            const response = await axios.post(`${this.baseURL}/orders/cancel/shipment/awbs`, {
                awbs: [awb]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('❌ Shipment cancelled:', awb);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ Shipment cancellation error:', error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }

    // New method: Get pickup locations
    async getPickupLocations() {
        try {
            if (!this.token || (this.tokenExpiry && new Date() >= this.tokenExpiry)) {
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    throw new Error(`Authentication failed: ${authResult.error}`);
                }
            }

            const response = await axios.get(`${this.baseURL}/settings/company/pickup`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return { success: true, locations: response.data };
        } catch (error) {
            console.error('❌ Get pickup locations error:', error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data?.message || error.message 
            };
        }
    }
}

module.exports = new ShiprocketService();
