

// Shopping Cart Management for SanHerbs
class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
        this.initializeCart();
        this.bindEvents();
    }

    // Fixed cart loading with validation
    loadCart() {
        try {
            // FIXED: Remove escaped underscores
            const cartData = localStorage.getItem('sanherbs_cart') || localStorage.getItem('greentap_cart') || localStorage.getItem('cart');
            const cart = cartData ? JSON.parse(cartData) : [];
            
            // Validate and clean cart data
            return cart.filter(item => item && item.price && item.name).map(item => ({
                id: item.id || `item_${Date.now()}_${Math.random()}`,
                name: item.name || 'Unknown Product',
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                image: item.image || '/images/products/default.jpg',
                category: item.category || 'supplements',
                addedAt: item.addedAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    initializeCart() {
        // Force proper page styling
        this.ensureCartStyling();
        this.updateCartDisplay();
        this.updateCartBadge();
        
        // Load fresh product data from backend if available
        this.syncCartWithBackend();
    }

    // NEW: Sync cart with backend product data
    async syncCartWithBackend() {
        if (this.cart.length === 0) return;
        try {
            // Get fresh product data from backend
            const response = await fetch(`${API_BASE_URL}/api/products`);
            if (response.ok) {
                const result = await response.json();
                const products = result.products || result.data?.products || [];
                
                // Update cart items with fresh data
                this.cart = this.cart.map(cartItem => {
                    const freshProduct = products.find(p => p.id === cartItem.id);
                    if (freshProduct) {
                        return {
                            ...cartItem,
                            name: freshProduct.name,
                            price: freshProduct.price,
                            image: freshProduct.image,
                            category: freshProduct.category
                        };
                    }
                    return cartItem;
                });
                
                this.saveCart();
                this.updateCartDisplay();
            }
        } catch (error) {
            console.error('Error syncing cart with backend:', error);
            // Continue with cached cart data
        }
    }

    // NEW: Ensure proper cart styling
    ensureCartStyling() {
        // Add cart page class for consistent styling
        if (document.getElementById('cartItems')) {
            document.body.classList.add('cart-page');
            
            // Force style recalculation after a brief delay
            setTimeout(() => {
                const cartContainer = document.querySelector('.cart-container');
                if (cartContainer) {
                    cartContainer.style.opacity = '0';
                    cartContainer.offsetHeight; // Force reflow
                    cartContainer.style.opacity = '1';
                }
            }, 50);
        }
    }

  bindEvents() {
    // All event handlers combined in one place
    document.addEventListener('click', (e) => {
        // Clear cart button - FIXED
        if (e.target.id === 'clearCartBtn' || e.target.closest('#clearCartBtn')) {
            e.preventDefault();
            this.clearCart();
        }
        
        // Remove item buttons
        if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
            const btn = e.target.classList.contains('remove-item-btn') ? e.target : e.target.closest('.remove-item-btn');
            const productId = btn.getAttribute('data-product-id');
            this.removeFromCart(productId);
        }

        // Quantity change buttons
        if (e.target.classList.contains('quantity-btn')) {
            const productId = e.target.getAttribute('data-product-id');
            const action = e.target.getAttribute('data-action');
            this.updateQuantity(productId, action);
        }
    });

    // Quantity input changes
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const productId = e.target.getAttribute('data-product-id');
            const newQuantity = parseInt(e.target.value);
            this.updateQuantityDirect(productId, newQuantity);
        }
    });

    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
    }
}


    // Add item to cart
    addToCart(product, quantity = 1) {
        // Validate product data
        if (!product || !product.name || !product.price || product.price <= 0) {
            this.showCartNotification('Error: Invalid product data', 'error');
            return;
        }

        const existingItem = this.cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: product.id || `item_${Date.now()}_${Math.random()}`,
                name: product.name,
                price: parseFloat(product.price),
                quantity: parseInt(quantity),
                image: product.image || '/images/products/default.jpg',
                category: product.category || 'supplements',
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart();
        this.updateCartDisplay();
        this.updateCartBadge();
        this.showCartNotification(`${product.name} added to cart!`, 'success');
        this.updateAddToCartButtons();
    }

    // Remove item from cart
    removeFromCart(productId) {
        const itemIndex = this.cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            const removedItem = this.cart[itemIndex];
            this.cart.splice(itemIndex, 1);
            this.saveCart();
            this.updateCartDisplay();
            this.updateCartBadge();
            this.showCartNotification(`${removedItem.name} removed from cart!`, 'info');
            this.updateAddToCartButtons();
        }
    }

    // Update item quantity
    updateQuantity(productId, action) {
        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease') {
            item.quantity = Math.max(1, item.quantity - 1);
        }

        this.saveCart();
        this.updateCartDisplay();
        this.updateCartBadge();
    }

    // Update quantity directly from input
    updateQuantityDirect(productId, newQuantity) {
        if (newQuantity < 1) return;
        
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.saveCart();
            this.updateCartDisplay();
            this.updateCartBadge();
        }
    }

    // Clear entire cart
    clearCart() {
        if (confirm('Are you sure you want to clear your cart?')) {
            this.cart = [];
            this.saveCart();
            this.updateCartDisplay();
            this.updateCartBadge();
            this.showCartNotification('Cart cleared!', 'info');
            this.updateAddToCartButtons();
        }
    }

    // Save cart to localStorage - UPDATED for SanHerbs
    saveCart() {
        try {
            // FIXED: Remove escaped underscores
            localStorage.setItem('sanherbs_cart', JSON.stringify(this.cart));
            localStorage.setItem('greentap_cart', JSON.stringify(this.cart)); // Backward compatibility
            localStorage.setItem('cart', JSON.stringify(this.cart)); // Backup
        } catch (error) {
            console.error('Error saving cart:', error);
            this.showCartNotification('Error saving cart', 'error');
        }
    }

    // Get cart total - FIXED VERSION
    getCartTotal() {
        return this.cart.reduce((total, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;
            return total + (price * quantity);
        }, 0);
    }

    // Get cart item count
    getCartItemCount() {
        return this.cart.reduce((count, item) => count + (parseInt(item.quantity) || 0), 0);
    }

    // Update cart display on cart page - ENHANCED VERSION
   // Update cart display on cart page - FIXED VERSION
updateCartDisplay() {
    const cartContainer = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    
    console.log('Updating cart display, cart length:', this.cart.length);
    console.log('Cart container found:', !!cartContainer);
    
    if (!cartContainer) {
        console.error('Cart container #cartItems not found in DOM');
        return;
    }

    if (this.cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart-message">
                <h3>Your cart is empty</h3>
                <p>Add some products to get started</p>
                <a href="/marketplace.html" class="btn btn-primary">Shop Now</a>
            </div>
        `;
        
        if (emptyCartMessage) {
            emptyCartMessage.style.display = 'block';
        }
        
        this.updateCartSummary(0, 0);
        return;
    }

    // Hide empty cart message
    if (emptyCartMessage) {
        emptyCartMessage.style.display = 'none';
    }

    // Display cart items
    const cartHTML = this.cart.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const total = price * quantity;
        
        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image && item.image !== '/images/products/default.jpg' ? 
                        `<img src="${item.image}" alt="${item.name}" loading="lazy">` : 
                        '<div class="product-icon">💊</div>'
                    }
                </div>
                
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">₹${price.toFixed(2)} each</div>
                    <div class="cart-item-category">${item.category}</div>
                </div>
                
                <div class="cart-item-quantity">
                    <button class="quantity-btn" data-product-id="${item.id}" data-action="decrease">-</button>
                    <input type="number" class="quantity-input" value="${quantity}" min="1" max="99" data-product-id="${item.id}">
                    <button class="quantity-btn" data-product-id="${item.id}" data-action="increase">+</button>
                </div>
                
                <div class="cart-item-total">
                    <div class="item-total">₹${total.toFixed(2)}</div>
                    <button class="remove-item-btn" data-product-id="${item.id}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');

    cartContainer.innerHTML = cartHTML;

    const subtotal = this.getCartTotal();
    const itemCount = this.getCartItemCount();
    this.updateCartSummary(subtotal, itemCount);
    
    console.log('Cart display updated successfully');
}


    // Update cart summary - ENHANCED VERSION
    updateCartSummary(subtotal, itemCount) {
        const subtotalElement = document.getElementById('subtotalAmount');
        const shippingElement = document.getElementById('shippingAmount');
        const totalElement = document.getElementById('totalAmount');
        const shippingNote = document.getElementById('shippingNote');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (!subtotalElement || !totalElement) return;

        const shipping = subtotal >= 500 ? 0 : 50;
        const total = subtotal + shipping;

        subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
        if (shippingElement) shippingElement.textContent = shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`;
        totalElement.textContent = `₹${total.toFixed(2)}`;

        // Update shipping note with better styling
        if (shippingNote) {
            if (shipping === 0) {
                shippingNote.innerHTML = `
                    <div class="free-shipping-note">
                        <i class="fas fa-check-circle"></i> 
                        🎉 You saved ₹50 on shipping!
                    </div>
                `;
                shippingNote.className = 'shipping-note free-shipping';
            } else {
                shippingNote.innerHTML = `
                    <div class="paid-shipping-note">
                        <i class="fas fa-truck"></i>
                        Add ₹${(500 - subtotal).toFixed(2)} more for free shipping!
                    </div>
                `;
                shippingNote.className = 'shipping-note paid-shipping';
            }
        }

        // Update checkout button
        if (checkoutBtn) {
            checkoutBtn.textContent = `Proceed to Checkout (₹${total.toFixed(2)})`;
            checkoutBtn.disabled = itemCount === 0;
            
            if (itemCount === 0) {
                checkoutBtn.style.opacity = '0.6';
                checkoutBtn.style.cursor = 'not-allowed';
            } else {
                checkoutBtn.style.opacity = '1';
                checkoutBtn.style.cursor = 'pointer';
            }
        }
    }

    // Update cart badge in navigation
    updateCartBadge() {
        const cartBadges = document.querySelectorAll('.cart-count');
        const itemCount = this.getCartItemCount();

        cartBadges.forEach(badge => {
            badge.textContent = itemCount;
            badge.style.display = itemCount > 0 ? 'inline-flex' : 'none';
            
            // Add animation for badge updates
            if (itemCount > 0) {
                badge.classList.add('cart-count-updated');
                setTimeout(() => badge.classList.remove('cart-count-updated'), 300);
            }
        });
    }

    // Enhanced cart notification
    showCartNotification(message, type = 'success') {
        console.log('Cart notification:', message, type);
        
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 5px;
            z-index: 9999;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Proceed to checkout - UPDATED for SanHerbs
    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showCartNotification('Your cart is empty!', 'error');
            return;
        }

        // Check authentication status
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            this.showCartNotification('Please login to proceed to checkout', 'error');
            setTimeout(() => {
                window.location.href = '/login.html?redirect=checkout';
            }, 1500);
            return;
        }

        // Save cart data for checkout
        const checkoutData = {
            items: this.cart,
            subtotal: this.getCartTotal(),
            shipping: this.getCartTotal() >= 500 ? 0 : 50,
            total: this.getCartTotal() + (this.getCartTotal() >= 500 ? 0 : 50),
            timestamp: new Date().toISOString()
        };

        localStorage.setItem('checkoutCart', JSON.stringify(checkoutData));
        
        this.showCartNotification('Redirecting to checkout...', 'info');
        setTimeout(() => {
            window.location.href = '/checkout.html';
        }, 1000);
    }

    // Update add to cart buttons state (for product pages)
    updateAddToCartButtons() {
        const buttons = document.querySelectorAll('.add-to-cart-btn');
        buttons.forEach(button => {
            const productId = button.getAttribute('data-product-id');
            const cartItem = this.cart.find(item => item.id === productId);
            
            if (cartItem) {
                button.innerHTML = `<i class="fas fa-check"></i> In Cart (${cartItem.quantity})`;
                button.classList.add('in-cart');
            } else {
                button.innerHTML = `<i class="fas fa-cart-plus"></i> Add to Cart`;
                button.classList.remove('in-cart');
            }
        });
    }
}

// Enhanced initialization with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Only initialize cart on cart page or if cart elements exist
        if (document.getElementById('cartItems') || document.querySelector('.cart-count')) {
            window.shoppingCart = new ShoppingCart();
            console.log('✅ SanHerbs shopping cart initialized successfully');
        }
    } catch (error) {
        console.error('❌ Error initializing shopping cart:', error);
    }
});

// Make cart available globally
window.ShoppingCart = ShoppingCart;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoppingCart;
}

// EMERGENCY CART DISPLAY - Add at bottom of cart.js
setTimeout(() => {
    console.log('🚨 Emergency cart check...');
    const cartItems = document.getElementById('cartItems');
    if (cartItems && cartItems.innerHTML.includes('Loading')) {
        console.log('🚨 Cart still loading, forcing display');
        
        // Get cart directly from localStorage
        const cartData = localStorage.getItem('sanherbs_cart') || '[]';
        const cart = JSON.parse(cartData);
        
        if (cart.length > 0) {
            // Simple emergency cart display
            const cartHTML = cart.map(item => `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; background: white;">
                    <h4>${item.name}</h4>
                    <p>Price: ₹${item.price} x ${item.quantity}</p>
                    <p>Total: ₹${(item.price * item.quantity).toFixed(2)}</p>
                    <button onclick="removeEmergencyItem('${item.id}')" style="background: red; color: white; padding: 8px 15px; border: none; border-radius: 4px;">Remove</button>
                </div>
            `).join('');
            
            cartItems.innerHTML = cartHTML;
            console.log('🚨 Emergency cart displayed');
        } else {
            cartItems.innerHTML = '<div><h3>Your cart is empty</h3></div>';
        }
    }
}, 3000);

// Emergency remove function
window.removeEmergencyItem = function(id) {
    let cart = JSON.parse(localStorage.getItem('sanherbs_cart') || '[]');
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('sanherbs_cart', JSON.stringify(cart));
    location.reload();
};



