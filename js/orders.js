// API Configuration for SanHerbs Orders
const getAPIBaseURL = () => {
    // Development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production - Your actual Render URL
    return 'https://sanherbs.onrender.com';
};

const API_BASE_URL = getAPIBaseURL();

// Order Management System for SanHerbs
class OrderManager {
    constructor() {
        this.orders = [];
        this.currentOrderId = null;
        
        this.initializeOrderManager();
        this.bindEvents();
    }

    async initializeOrderManager() {
        try {
            console.log('📦 Initializing SanHerbs order manager...');
            console.log('🔗 API Base URL:', API_BASE_URL);
            
            // Check authentication
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login.html?redirect=orders';
                return;
            }

            // Load orders
            await this.loadOrders();
            
            console.log('✅ Order manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Order manager initialization error:', error);
            this.showError('Failed to load orders. Please refresh the page.');
        }
    }

    bindEvents() {
        // Refresh orders button
        const refreshBtn = document.getElementById('refreshOrdersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadOrders());
        }

        // Order filter
        const orderFilter = document.getElementById('orderFilter');
        if (orderFilter) {
            orderFilter.addEventListener('change', (e) => {
                this.filterOrders(e.target.value);
            });
        }

        // Search orders
        const searchInput = document.getElementById('orderSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchOrders(e.target.value);
            });
        }

        // Delegate events for dynamically created elements
        document.addEventListener('click', (e) => {
            // Track order buttons
            if (e.target.classList.contains('track-order-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                this.trackOrder(orderId);
            }

            // Cancel order buttons
            if (e.target.classList.contains('cancel-order-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                this.cancelOrder(orderId);
            }

            // Reorder buttons
            if (e.target.classList.contains('reorder-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                this.reorderItems(orderId);
            }

            // View details buttons
            if (e.target.classList.contains('view-details-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                this.showOrderDetails(orderId);
            }

            // Download invoice buttons
            if (e.target.classList.contains('download-invoice-btn')) {
                const orderId = e.target.getAttribute('data-order-id');
                this.downloadInvoice(orderId);
            }
        });
    }

    // Load user orders - UPDATED API URL
    async loadOrders() {
        try {
            this.showLoading(true);
            console.log('📦 Loading orders from backend...');
            
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.orders = result.orders || [];
                console.log(`✅ Loaded ${this.orders.length} orders`);
                this.displayOrders();
                this.updateOrderStats();
            } else {
                throw new Error(result.message || 'Failed to load orders');
            }

        } catch (error) {
            console.error('❌ Load orders error:', error);
            
            if (error.message.includes('HTTP error! status: 401')) {
                // Token expired, redirect to login
                localStorage.removeItem('authToken');
                window.location.href = '/login.html?redirect=orders';
            } else if (error.message.includes('Failed to fetch')) {
                this.showError(`Cannot connect to server. Backend URL: ${API_BASE_URL}`);
            } else {
                this.showError('Failed to load orders. Please try again.');
            }
        } finally {
            this.showLoading(false);
        }
    }

    // Display orders list - ENHANCED for SanHerbs
    displayOrders(ordersToShow = this.orders) {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;

        if (ordersToShow.length === 0) {
            ordersContainer.innerHTML = `
                <div class="no-orders">
                    <div class="no-orders-icon">📦</div>
                    <h3>No orders found</h3>
                    <p>You haven't placed any orders yet.</p>
                    <div class="no-orders-actions">
                        <a href="/marketplace.html" class="btn btn-primary">🌿 Start Shopping</a>
                        <a href="/plans.html" class="btn btn-secondary">📋 View Plans</a>
                    </div>
                </div>
            `;
            return;
        }

        ordersContainer.innerHTML = ordersToShow.map(order => this.createOrderCard(order)).join('');
    }

    // Create order card HTML - ENHANCED for SanHerbs
    createOrderCard(order) {
        const items = this.parseOrderItems(order.items);
        const itemsDisplay = items.length > 0 ? 
            items.slice(0, 2).map(item => item.name || item).join(', ') + 
            (items.length > 2 ? ` +${items.length - 2} more` : '') : 
            'No items';
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Order #${order.order_number || order.id}</h4>
                        <p class="order-date">📅 ${this.formatDate(order.created_at)}</p>
                        <p class="order-items-preview">📦 ${itemsDisplay}</p>
                    </div>
                    <div class="order-status">
                        <span class="status-badge status-${order.status.replace('_', '-')}">${this.getStatusDisplay(order.status)}</span>
                        <span class="order-amount">₹${parseFloat(order.total_amount || order.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="order-content">
                    <div class="order-details">
                        <div class="order-payment">
                            <span class="payment-badge payment-${order.payment_method}">
                                ${this.getPaymentMethodDisplay(order.payment_method)}
                            </span>
                        </div>
                        
                        ${order.delivery_address ? `
                            <div class="order-address">
                                <small>📍 ${this.formatAddress(order.delivery_address)}</small>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-actions">
                        <button class="btn btn-outline view-details-btn" data-order-id="${order.id}">
                            👁️ View Details
                        </button>
                        
                        ${this.canTrackOrder(order.status) ? `
                            <button class="btn btn-primary track-order-btn" data-order-id="${order.id}">
                                📍 Track Order
                            </button>
                        ` : ''}
                        
                        ${this.canCancelOrder(order.status) ? `
                            <button class="btn btn-danger cancel-order-btn" data-order-id="${order.id}">
                                ❌ Cancel
                            </button>
                        ` : ''}
                        
                        ${this.canReorder(order.status) ? `
                            <button class="btn btn-secondary reorder-btn" data-order-id="${order.id}">
                                🔄 Reorder
                            </button>
                        ` : ''}
                        
                        ${this.canDownloadInvoice(order.status) ? `
                            <button class="btn btn-outline download-invoice-btn" data-order-id="${order.id}">
                                📄 Invoice
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${order.status === 'shipped' && order.tracking_id ? `
                    <div class="tracking-info">
                        <div class="tracking-details">
                            <span class="tracking-label">📦 Tracking ID:</span>
                            <span class="tracking-value">${order.tracking_id}</span>
                        </div>
                        <div class="courier-details">
                            <span class="courier-label">🚚 Courier:</span>
                            <span class="courier-value">${order.courier_name || 'Shiprocket'}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // NEW: Parse order items safely
    parseOrderItems(items) {
        if (!items) return [];
        
        try {
            if (typeof items === 'string') {
                // Try parsing as JSON first
                try {
                    return JSON.parse(items);
                } catch {
                    // Fallback to comma-separated string
                    return items.split(', ').map(item => ({ name: item.trim() }));
                }
            } else if (Array.isArray(items)) {
                return items;
            }
        } catch (error) {
            console.error('Error parsing order items:', error);
        }
        
        return [];
    }

    // NEW: Format address for display
    formatAddress(address) {
        if (typeof address === 'string') {
            try {
                const parsed = JSON.parse(address);
                return `${parsed.city || ''}, ${parsed.state || ''}`.replace(/^,\s*|,\s*$/g, '');
            } catch {
                return address;
            }
        } else if (typeof address === 'object') {
            return `${address.city || ''}, ${address.state || ''}`.replace(/^,\s*|,\s*$/g, '');
        }
        return 'N/A';
    }

    // Filter orders
    filterOrders(status) {
        if (status === 'all') {
            this.displayOrders(this.orders);
        } else {
            const filtered = this.orders.filter(order => order.status === status);
            this.displayOrders(filtered);
        }
    }

    // NEW: Search orders
    searchOrders(searchTerm) {
        if (!searchTerm) {
            this.displayOrders(this.orders);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = this.orders.filter(order => 
            (order.order_number && order.order_number.toString().toLowerCase().includes(term)) ||
            (order.id && order.id.toString().toLowerCase().includes(term)) ||
            (order.items && order.items.toString().toLowerCase().includes(term))
        );
        
        this.displayOrders(filtered);
    }

    // NEW: Update order statistics
    updateOrderStats() {
        const totalOrders = this.orders.length;
        const pendingOrders = this.orders.filter(order => 
            ['created', 'payment_pending', 'paid', 'processing'].includes(order.status)
        ).length;
        const deliveredOrders = this.orders.filter(order => order.status === 'delivered').length;

        // Update stats display if elements exist
        const totalOrdersElement = document.getElementById('totalOrders');
        const pendingOrdersElement = document.getElementById('pendingOrders');
        const deliveredOrdersElement = document.getElementById('deliveredOrders');

        if (totalOrdersElement) totalOrdersElement.textContent = totalOrders;
        if (pendingOrdersElement) pendingOrdersElement.textContent = pendingOrders;
        if (deliveredOrdersElement) deliveredOrdersElement.textContent = deliveredOrders;
    }

    // Track specific order - UPDATED API URL
    async trackOrder(orderId) {
        try {
            console.log(`📍 Tracking order: ${orderId}`);
            
            const response = await fetch(`${API_BASE_URL}/api/tracking/order/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showOrderTracking(result.tracking);
            } else {
                this.showError('Tracking information not available yet.');
            }

        } catch (error) {
            console.error('❌ Track order error:', error);
            
            if (error.message.includes('Failed to fetch')) {
                this.showError('Cannot connect to server. Please check your connection.');
            } else {
                this.showError('Failed to load tracking information.');
            }
        }
    }

    // Show order tracking modal - ENHANCED for SanHerbs
    showOrderTracking(trackingData) {
        const modal = document.createElement('div');
        modal.className = 'tracking-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📦 Order Tracking - #${trackingData.order_number || trackingData.id}</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="tracking-status">
                            <h4>Current Status: <span class="status-highlight">${this.getStatusDisplay(trackingData.order_status || trackingData.status)}</span></h4>
                            <p>📅 Last Updated: ${this.formatDate(trackingData.updated_at)}</p>
                        </div>
                        
                        ${trackingData.tracking_id ? `
                            <div class="tracking-details">
                                <div class="tracking-info-grid">
                                    <div class="tracking-item">
                                        <strong>📦 Tracking ID:</strong>
                                        <span>${trackingData.tracking_id}</span>
                                    </div>
                                    <div class="tracking-item">
                                        <strong>🚚 Courier:</strong>
                                        <span>${trackingData.courier_name || 'Shiprocket'}</span>
                                    </div>
                                    ${trackingData.current_location ? `
                                        <div class="tracking-item">
                                            <strong>📍 Current Location:</strong>
                                            <span>${trackingData.current_location}</span>
                                        </div>
                                    ` : ''}
                                    ${trackingData.estimated_delivery ? `
                                        <div class="tracking-item">
                                            <strong>⏰ Estimated Delivery:</strong>
                                            <span>${this.formatDate(trackingData.estimated_delivery)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : `
                            <div class="tracking-pending">
                                <p>📦 Your order is being prepared for shipment.</p>
                                <p>🕐 Tracking details will be available once shipped.</p>
                            </div>
                        `}
                        
                        <div class="tracking-timeline">
                            <div class="timeline-item ${this.isStatusCompleted('created', trackingData.order_status || trackingData.status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>📝 Order Placed</h5>
                                    <p>${this.formatDate(trackingData.created_at)}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('paid', trackingData.order_status || trackingData.status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>💳 Payment Confirmed</h5>
                                    <p>${this.isStatusCompleted('paid', trackingData.order_status || trackingData.status) ? 'Payment received successfully' : 'Waiting for payment'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('processing', trackingData.order_status || trackingData.status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>⚙️ Processing</h5>
                                    <p>${this.isStatusCompleted('processing', trackingData.order_status || trackingData.status) ? 'Order is being processed' : 'Pending processing'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('shipped', trackingData.order_status || trackingData.status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>🚚 Shipped</h5>
                                    <p>${this.isStatusCompleted('shipped', trackingData.order_status || trackingData.status) ? 'Order shipped successfully' : 'Preparing for shipment'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('delivered', trackingData.order_status || trackingData.status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>🎉 Delivered</h5>
                                    <p>${this.isStatusCompleted('delivered', trackingData.order_status || trackingData.status) ? 'Order delivered successfully' : 'Out for delivery'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal events
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                modal.remove();
            }
        });
    }

    // Cancel order - UPDATED API URL
    async cancelOrder(orderId) {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        try {
            console.log(`❌ Cancelling order: ${orderId}`);
            
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('✅ Order cancelled successfully');
                await this.loadOrders(); // Reload orders
            } else {
                throw new Error(result.message || 'Failed to cancel order');
            }

        } catch (error) {
            console.error('❌ Cancel order error:', error);
            
            if (error.message.includes('Failed to fetch')) {
                this.showError('Cannot connect to server. Please check your connection.');
            } else {
                this.showError('Failed to cancel order. Please try again.');
            }
        }
    }

    // Reorder items - ENHANCED for SanHerbs
    reorderItems(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        try {
            const items = this.parseOrderItems(order.items);
            
            if (items.length === 0) {
                this.showError('No items found to reorder.');
                return;
            }

            // Add items to cart using SanHerbs cart system
            if (window.shoppingCart) {
                items.forEach(item => {
                    const product = {
                        id: item.id || `reorder_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        name: item.name || item.productName || item,
                        price: item.price || 499, // Default price or stored price
                        image: item.image || '/images/products/default.jpg',
                        category: item.category || 'supplements'
                    };
                    
                    window.shoppingCart.addToCart(product, item.quantity || 1);
                });
                
                this.showSuccess(`✅ ${items.length} item(s) added to cart successfully!`);
                setTimeout(() => {
                    window.location.href = '/cart.html';
                }, 1500);
            } else {
                // Fallback for when shopping cart is not available
                this.showError('Shopping cart not available. Please add items manually.');
            }

        } catch (error) {
            console.error('❌ Reorder error:', error);
            this.showError('Failed to reorder items.');
        }
    }

    // Show order details
    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Redirect to dedicated order details page
        window.location.href = `/order-tracking.html?orderId=${orderId}`;
    }

    // NEW: Download invoice
    async downloadInvoice(orderId) {
        try {
            console.log(`📄 Downloading invoice for order: ${orderId}`);
            
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `SanHerbs-Invoice-${orderId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('📄 Invoice downloaded successfully!');
            } else {
                throw new Error('Invoice not available');
            }

        } catch (error) {
            console.error('❌ Download invoice error:', error);
            this.showError('Invoice not available yet.');
        }
    }

    // Helper functions
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getStatusDisplay(status) {
        const statusMap = {
            'created': '📝 Order Created',
            'payment_pending': '⏳ Payment Pending',
            'paid': '💳 Payment Confirmed', 
            'processing': '⚙️ Processing',
            'shipped': '🚚 Shipped',
            'delivered': '🎉 Delivered',
            'cancelled': '❌ Cancelled',
            'refunded': '💰 Refunded'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    getPaymentMethodDisplay(method) {
        const methodMap = {
            'cod': '💵 Cash on Delivery',
            'razorpay': '💳 Online Payment',
            'card': '💳 Credit/Debit Card',
            'upi': '📱 UPI',
            'netbanking': '🏦 Net Banking',
            'wallet': '💰 Digital Wallet'
        };
        return methodMap[method] || 'Unknown';
    }

    canTrackOrder(status) {
        return ['paid', 'processing', 'shipped'].includes(status);
    }

    canCancelOrder(status) {
        return ['created', 'payment_pending', 'paid', 'processing'].includes(status);
    }

    canReorder(status) {
        return ['delivered', 'cancelled'].includes(status);
    }

    canDownloadInvoice(status) {
        return ['delivered', 'shipped'].includes(status);
    }

    isStatusCompleted(targetStatus, currentStatus) {
        const statusOrder = ['created', 'payment_pending', 'paid', 'processing', 'shipped', 'delivered'];
        const targetIndex = statusOrder.indexOf(targetStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);
        return currentIndex >= targetIndex;
    }

    // UI helpers
    showLoading(show) {
        const loadingDiv = document.getElementById('ordersLoading');
        if (loadingDiv) {
            loadingDiv.style.display = show ? 'block' : 'none';
        }

        // Also show/hide orders container
        const ordersContainer = document.getElementById('ordersContainer');
        if (ordersContainer) {
            ordersContainer.style.opacity = show ? '0.5' : '1';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notification
        const existingNotification = document.querySelector('.order-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `order-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : '❌'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Close button event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize order manager when DOM is loaded - FIXED COMPARISON
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/orders' || window.location.pathname === '/orders.html') {
        window.orderManager = new OrderManager();
        console.log('✅ SanHerbs order management system initialized');
    }
});

console.log('📦 SanHerbs order management system loaded');
