// API Configuration for SanHerbs Tracking
const getAPIBaseURL = () => {
    // Development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production - Your actual Render URL
    return 'https://sanherbs.onrender.com';
};

const API_BASE_URL = getAPIBaseURL();

// Order Tracking Manager for SanHerbs
class OrderTracker {
    constructor() {
        this.orderData = null;
        this.trackingData = null;
        this.refreshInterval = null;
        
        this.initializeTracker();
        this.bindEvents();
    }

    async initializeTracker() {
        try {
            console.log('📍 Initializing SanHerbs order tracker...');
            console.log('🔗 API Base URL:', API_BASE_URL);

            // Get order ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('orderId');

            if (!orderId) {
                this.showError('No order ID provided. Please access this page from your orders list.');
                return;
            }

            // Check authentication
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login.html?redirect=order-tracking';
                return;
            }

            // Load order tracking data
            await this.loadOrderTracking(orderId);

            // Start auto-refresh for active orders
            if (this.trackingData && this.isActiveOrder(this.trackingData.status)) {
                this.startAutoRefresh(orderId);
            }

            console.log('✅ Order tracker initialized successfully');

        } catch (error) {
            console.error('❌ Tracker initialization error:', error);
            this.showError('Failed to initialize order tracking.');
        }
    }

    bindEvents() {
        // Refresh tracking button
        const refreshBtn = document.getElementById('refreshTrackingBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const urlParams = new URLSearchParams(window.location.search);
                const orderId = urlParams.get('orderId');
                if (orderId) {
                    this.loadOrderTracking(orderId);
                }
            });
        }

        // Back to orders button
        const backBtn = document.getElementById('backToOrdersBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/orders.html';
            });
        }

        // Share tracking button
        const shareBtn = document.getElementById('shareTrackingBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareTracking());
        }

        // Download invoice button
        const invoiceBtn = document.getElementById('downloadInvoiceBtn');
        if (invoiceBtn) {
            invoiceBtn.addEventListener('click', () => this.downloadInvoice());
        }
    }

    // Load order tracking data
    async loadOrderTracking(orderId) {
        try {
            this.showLoading(true);
            console.log(`📍 Loading tracking for order: ${orderId}`);

            const response = await fetch(`${API_BASE_URL}/api/tracking/order/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Order not found or tracking not available yet.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.trackingData = result.tracking;
                this.orderData = result.order;
                this.displayTrackingInfo();
            } else {
                throw new Error(result.message || 'Failed to load tracking information');
            }

        } catch (error) {
            console.error('❌ Load tracking error:', error);

            if (error.message.includes('Failed to fetch')) {
                this.showError(`Cannot connect to server. Backend URL: ${API_BASE_URL}`);
            } else {
                this.showError(error.message);
            }
        } finally {
            this.showLoading(false);
        }
    }

    // Display tracking information
    displayTrackingInfo() {
        this.updateOrderHeader();
        this.updateTrackingStatus();
        this.updateTrackingTimeline();
        this.updateOrderDetails();
        this.updateDeliveryInfo();
    }

    // Update order header
    updateOrderHeader() {
        const orderNumber = document.getElementById('orderNumber');
        const orderDate = document.getElementById('orderDate');
        const orderAmount = document.getElementById('orderAmount');

        if (orderNumber) {
            orderNumber.textContent = this.orderData?.order_number || this.trackingData?.order_number || 'N/A';
        }

        if (orderDate) {
            orderDate.textContent = this.formatDate(this.orderData?.created_at || this.trackingData?.created_at);
        }

        if (orderAmount) {
            orderAmount.textContent = `₹${parseFloat(this.orderData?.total_amount || this.trackingData?.amount || 0).toFixed(2)}`;
        }
    }

    // Update tracking status
    updateTrackingStatus() {
        const statusElement = document.getElementById('currentStatus');
        const statusDescElement = document.getElementById('statusDescription');
        const lastUpdatedElement = document.getElementById('lastUpdated');

        const status = this.trackingData?.status || this.orderData?.status;
        const statusDisplay = this.getStatusDisplay(status);

        if (statusElement) {
            statusElement.innerHTML = `<span class="status-badge status-${status.replace('_', '-')}">${statusDisplay}</span>`;
        }

        if (statusDescElement) {
            statusDescElement.textContent = this.getStatusDescription(status);
        }

        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = this.formatDate(this.trackingData?.updated_at);
        }
    }

    // Update tracking timeline
    updateTrackingTimeline() {
        const timelineContainer = document.getElementById('trackingTimeline');
        if (!timelineContainer) return;

        const currentStatus = this.trackingData?.status || this.orderData?.status;
        const statuses = [
            { key: 'created', label: '📝 Order Placed', desc: 'Order has been created' },
            { key: 'paid', label: '💳 Payment Confirmed', desc: 'Payment received successfully' },
            { key: 'processing', label: '⚙️ Processing', desc: 'Order is being processed' },
            { key: 'shipped', label: '🚚 Shipped', desc: 'Order has been shipped' },
            { key: 'delivered', label: '🎉 Delivered', desc: 'Order delivered successfully' }
        ];

        const timelineHTML = statuses.map(statusItem => {
            const isCompleted = this.isStatusCompleted(statusItem.key, currentStatus);
            const isCurrent = currentStatus === statusItem.key;
            
            return `
                <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="timeline-dot">
                        ${isCompleted ? '✅' : (isCurrent ? '🔄' : '⭕')}
                    </div>
                    <div class="timeline-content">
                        <h5>${statusItem.label}</h5>
                        <p>${statusItem.desc}</p>
                        ${isCompleted ? `<small>${this.formatDate(this.trackingData?.created_at)}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        timelineContainer.innerHTML = timelineHTML;
    }

    // Update order details
    updateOrderDetails() {
        const itemsContainer = document.getElementById('orderItems');
        const paymentMethodElement = document.getElementById('paymentMethod');
        const deliveryAddressElement = document.getElementById('deliveryAddress');

        // Order items
        if (itemsContainer) {
            const items = this.parseOrderItems(this.orderData?.items);
            if (items.length > 0) {
                itemsContainer.innerHTML = items.map(item => `
                    <div class="order-item">
                        <div class="item-image">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}">` : '💊'}
                        </div>
                        <div class="item-details">
                            <h6>${item.name}</h6>
                            <p>Quantity: ${item.quantity || 1}</p>
                            <p>Price: ₹${parseFloat(item.price || 0).toFixed(2)}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                itemsContainer.innerHTML = '<p>No item details available</p>';
            }
        }

        // Payment method
        if (paymentMethodElement) {
            paymentMethodElement.textContent = this.getPaymentMethodDisplay(this.orderData?.payment_method);
        }

        // Delivery address
        if (deliveryAddressElement) {
            deliveryAddressElement.textContent = this.formatAddress(this.orderData?.delivery_address);
        }
    }

    // Update delivery info
    updateDeliveryInfo() {
        const trackingIdElement = document.getElementById('trackingId');
        const courierElement = document.getElementById('courierName');
        const estimatedDeliveryElement = document.getElementById('estimatedDelivery');

        if (trackingIdElement && this.trackingData?.tracking_id) {
            trackingIdElement.textContent = this.trackingData.tracking_id;
        }

        if (courierElement) {
            courierElement.textContent = this.trackingData?.courier_name || 'Shiprocket';
        }

        if (estimatedDeliveryElement && this.trackingData?.estimated_delivery) {
            estimatedDeliveryElement.textContent = this.formatDate(this.trackingData.estimated_delivery);
        }
    }

    // Start auto-refresh for active orders
    startAutoRefresh(orderId) {
        // Refresh every 30 seconds for active orders
        this.refreshInterval = setInterval(() => {
            this.loadOrderTracking(orderId);
        }, 30000);

        // Stop auto-refresh when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            } else if (!document.hidden && this.isActiveOrder(this.trackingData?.status)) {
                this.startAutoRefresh(orderId);
            }
        });
    }

    // Share tracking information
    shareTracking() {
        const orderId = this.orderData?.order_number || this.trackingData?.order_number;
        const status = this.getStatusDisplay(this.trackingData?.status || this.orderData?.status);
        
        if (navigator.share) {
            navigator.share({
                title: `SanHerbs Order #${orderId}`,
                text: `Order Status: ${status}`,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            const trackingUrl = window.location.href;
            navigator.clipboard.writeText(trackingUrl).then(() => {
                this.showSuccess('Tracking link copied to clipboard!');
            });
        }
    }

    // Download invoice
    async downloadInvoice() {
        try {
            const orderId = this.orderData?.id || this.trackingData?.order_id;
            
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/invoice`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SanHerbs-Invoice-${orderId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('Invoice downloaded successfully!');
            } else {
                throw new Error('Invoice not available');
            }
        } catch (error) {
            console.error('Download invoice error:', error);
            this.showError('Invoice not available yet.');
        }
    }

    // Helper functions
    parseOrderItems(items) {
        if (!items) return [];
        
        try {
            if (typeof items === 'string') {
                try {
                    return JSON.parse(items);
                } catch {
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

    formatAddress(address) {
        if (typeof address === 'string') {
            try {
                const parsed = JSON.parse(address);
                return `${parsed.address || ''}, ${parsed.city || ''}, ${parsed.state || ''} - ${parsed.pincode || ''}`.replace(/^,\s*|,\s*$/g, '');
            } catch {
                return address;
            }
        } else if (typeof address === 'object') {
            return `${address.address || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`.replace(/^,\s*|,\s*$/g, '');
        }
        return 'N/A';
    }

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
        return statusMap[status] || status;
    }

    getStatusDescription(status) {
        const descriptions = {
            'created': 'Your order has been successfully created and is waiting for payment confirmation.',
            'payment_pending': 'Please complete the payment to proceed with your order.',
            'paid': 'Payment received! Your order is now being processed.',
            'processing': 'Your order is being carefully prepared for shipment.',
            'shipped': 'Your order is on its way! Track your package using the provided tracking ID.',
            'delivered': 'Your order has been delivered successfully. Thank you for choosing SanHerbs!',
            'cancelled': 'This order has been cancelled.',
            'refunded': 'Refund has been processed for this order.'
        };
        return descriptions[status] || 'Order status updated.';
    }

    getPaymentMethodDisplay(method) {
        const methodMap = {
            'cod': '💵 Cash on Delivery',
            'razorpay': '💳 Online Payment',
            'upi': '📱 UPI'
        };
        return methodMap[method] || 'Unknown';
    }

    isStatusCompleted(targetStatus, currentStatus) {
        const statusOrder = ['created', 'paid', 'processing', 'shipped', 'delivered'];
        const targetIndex = statusOrder.indexOf(targetStatus);
        const currentIndex = statusOrder.indexOf(currentStatus);
        return currentIndex >= targetIndex;
    }

    isActiveOrder(status) {
        return ['created', 'paid', 'processing', 'shipped'].includes(status);
    }

    // UI helpers
    showLoading(show) {
        const loadingDiv = document.getElementById('trackingLoading');
        const contentDiv = document.getElementById('trackingContent');
        
        if (loadingDiv) loadingDiv.style.display = show ? 'block' : 'none';
        if (contentDiv) contentDiv.style.opacity = show ? '0.5' : '1';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `tracking-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : '❌'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize order tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/order-tracking' || window.location.pathname === '/order-tracking.html') {
        window.orderTracker = new OrderTracker();
        console.log('✅ SanHerbs order tracker initialized');
    }
});

console.log('📍 SanHerbs order tracking system loaded');
