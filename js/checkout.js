// Checkout Process Management
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
            // Check authentication
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login?redirect=checkout';
                return;
            }

            // Get cart data
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
            
        } catch (error) {
            console.error('Checkout initialization error:', error);
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
                window.location.href = '/cart';
            });
        }
    }

    // Get cart data from localStorage if not available
    getCartFromStorage() {
        const cart = JSON.parse(localStorage.getItem('greentap_cart')) || [];
        if (cart.length === 0) return null;

        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shipping = subtotal > 500 ? 0 : 50;

        return {
            items: cart.map(item => ({
                productId: item.id,
                productName: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity
            })),
            subtotal: subtotal,
            itemCount: cart.reduce((count, item) => count + item.quantity, 0),
            shipping: shipping,
            total: subtotal + shipping
        };
    }

    // Load user data
    async loadUserData() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                // Pre-fill form with user data
                const fields = {
                    'customerName': user.firstName || '',
                    'customerEmail': user.email || '',
                    'customerPhone': user.mobile || ''
                };

                Object.entries(fields).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field && value) {
                        field.value = value;
                    }
                });
            }
        } catch (error) {
            console.error('Load user data error:', error);
        }
    }

    // Display order summary
    displayOrderSummary() {
        const orderSummary = document.getElementById('orderSummary');
        if (!orderSummary || !this.cartData) return;

        orderSummary.innerHTML = `
            <div class="order-summary">
                <h3>Order Summary</h3>
                <div class="order-items">
                    ${this.cartData.items.map(item => `
                        <div class="order-item">
                            <div class="item-info">
                                <span class="item-name">${item.productName}</span>
                                <span class="item-quantity">× ${item.quantity}</span>
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
                        <span>${this.cartData.shipping === 0 ? 'FREE' : '₹' + this.cartData.shipping.toFixed(2)}</span>
                    </div>
                    <div class="total-row final-total">
                        <span>Total</span>
                        <span>₹${this.cartData.total.toFixed(2)}</span>
                    </div>
                </div>
                <button id="editCartBtn" class="btn btn-outline">Edit Cart</button>
            </div>
        `;
    }

    // Show empty cart message
    showEmptyCart() {
        const checkoutContainer = document.querySelector('.checkout-container');
        if (checkoutContainer) {
            checkoutContainer.innerHTML = `
                <div class="empty-checkout">
                    <div class="empty-icon">🛒</div>
                    <h2>Your cart is empty</h2>
                    <p>Add some products to proceed with checkout</p>
                    <a href="/marketplace" class="btn btn-primary">Browse Products</a>
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

    // Update payment method display
    updatePaymentMethodDisplay() {
        const paymentDetails = document.getElementById('paymentMethodDetails');
        if (!paymentDetails) return;

        if (this.selectedPaymentMethod === 'razorpay') {
            paymentDetails.innerHTML = `
                <div class="payment-method-info">
                    <h4>💳 Online Payment</h4>
                    <p>Secure payment via Razorpay</p>
                    <div class="payment-options">
                        <span class="payment-option">💳 Cards</span>
                        <span class="payment-option">🏦 Net Banking</span>
                        <span class="payment-option">📱 UPI</span>
                        <span class="payment-option">💰 Wallets</span>
                    </div>
                </div>
            `;
        } else if (this.selectedPaymentMethod === 'cod') {
            paymentDetails.innerHTML = `
                <div class="payment-method-info">
                    <h4>💵 Cash on Delivery</h4>
                    <p>Pay when your order is delivered</p>
                    <small>COD charges: ₹20 (for orders below ₹500)</small>
                </div>
            `;
        }
    }

    // Process order
    async processOrder() {
        try {
            if (!this.validateForm()) return;

            const formData = this.getFormData();
            this.showProcessing(true);

            if (this.selectedPaymentMethod === 'razorpay') {
                await this.processRazorpayPayment(formData);
            } else {
                await this.processCODOrder(formData);
            }

        } catch (error) {
            console.error('Process order error:', error);
            this.showError('Failed to process order. Please try again.');
            this.showProcessing(false);
        }
    }

    // Validate checkout form
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

    // Get form data
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
            notes: formData.notes || ''
        };
    }

    // Process Razorpay payment
    async processRazorpayPayment(formData) {
        try {
            // Create order on backend
            const response = await fetch('/api/payments/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

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
                name: 'GreenTap Health',
                description: 'Health Supplements Order',
                image: '/images/logo.png',
                order_id: orderData.razorpayOrderId,
                handler: (response) => this.handlePaymentSuccess(response),
                prefill: {
                    name: formData.customerDetails.name,
                    email: formData.customerDetails.email,
                    contact: formData.customerDetails.phone
                },
                notes: {
                    address: `${formData.deliveryAddress.address}, ${formData.deliveryAddress.city}`
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
            console.error('Razorpay payment error:', error);
            throw error;
        }
    }

    // Handle payment success
    async handlePaymentSuccess(response) {
        try {
            this.showProcessing(true, 'Verifying payment...');

            // Verify payment on backend
            const verifyResponse = await fetch('/api/payments/verify-payment', {
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
                if (window.clearCartAfterOrder) {
                    window.clearCartAfterOrder();
                }
                
                window.location.href = `/payment-success?orderId=${this.orderData.orderId}`;
            } else {
                throw new Error('Payment verification failed');
            }

        } catch (error) {
            console.error('Payment verification error:', error);
            this.showError('Payment verification failed. Please contact support.');
            window.location.href = `/payment-failed?orderId=${this.orderData?.orderId}`;
        }
    }

    // Handle payment dismissal
    handlePaymentDismiss() {
        this.showProcessing(false);
        this.showError('Payment cancelled. You can try again.');
    }

    // Process COD order
    async processCODOrder(formData) {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Clear cart and redirect to success page
                if (window.clearCartAfterOrder) {
                    window.clearCartAfterOrder();
                }
                
                window.location.href = `/payment-success?orderId=${result.order.orderNumber}&cod=true`;
            } else {
                throw new Error(result.message || 'Failed to create COD order');
            }

        } catch (error) {
            console.error('COD order error:', error);
            throw error;
        }
    }

    // Validation helpers
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidPhone(phone) {
        return /^[0-9]{10}$/.test(phone);
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
            }, 5000);
        } else {
            alert(message);
        }
    }
}

// Initialize checkout when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/checkout' || window.location.pathname === '/checkout.html') {
        window.checkoutManager = new CheckoutManager();
    }
});

console.log('💳 Checkout system initialized');
