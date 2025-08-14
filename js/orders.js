// Order Management System
class OrderManager {
    constructor() {
        this.orders = [];
        this.currentOrderId = null;
        
        this.initializeOrderManager();
        this.bindEvents();
    }

    async initializeOrderManager() {
        try {
            // Check authentication
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login?redirect=orders';
                return;
            }

            // Load orders
            await this.loadOrders();
            
        } catch (error) {
            console.error('Order manager initialization error:', error);
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
        });
    }

    // Load user orders
    async loadOrders() {
        try {
            this.showLoading(true);

            const response = await fetch('/api/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.orders = result.orders || [];
                this.displayOrders();
            } else {
                throw new Error(result.message || 'Failed to load orders');
            }

        } catch (error) {
            console.error('Load orders error:', error);
            this.showError('Failed to load orders. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    // Display orders list
    displayOrders(ordersToShow = this.orders) {
        const ordersContainer = document.getElementById('ordersContainer');
        if (!ordersContainer) return;

        if (ordersToShow.length === 0) {
            ordersContainer.innerHTML = `
                <div class="no-orders">
                    <div class="no-orders-icon">📦</div>
                    <h3>No orders found</h3>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/marketplace" class="btn btn-primary">Start Shopping</a>
                </div>
            `;
            return;
        }

        ordersContainer.innerHTML = ordersToShow.map(order => this.createOrderCard(order)).join('');
    }

    // Create order card HTML
    createOrderCard(order) {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemsDisplay = items.length > 0 ? items.join(', ') : 'No items';
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Order #${order.order_number || order.id}</h4>
                        <p class="order-date">${this.formatDate(order.created_at)}</p>
                    </div>
                    <div class="order-status">
                        <span class="status-badge status-${order.status}">${this.getStatusDisplay(order.status)}</span>
                        <span class="order-amount">₹${parseFloat(order.total_amount || order.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="order-content">
                    <div class="order-items">
                        <p><strong>Items:</strong> ${itemsDisplay}</p>
                        <p><strong>Payment:</strong> ${this.getPaymentMethodDisplay(order.payment_method)}</p>
                    </div>
                    
                    <div class="order-actions">
                        <button class="btn btn-outline view-details-btn" data-order-id="${order.id}">
                            View Details
                        </button>
                        ${this.canTrackOrder(order.status) ? `
                            <button class="btn btn-primary track-order-btn" data-order-id="${order.id}">
                                Track Order
                            </button>
                        ` : ''}
                        ${this.canCancelOrder(order.status) ? `
                            <button class="btn btn-danger cancel-order-btn" data-order-id="${order.id}">
                                Cancel Order
                            </button>
                        ` : ''}
                        ${this.canReorder(order.status) ? `
                            <button class="btn btn-secondary reorder-btn" data-order-id="${order.id}">
                                Reorder
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                ${order.status === 'shipped' && order.tracking_id ? `
                    <div class="tracking-info">
                        <p><strong>Tracking ID:</strong> ${order.tracking_id}</p>
                        <p><strong>Courier:</strong> ${order.courier_name || 'TBD'}</p>
                    </div>
                ` : ''}
            </div>
        `;
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

    // Track specific order
    async trackOrder(orderId) {
        try {
            const response = await fetch(`/api/tracking/order/${orderId}`);
            const result = await response.json();

            if (result.success) {
                this.showOrderTracking(result.tracking);
            } else {
                this.showError('Tracking information not available yet.');
            }

        } catch (error) {
            console.error('Track order error:', error);
            this.showError('Failed to load tracking information.');
        }
    }

    // Show order tracking modal
    showOrderTracking(trackingData) {
        const modal = document.createElement('div');
        modal.className = 'tracking-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Order Tracking - #${trackingData.id}</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="tracking-status">
                            <h4>Current Status: <span class="status-highlight">${this.getStatusDisplay(trackingData.order_status)}</span></h4>
                            <p>Last Updated: ${this.formatDate(trackingData.updated_at)}</p>
                        </div>
                        
                        ${trackingData.tracking_id ? `
                            <div class="tracking-details">
                                <p><strong>Tracking ID:</strong> ${trackingData.tracking_id}</p>
                                <p><strong>Courier:</strong> ${trackingData.courier_name || 'TBD'}</p>
                                ${trackingData.current_location ? `<p><strong>Current Location:</strong> ${trackingData.current_location}</p>` : ''}
                                ${trackingData.estimated_delivery ? `<p><strong>Estimated Delivery:</strong> ${this.formatDate(trackingData.estimated_delivery)}</p>` : ''}
                            </div>
                        ` : `
                            <div class="tracking-pending">
                                <p>📦 Your order is being prepared for shipment.</p>
                                <p>Tracking details will be available once shipped.</p>
                            </div>
                        `}
                        
                        <div class="tracking-timeline">
                            <div class="timeline-item ${this.isStatusCompleted('created', trackingData.order_status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>Order Placed</h5>
                                    <p>${this.formatDate(trackingData.created_at)}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('paid', trackingData.order_status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>Payment Confirmed</h5>
                                    <p>${this.isStatusCompleted('paid', trackingData.order_status) ? 'Payment received' : 'Pending'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('processing', trackingData.order_status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>Processing</h5>
                                    <p>${this.isStatusCompleted('processing', trackingData.order_status) ? 'Order is being processed' : 'Pending'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('shipped', trackingData.order_status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>Shipped</h5>
                                    <p>${this.isStatusCompleted('shipped', trackingData.order_status) ? 'Order shipped' : 'Pending'}</p>
                                </div>
                            </div>
                            
                            <div class="timeline-item ${this.isStatusCompleted('delivered', trackingData.order_status) ? 'completed' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <h5>Delivered</h5>
                                    <p>${this.isStatusCompleted('delivered', trackingData.order_status) ? 'Order delivered' : 'Pending'}</p>
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

    // Cancel order
    async cancelOrder(orderId) {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;

        try {
            const response = await fetch(`/api/orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ reason })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Order cancelled successfully');
                await this.loadOrders(); // Reload orders
            } else {
                throw new Error(result.message || 'Failed to cancel order');
            }

        } catch (error) {
            console.error('Cancel order error:', error);
            this.showError('Failed to cancel order. Please try again.');
        }
    }

    // Reorder items
    reorderItems(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Parse items and add to cart
        try {
            const items = typeof order.items === 'string' ? order.items.split(', ') : order.items;
            
            if (window.addToCart && items.length > 0) {
                items.forEach(itemName => {
                    // Create mock product data for reorder
                    const product = {
                        id: `reorder_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                        name: itemName,
                        price: 499, // Default price - you might want to fetch actual prices
                        image: '/images/products/default.jpg'
                    };
                    window.addToCart(product, 1);
                });
                
                this.showSuccess('Items added to cart successfully!');
                setTimeout(() => {
                    window.location.href = '/cart';
                }, 1500);
            } else {
                this.showError('Unable to add items to cart. Please add manually.');
            }

        } catch (error) {
            console.error('Reorder error:', error);
            this.showError('Failed to reorder items.');
        }
    }

    // Show order details
    showOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        // Redirect to dedicated order details page
        window.location.href = `/order-tracking?orderId=${orderId}`;
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
            'created': 'Order Created',
            'payment_pending': 'Payment Pending',
            'paid': 'Payment Confirmed', 
            'processing': 'Processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
            'refunded': 'Refunded'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    getPaymentMethodDisplay(method) {
        const methodMap = {
            'cod': 'Cash on Delivery',
            'razorpay': 'Online Payment',
            'card': 'Credit/Debit Card',
            'upi': 'UPI',
            'netbanking': 'Net Banking',
            'wallet': 'Digital Wallet'
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
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize order manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/orders' || window.location.pathname === '/orders.html') {
        window.orderManager = new OrderManager();
    }
});

console.log('📦 Order management system initialized');
