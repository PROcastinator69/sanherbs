// API Configuration for SanHerbs Checkout
const getAPIBaseURL = () => {
    // Development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production - Your actual Render URL
    return 'https://sanherbs.onrender.com';
};

const API_BASE_URL = getAPIBaseURL();

// Checkout Process Management for SanHerbs
class CheckoutManager {
    constructor() {
        this.cartData = null;
        this.selectedPaymentMethod = 'razorpay';
        this.orderData = null;
        this.razorpayInstance = null;
        
        this.initializeCheckout();
        this.bindEvents();
    }

    async initializeCheckout() {
        try {
            console.log('🛒 Initializing SanHerbs checkout...');
            console.log('🔗 API Base URL:', API_BASE_URL);
            
            // Check authentication
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login.html?redirect=checkout';
                return;
            }

            // Get cart data - UPDATED for SanHerbs
            this.cartData = window.getCartData ? window.getCartData() : this.getCartFromStorage();
            
            if (!this.cartData || this.cartData.items.length === 0) {
                this.showEmptyCart();
                return;
            }

            // Load user data
            await this.loadUserData();
            
            // Display order summary
            this.displayOrderSummary();
            
            // Load Razorpay script
            await this.loadRazorpayScript();
            
            console.log('✅ Checkout initialized successfully');
            
        } catch (error) {
            console.error('❌ Checkout initialization error:', error);
            this.showError('Failed to initialize checkout. Please try again.');
        }
    }

    bindEvents() {
        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.name === 'paymentMethod') {
                this.selectedPaymentMethod = e.target.value;
                this.updatePaymentMethodDisplay();
            }
        });

        // Place order button
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', () => this.processOrder());
        }

        // Form validation
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processOrder();
            });
        }

        // Edit cart button
        const editCartBtn = document.getElementById('editCartBtn');
        if (editCartBtn) {
            editCartBtn.addEventListener('click', () => {
                window.location.href = '/cart.html';
            });
        }

        // Apply coupon functionality
        const applyCouponBtn = document.getElementById('applyCouponBtn');
        if (applyCouponBtn) {
            applyCouponBtn.addEventListener('click', () => this.applyCoupon());
        }
    }

    // Get cart data from localStorage - UPDATED for SanHerbs
    getCartFromStorage() {
        const cart = JSON.parse(localStorage.getItem('sanherbs_cart')) || 
                     JSON.parse(localStorage.getItem('greentap_cart')) || 
                     JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cart.length === 0) return null;

        const subtotal = cart.reduce((total, item) => total + (parseFloat(item.price) * parseInt(item.quantity)), 0);
        const shipping = subtotal >= 500 ? 0 : 50;

        return {
            items: cart.map(item => ({
                productId: item.id,
                productName: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                total: parseFloat(item.price) * parseInt(item.quantity),
                image: item.image,
                category: item.category
            })),
            subtotal: subtotal,
            itemCount: cart.reduce((count, item) => count + parseInt(item.quantity), 0),
            shipping: shipping,
            total: subtotal + shipping
        };
    }

    // Load user data - ENHANCED for SanHerbs
    async loadUserData() {
        try {
            // Try to get fresh user data from backend
            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            let user = null;
            if (response.ok) {
                const result = await response.json();
                user = result.user;
                localStorage.setItem('user', JSON.stringify(user));
            } else {
                // Fallback to localStorage
                user = JSON.parse(localStorage.getItem('user'));
            }

            if (user) {
                // Pre-fill form with user data
                const fields = {
                    'customerName': user.firstName || user.name || '',
                    'customerEmail': user.email || '',
                    'customerPhone': user.mobile || user.phone || ''
                };

                Object.entries(fields).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field && value) {
                        field.value = value;
                    }
                });
            }
        } catch (error) {
            console.error('❌ Load user data error:', error);
            // Continue with localStorage data
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (user.mobile) {
                const phoneField = document.getElementById('customerPhone');
                if (phoneField) phoneField.value = user.mobile;
            }
        }
    }

    // Display order summary - ENHANCED for SanHerbs
    displayOrderSummary() {
        const orderSummary = document.getElementById('orderSummary');
        if (!orderSummary || !this.cartData) return;

        orderSummary.innerHTML = `
            <div class="order-summary">
                <h3>🛒 Order Summary</h3>
                <div class="order-items">
                    ${this.cartData.items.map(item => `
                        <div class="order-item">
                            <div class="item-info">
                                <div class="item-image">
                                    ${item.image && item.image !== '/images/products/default.jpg' ? 
                                        `<img src="${item.image}" alt="${item.productName}" width="40" height="40">` : 
                                        '💊'
                                    }
                                </div>
                                <div class="item-details">
                                    <span class="item-name">${item.productName}</span>
                                    <span class="item-quantity">× ${item.quantity}</span>
                                    <span class="item-category">${item.category || 'supplement'}</span>
                                </div>
                            </div>
                            <span class="item-price">₹${item.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-totals">
                    <div class="total-row">
                        <span>Subtotal (${this.cartData.itemCount} items)</span>
                        <span>₹${this.cartData.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping</span>
                        <span>${this.cartData.shipping === 0 ? 'FREE 🎉' : '₹' + this.cartData.shipping.toFixed(2)}</span>
                    </div>
                    ${this.cartData.shipping === 0 ? 
                        '<div class="free-shipping-note">🎉 You saved ₹50 on shipping!</div>' : 
                        `<div class="shipping-note">💡 Add ₹${(500 - this.cartData.subtotal).toFixed(2)} more for free shipping!</div>`
                    }
                    <div class="total-row final-total">
                        <span><strong>Total</strong></span>
                        <span><strong>₹${this.cartData.total.toFixed(2)}</strong></span>
                    </div>
                </div>
                
                <div class="order-actions">
                    <button id="editCartBtn" class="btn btn-outline">✏️ Edit Cart</button>
                </div>
            </div>
        `;
    }

    // Show empty cart message - UPDATED for SanHerbs
    showEmptyCart() {
        const checkoutContainer = document.querySelector('.checkout-container');
        if (checkoutContainer) {
            checkoutContainer.innerHTML = `
                <div class="empty-checkout">
                    <div class="empty-icon">🛒</div>
                    <h2>Your cart is empty</h2>
                    <p>Add some health supplements to proceed with checkout</p>
                    <div class="empty-actions">
                        <a href="/marketplace.html" class="btn btn-primary">🌿 Browse Products</a>
                        <a href="/plans.html" class="btn btn-secondary">📋 View Plans</a>
                    </div>
                </div>
            `;
        }
    }

    // Load Razorpay script
    loadRazorpayScript() {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Update payment method display - ENHANCED
    updatePaymentMethodDisplay() {
        const paymentDetails = document.getElementById('paymentMethodDetails');
        if (!paymentDetails) return;

        if (this.selectedPaymentMethod === 'razorpay') {
            paymentDetails.innerHTML = `
                <div class="payment-method-info">
                    <h4>💳 Secure Online Payment</h4>
                    <p>Pay securely via Razorpay - India's most trusted payment gateway</p>
                    <div class="payment-options">
                        <span class="payment-option">💳 Credit/Debit Cards</span>
                        <span class="payment-option">🏦 Net Banking</span>
                        <span class="payment-option">📱 UPI (Google Pay, PhonePe, Paytm)</span>
                        <span class="payment-option">💰 Digital Wallets</span>
                    </div>
                    <div class="security-note">
                        🔒 256-bit SSL encryption ensures your payment is 100% secure
                    </div>
                </div>
            `;
        } else if (this.selectedPaymentMethod === 'cod') {
            paymentDetails.innerHTML = `
                <div class="payment-method-info">
                    <h4>💵 Cash on Delivery</h4>
                    <p>Pay when your order is delivered to your doorstep</p>
                    <div class="cod-info">
                        <div class="cod-note">📦 Available for orders above ₹200</div>
                        <div class="cod-charges">💰 COD charges: ₹20 (for orders below ₹500)</div>
                    </div>
                </div>
            `;
        } else if (this.selectedPaymentMethod === 'upi') {
            paymentDetails.innerHTML = `
                <div class="payment-method-info">
                    <h4>📱 Direct UPI Payment</h4>
                    <p>Pay directly to our UPI ID - Zero transaction fees</p>
                    <div class="upi-info">
                        <div class="upi-id">🔗 sanherbs@paytm</div>
                        <div class="upi-note">💡 Please include your order number in payment description</div>
                    </div>
                </div>
            `;
        }
    }

    // Process order - ENHANCED with better error handling
    async processOrder() {
        try {
            if (!this.validateForm()) return;

            const formData = this.getFormData();
            this.showProcessing(true);

            console.log('🔄 Processing order with method:', this.selectedPaymentMethod);

            if (this.selectedPaymentMethod === 'razorpay') {
                await this.processRazorpayPayment(formData);
            } else if (this.selectedPaymentMethod === 'upi') {
                await this.processUPIPayment(formData);
            } else if (this.selectedPaymentMethod === 'cod') {
                await this.processCODOrder(formData);
            }

        } catch (error) {
            console.error('❌ Process order error:', error);
            
            if (error.message.includes('Cannot connect to server')) {
                this.showError(`Cannot connect to server. Backend URL: ${API_BASE_URL}`);
            } else {
                this.showError(error.message || 'Failed to process order. Please try again.');
            }
            
            this.showProcessing(false);
        }
    }

    // Validate checkout form - ENHANCED
    validateForm() {
        const requiredFields = [
            'customerName', 'customerEmail', 'customerPhone',
            'address', 'city', 'state', 'pincode'
        ];

        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                const value = field.value.trim();
                
                if (!value) {
                    this.showFieldError(field, 'This field is required');
                    isValid = false;
                } else {
                    this.clearFieldError(field);
                    
                    // Specific validations
                    if (fieldId === 'customerEmail' && !this.isValidEmail(value)) {
                        this.showFieldError(field, 'Please enter a valid email');
                        isValid = false;
                    }
                    
                    if (fieldId === 'customerPhone' && !this.isValidPhone(value)) {
                        this.showFieldError(field, 'Please enter a valid 10-digit phone number');
                        isValid = false;
                    }
                    
                    if (fieldId === 'pincode' && !this.isValidPincode(value)) {
                        this.showFieldError(field, 'Please enter a valid 6-digit pincode');
                        isValid = false;
                    }
                }
            }
        });

        return isValid;
    }

    // Get form data - ENHANCED
    getFormData() {
        const formElements = document.getElementById('checkoutForm').elements;
        const formData = {};

        for (let element of formElements) {
            if (element.name && element.value) {
                formData[element.name] = element.value.trim();
            }
        }

        return {
            items: this.cartData.items,
            deliveryAddress: {
                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode
            },
            customerDetails: {
                name: formData.customerName,
                email: formData.customerEmail,
                phone: formData.customerPhone
            },
            contactNumber: formData.customerPhone,
            paymentMethod: this.selectedPaymentMethod,
            amount: this.cartData.total,
            subtotal: this.cartData.subtotal,
            shipping: this.cartData.shipping,
            itemCount: this.cartData.itemCount,
            notes: formData.notes || '',
            timestamp: new Date().toISOString()
        };
    }

    // Process Razorpay payment - UPDATED API URL
    async processRazorpayPayment(formData) {
        try {
            console.log('💳 Processing Razorpay payment...');
            
            // Create order on backend
            const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const orderData = await response.json();
            
            if (!orderData.success) {
                throw new Error(orderData.message || 'Failed to create payment order');
            }

            this.orderData = orderData;

            // Initialize Razorpay checkout
            const options = {
                key: orderData.razorpayKeyId,
                amount: orderData.amount * 100, // Convert to paise
                currency: 'INR',
                name: 'SanHerbs',
                description: 'Premium Health Supplements',
                image: '/images/logo.png',
                order_id: orderData.razorpayOrderId,
                handler: (response) => this.handlePaymentSuccess(response),
                prefill: {
                    name: formData.customerDetails.name,
                    email: formData.customerDetails.email,
                    contact: formData.customerDetails.phone
                },
                notes: {
                    address: `${formData.deliveryAddress.address}, ${formData.deliveryAddress.city}`,
                    items: this.cartData.itemCount
                },
                theme: {
                    color: '#4caf50'
                },
                modal: {
                    ondismiss: () => this.handlePaymentDismiss()
                }
            };

            this.razorpayInstance = new window.Razorpay(options);
            this.razorpayInstance.open();

        } catch (error) {
            console.error('❌ Razorpay payment error:', error);
            throw error;
        }
    }

    // NEW: Process UPI payment
    async processUPIPayment(formData) {
        try {
            console.log('📱 Processing UPI payment...');
            
            // Create UPI order on backend
            const response = await fetch(`${API_BASE_URL}/api/payments/create-upi-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const orderData = await response.json();
            
            if (orderData.success) {
                // Store order data for manual verification
                localStorage.setItem('pendingUPIOrder', JSON.stringify(orderData));
                
                // Redirect to UPI payment page
                window.location.href = `/upi-payment.html?orderId=${orderData.orderId}`;
            } else {
                throw new Error(orderData.message || 'Failed to create UPI order');
            }

        } catch (error) {
            console.error('❌ UPI payment error:', error);
            throw error;
        }
    }

    // Handle payment success - UPDATED API URL
    async handlePaymentSuccess(response) {
        try {
            this.showProcessing(true, 'Verifying payment...');
            
            console.log('✅ Payment successful, verifying...');
            
            // Verify payment on backend
            const verifyResponse = await fetch(`${API_BASE_URL}/api/payments/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    orderId: this.orderData.orderId
                })
            });

            const verificationResult = await verifyResponse.json();
            
            if (verificationResult.success) {
                // Clear cart and redirect to success page
                this.clearCartAfterOrder();
                
                console.log('🎉 Payment verified successfully');
                window.location.href = `/payment-success.html?orderId=${this.orderData.orderId}`;
            } else {
                throw new Error('Payment verification failed');
            }

        } catch (error) {
            console.error('❌ Payment verification error:', error);
            this.showError('Payment verification failed. Please contact support.');
            window.location.href = `/payment-failed.html?orderId=${this.orderData?.orderId}`;
        }
    }

    // Handle payment dismissal
    handlePaymentDismiss() {
        this.showProcessing(false);
        this.showError('Payment cancelled. You can try again.');
    }

    // Process COD order - UPDATED API URL
    async processCODOrder(formData) {
        try {
            console.log('💵 Processing COD order...');
            
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Clear cart and redirect to success page
                this.clearCartAfterOrder();
                
                console.log('✅ COD order created successfully');
                window.location.href = `/payment-success.html?orderId=${result.order.orderNumber}&cod=true`;
            } else {
                throw new Error(result.message || 'Failed to create COD order');
            }

        } catch (error) {
            console.error('❌ COD order error:', error);
            throw error;
        }
    }

    // NEW: Apply coupon functionality
    async applyCoupon() {
        const couponCode = document.getElementById('couponCode')?.value?.trim();
        if (!couponCode) {
            this.showError('Please enter a coupon code');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/coupons/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    couponCode: couponCode,
                    orderAmount: this.cartData.total
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Update order total with discount
                this.cartData.discount = result.discount;
                this.cartData.total = this.cartData.total - result.discount;
                this.displayOrderSummary();
                this.showSuccess(`Coupon applied! You saved ₹${result.discount}`);
            } else {
                this.showError(result.message || 'Invalid coupon code');
            }

        } catch (error) {
            console.error('❌ Coupon error:', error);
            this.showError('Failed to apply coupon');
        }
    }

    // Clear cart after successful order
    clearCartAfterOrder() {
        localStorage.removeItem('sanherbs_cart');
        localStorage.removeItem('greentap_cart');
        localStorage.removeItem('cart');
        localStorage.removeItem('checkoutCart');
        
        // Update cart count if shopping cart instance exists
        if (window.shoppingCart) {
            window.shoppingCart.cart = [];
            window.shoppingCart.updateCartBadge();
        }
    }

    // Validation helpers
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^[0-9]{10}$/.test(phone.replace(/\D/g, ''));
    }

    isValidPincode(pincode) {
        return /^[1-9][0-9]{5}$/.test(pincode);
    }

    // Form error handling
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // Show processing state
    showProcessing(show, message = 'Processing order...') {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (!placeOrderBtn) return;

        if (show) {
            placeOrderBtn.innerHTML = `
                <span class="spinner"></span>
                ${message}
            `;
            placeOrderBtn.disabled = true;
        } else {
            placeOrderBtn.innerHTML = '🛒 Place Order';
            placeOrderBtn.disabled = false;
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('checkoutError');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    ${message}
                </div>
            `;
            errorDiv.style.display = 'block';
            
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 8000);
        } else {
            alert(message);
        }
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.getElementById('checkoutSuccess');
        if (successDiv) {
            successDiv.innerHTML = `
                <div class="success-message">
                    <span class="success-icon">✅</span>
                    ${message}
                </div>
            `;
            successDiv.style.display = 'block';
            
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize checkout when DOM is loaded - FIXED COMPARISON
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/checkout' || window.location.pathname === '/checkout.html') {
        window.checkoutManager = new CheckoutManager();
        console.log('✅ SanHerbs checkout system initialized');
    }
});

// Global functions for cart integration
window.getCartData = function() {
    if (window.shoppingCart) {
        return window.shoppingCart.getCheckoutData();
    }
    return null;
};

window.clearCartAfterOrder = function() {
    if (window.checkoutManager) {
        window.checkoutManager.clearCartAfterOrder();
    }
};

console.log('💳 SanHerbs checkout system loaded');
