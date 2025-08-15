// API Configuration for SanHerbs - UPDATED FOR RENDER
const getAPIBaseURL = () => {
    // Development - FIXED: Use === instead of =
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Production - Your actual Render URL
    return 'https://sanherbs.onrender.com';
};

// FIXED: Remove escaped underscores
const API_BASE_URL = getAPIBaseURL();

// Global Variables
let isSignupMode = false;
let authToken = localStorage.getItem('authToken');

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌿 SanHerbs application initializing...');
    console.log('🔗 API Base URL:', API_BASE_URL);
    
    initializeNavigation();
    initializeAuth();
    initializeFilters();
    initializeProfileTabs();
    initializeAnimations();
    initializeProductOrdering();
    initializePlanSubscription();
    
    // Update cart count on page load
    updateCartCount();
    
    // Check if user is already logged in - FIXED COMPARISON
    if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
        checkAuth();
    }
    
    // Load products if on marketplace page - FIXED COMPARISON
    if (window.location.pathname === '/marketplace' || window.location.pathname === '/marketplace.html') {
        loadProducts();
    }
    
    // Load plans if on plans page - FIXED COMPARISON
    if (window.location.pathname === '/plans' || window.location.pathname === '/plans.html') {
        loadPlans();
    }

    // Load user profile if authenticated
    if (authToken) {
        loadUserProfile();
    }
});

// FIXED FUNCTION ORDER: toggleAuthMode BEFORE setAuthMode
function toggleAuthMode() {
    setAuthMode(!isSignupMode);
    
    const mobileInput = document.getElementById("mobile");
    const passwordInput = document.getElementById("password");
    
    if (mobileInput) mobileInput.value = "";
    if (passwordInput) passwordInput.value = "";
    
    setTimeout(() => {
        clearMessage();
    }, 1000);
}

// NEW: Set Authentication Mode Function - FIXED ESCAPING
function setAuthMode(isSignup) {
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const toggleText = document.getElementById("toggleText");

    isSignupMode = isSignup;

    if (isSignupMode) {
        // SIGNUP MODE
        if (authTitle) authTitle.textContent = "Create Account";
        if (authSubtitle) authSubtitle.textContent = "Join SanHerbs today";
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "block";
        if (toggleText) {
            toggleText.innerHTML = `Already have an account? <a href="#" id="toggleLink">Sign in here</a>`;
        }
    } else {
        // LOGIN MODE (Default) - FIXED ESCAPING
        if (authTitle) authTitle.textContent = "Welcome Back";
        if (authSubtitle) authSubtitle.textContent = "Sign in to your SanHerbs account";
        if (loginBtn) loginBtn.style.display = "block";
        if (signupBtn) signupBtn.style.display = "none";
        if (toggleText) {
            toggleText.innerHTML = `Don't have an account? <a href="#" id="toggleLink">Sign up here</a>`;
        }
    }

    // Re-attach event listener to the new toggleLink
    const newToggleLink = document.getElementById("toggleLink");
    if (newToggleLink) {
        newToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }

    clearMessage();
}

// Authentication Initialization - FIXED VERSION
function initializeAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const toggleLink = document.getElementById('toggleLink');
    const logoutBtn = document.getElementById('logoutBtn');

    // Set initial state to LOGIN mode (not signup)
    setAuthMode(false);

    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', signup);
    }

    if (toggleLink) {
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// ✅ FIXED Product Ordering - Use Event Delegation
// Product Ordering Initialization - FIXED WITH EVENT DELEGATION AND POPUP
function initializeProductOrdering() {
    // Use event delegation for all add to cart and buy now buttons
    document.addEventListener('click', function(event) {
        // Handle Add to Cart buttons
        const addToCartBtn = event.target.closest('.add-to-cart-btn');
        if (addToCartBtn) {
            event.preventDefault();
            
            const productName = addToCartBtn.getAttribute('data-product');
            const price = addToCartBtn.getAttribute('data-price');
            const productId = addToCartBtn.getAttribute('data-product-id');
            const image = addToCartBtn.getAttribute('data-image');
            const category = addToCartBtn.getAttribute('data-category');
            
            console.log('Add to cart clicked:', { productName, price, productId });
            
            if (!productName || !price) {
                showMessage("❌ Product information missing", "error");
                return;
            }

            // Add to cart
            addToCart({
                id: productId || `product_${Date.now()}`,
                name: productName, 
                price: price,
                image: image,
                category: category
            });

            // Show popup notification
            showPopupNotification(`${productName} +1 added to cart`);
        }
        
        // Handle Buy Now buttons
        const buyNowBtn = event.target.closest('.buy-now-btn');
        if (buyNowBtn) {
            event.preventDefault();
            
            const productName = buyNowBtn.getAttribute('data-product');
            const price = buyNowBtn.getAttribute('data-price');
            const productId = buyNowBtn.getAttribute('data-product-id');
            const image = buyNowBtn.getAttribute('data-image');
            const category = buyNowBtn.getAttribute('data-category');
            
            if (!productName || !price) {
                showMessage("❌ Product information missing", "error");
                return;
            }

            buyNow({
                id: productId || `product_${Date.now()}`,
                name: productName,
                price: price,
                image: image,
                category: category
            });
        }
    });
}


// Plan Subscription Initialization - ENHANCED FOR SANHERBS
function initializePlanSubscription() {
    const planButtons = document.querySelectorAll('.plan-btn');
    
    planButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const planName = this.getAttribute('data-plan');
            const price = this.getAttribute('data-price');
            const planId = this.getAttribute('data-plan-id');
            
            if (planName && price) {
                subscribePlan({
                    id: planId,
                    name: planName,
                    price: price
                });
            }
        });
    });
}

// Navigation Functions
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });

    // Update navigation based on auth status
    updateNavigation();
}

// NEW: Update navigation based on authentication status
function updateNavigation() {
    const loginNavItem = document.querySelector('a[href*="login"]');
    const profileNavItem = document.querySelector('a[href*="profile"]');
    const ordersNavItem = document.querySelector('a[href*="orders"]');
    
    if (authToken) {
        // User is logged in
        if (loginNavItem) loginNavItem.style.display = 'none';
        if (profileNavItem) profileNavItem.style.display = 'block';
        if (ordersNavItem) ordersNavItem.style.display = 'block';
    } else {
        // User is not logged in
        if (loginNavItem) loginNavItem.style.display = 'block';
        if (profileNavItem) profileNavItem.style.display = 'none';
        if (ordersNavItem) ordersNavItem.style.display = 'none';
    }
}

// Cart Functions - ENHANCED FOR SANHERBS - FIXED COMPARISONS
function addToCart(product) {
    console.log('Adding to cart:', product);
    
    try {
        // Use SanHerbs cart storage - FIXED UNDERSCORES
        let cart = JSON.parse(localStorage.getItem('sanherbs_cart')) || 
                  JSON.parse(localStorage.getItem('greentap_cart')) || 
                  JSON.parse(localStorage.getItem('cart')) || [];
        
        // FIXED: Use === for comparison instead of =
        const existingItem = cart.find(item => item.id === product.id || item.name === product.name);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: product.id || `product_${Date.now()}`,
                name: product.name,
                price: parseFloat(product.price),
                quantity: 1,
                image: product.image || '/images/products/default.jpg',
                category: product.category || 'supplements',
                addedAt: new Date().toISOString()
            });
        }
        
        // Save to multiple storage keys for compatibility - FIXED UNDERSCORES
        localStorage.setItem('sanherbs_cart', JSON.stringify(cart));
        localStorage.setItem('greentap_cart', JSON.stringify(cart));
        localStorage.setItem('cart', JSON.stringify(cart));
        
        showMessage(`✅ ${product.name} added to cart!`, "success");
        updateCartCount();
        
        console.log('Cart updated:', cart);
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage("❌ Failed to add item to cart", "error");
    }
}

function buyNow(product) {
    console.log('Buy now:', product);
    
    try {
        // Check if user is authenticated
        if (!authToken) {
            showMessage("Please login to make a purchase", "error");
            setTimeout(() => {
                window.location.href = '/login.html?redirect=checkout';
            }, 1500);
            return;
        }

        // Add to cart and redirect to cart page
        addToCart(product);
        
        setTimeout(() => {
            window.location.href = '/cart.html';
        }, 1000);
    } catch (error) {
        console.error('Error in buy now:', error);
        showMessage("❌ Failed to proceed to checkout", "error");
    }
}

function subscribePlan(plan) {
    console.log('Subscribe to plan:', plan);
    
    try {
        // Check if user is authenticated
        if (!authToken) {
            showMessage("Please login to subscribe to a plan", "error");
            setTimeout(() => {
                window.location.href = '/login.html?redirect=plans';
            }, 1500);
            return;
        }

        // Store plan for checkout
        const planData = {
            id: plan.id || `plan_${Date.now()}`,
            name: plan.name,
            price: parseFloat(plan.price),
            type: 'subscription'
        };
        
        localStorage.setItem('checkoutPlan', JSON.stringify(planData));
        window.location.href = '/checkout.html';
    } catch (error) {
        console.error('Error in plan subscription:', error);
        showMessage("❌ Failed to proceed to subscription", "error");
    }
}

// Cart count update - ENHANCED - FIXED UNDERSCORES
function updateCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('sanherbs_cart')) || 
                     JSON.parse(localStorage.getItem('greentap_cart')) || 
                     JSON.parse(localStorage.getItem('cart')) || [];
        
        const cartCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
        const cartCountElements = document.querySelectorAll('.cart-count');
        
        console.log('Updating cart count:', cartCount);
        
        cartCountElements.forEach(element => {
            if (element) {
                element.textContent = cartCount;
                element.style.display = cartCount > 0 ? 'inline-flex' : 'none';
                
                // Add animation for updates
                if (cartCount > 0) {
                    element.classList.add('cart-count-updated');
                    setTimeout(() => element.classList.remove('cart-count-updated'), 300);
                }
            }
        });
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Product Filter Functions
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    // Category Filtering
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const category = button.getAttribute('data-category');
            filterProducts(category);
        });
    });

    // Search Functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            searchProducts(searchTerm);
        });
    }
}

function filterProducts(category) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        if (category === 'all') {
            card.style.display = 'block';
        } else {
            const cardCategories = card.getAttribute('data-category') || '';
            if (cardCategories.includes(category)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function searchProducts(searchTerm) {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        const productName = card.querySelector('h3')?.textContent?.toLowerCase() || '';
        const productDescription = card.querySelector('.product-subtitle')?.textContent?.toLowerCase() || '';
        
        if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// API Helper Functions - ENHANCED ERROR HANDLING
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        console.log('Making API call to:', url);
        const response = await fetch(url, finalOptions);
        
        // Handle non-JSON responses
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }
        
        console.log('API response:', { status: response.status, data });

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        
        // Enhanced error handling for different scenarios
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please check your internet connection.');
        }
        
        throw error;
    }
}

// Message Display Functions - FIXED TEMPLATE LITERAL
function showMessage(message, type = "error") {
    const msg = document.getElementById("message");
    if (msg) {
        msg.innerHTML = `
            ${message}
            <button onclick="clearMessage()" style="float: right; background: none; border: none; color: inherit; font-size: 18px; cursor: pointer;">&times;</button>
        `;
        msg.className = `message ${type}`;
        msg.style.display = 'block';

        if (msg.hideTimeout) {
            clearTimeout(msg.hideTimeout);
        }

        const hideTime = type === "error" ? 15000 : 8000;
        msg.hideTimeout = setTimeout(() => {
            msg.style.display = 'none';
        }, hideTime);
    }
}

function clearMessage() {
    const msg = document.getElementById("message");
    if (msg) {
        if (msg.hideTimeout) {
            clearTimeout(msg.hideTimeout);
        }
        msg.innerText = "";
        msg.innerHTML = "";
        msg.style.display = 'none';
    }
}

function validateInputs(mobile, password) {
    if (!mobile || !password) {
        showMessage("⚠️ Please enter both mobile number and password.", "error");
        return false;
    }

    // Clean mobile number - FIXED REGEX ESCAPING
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(cleanMobile)) {
        showMessage("⚠️ Please enter a valid 10-digit mobile number.", "error");
        return false;
    }

    if (password.length < 4) {
        showMessage("⚠️ Password must be at least 4 characters long.", "error");
        return false;
    }

    return true;
}

// Authentication Functions - FIXED FOR BACKEND RESPONSE FORMAT
async function login() {
    const mobile = document.getElementById("mobile")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();

    if (!validateInputs(mobile, password)) return;

    try {
        showMessage("Logging in...", "success");
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mobile, password })
        });

        console.log('Login response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Login response data:', data);
            
            // ✅ FIXED: Check for success property directly (matches backend format)
            if (data.success && data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showMessage("✅ Login successful!", "success");
                updateNavigation();
                
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                
                setTimeout(() => {
                    if (redirect === 'checkout') {
                        window.location.href = '/checkout.html';
                    } else if (redirect === 'plans') {
                        window.location.href = '/plans.html';
                    } else {
                        window.location.href = '/';
                    }
                }, 1000);
            } else {
                throw new Error(data.message || 'Invalid login response - no token received');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Login failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Login error:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage(`❌ Cannot connect to server. Backend: ${API_BASE_URL}`, "error");
        } else {
            showMessage(`❌ ${error.message}`, "error");
        }
    }
}

// FIXED SIGNUP FUNCTION - MATCHES BACKEND RESPONSE FORMAT
async function signup() {
    const mobile = document.getElementById("mobile")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();

    if (!validateInputs(mobile, password)) return;

    try {
        showMessage("Creating account...", "success");
        
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mobile, password })
        });

        console.log('🔍 Signup response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('🔍 Signup response data:', data);
            
            // ✅ FIXED: Check for success property directly (matches backend format)
            if (data.success) {
                showMessage("✅ " + data.message, "success");
                setTimeout(() => {
                    setAuthMode(false); // Switch to login mode
                    
                    if (document.getElementById("mobile")) {
                        document.getElementById("mobile").value = mobile;
                    }
                    if (document.getElementById("password")) {
                        document.getElementById("password").value = "";
                    }
                }, 1500);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Registration failed with status: ${response.status}`);
        }

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage("❌ Cannot connect to server. Backend URL: " + API_BASE_URL, "error");
        } else {
            showMessage("❌ " + error.message, "error");
        }
    }
}

// NEW: Load user profile data
async function loadUserProfile() {
    try {
        const response = await apiCall('/api/users/profile');
        if (response.success && response.user) {
            const user = response.user;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update UI with user data
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(element => {
                if (element) element.textContent = user.mobile || 'User';
            });
        }
    } catch (error) {
        console.log('Could not load user profile:', error.message);
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sanherbs_cart');
    localStorage.removeItem('greentap_cart');
    localStorage.removeItem('cart');
    
    authToken = null;
    
    updateNavigation();
    updateCartCount();
    
    const authSection = document.querySelector(".auth-section");
    const mainSection = document.getElementById("main-section");
    
    if (authSection) authSection.style.display = "block";
    if (mainSection) mainSection.style.display = "none";
    
    const mobileInput = document.getElementById("mobile");
    const passwordInput = document.getElementById("password");
    
    if (mobileInput) mobileInput.value = "";
    if (passwordInput) passwordInput.value = "";
    
    clearMessage();
    showMessage("✅ Logged out successfully!", "success");
    
    setTimeout(() => {
        window.location.href = '/';
    }, 1500);
}

function loadHealthTips() {
    const tips = [
        "💡 Take supplements with meals for better absorption",
        "💧 Drink plenty of water throughout the day",
        "🏃‍♂️ Combine supplements with regular exercise",
        "😴 Get 7-8 hours of quality sleep",
        "🥗 Maintain a balanced diet rich in fruits and vegetables",
        "🌿 Choose natural and organic supplements when possible",
        "📅 Follow consistent supplement schedules for best results"
    ];
    
    const tipsContainer = document.getElementById("health-tips");
    if (tipsContainer) {
        tipsContainer.innerHTML = tips.map(tip => `<div class="tip-item">${tip}</div>`).join('');
    }
}

// Initialize profile tabs and animations
function initializeProfileTabs() {
    const tabButtons = document.querySelectorAll('.profile-tab-btn');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements with animation classes
    document.querySelectorAll('.product-card, .feature-card, .plan-card').forEach(el => {
        observer.observe(el);
    });
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // User is already logged in, redirect to home
        window.location.href = '/';
    }
}

// NEW: Load products from backend
async function loadProducts() {
    try {
        console.log('Loading products from backend...');
        const response = await apiCall('/api/products');
        
        if (response.success && response.products) {
            renderProducts(response.products);
        }
    } catch (error) {
        console.log('Could not load products from backend:', error.message);
        // Continue with static products if backend fails
    }
}

// NEW: Render products dynamically - FIXED TEMPLATE LITERALS
function renderProducts(products) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    const productHTML = products.map(product => `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.name}" loading="lazy">` : 
                    '💊'
                }
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-subtitle">${product.description || 'Premium health supplement'}</p>
                <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-buttons">
                    <button class="add-to-cart-btn"
                            data-product-id="${product.id}"
                            data-product="${product.name}"
                            data-price="${product.price}"
                            data-image="${product.image}"
                            data-category="${product.category}">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="buy-now-btn"
                            data-product-id="${product.id}"
                            data-product="${product.name}"
                            data-price="${product.price}"
                            data-image="${product.image}"
                            data-category="${product.category}">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    productsContainer.innerHTML = productHTML;
}

// NEW: Load plans from backend
async function loadPlans() {
    try {
        console.log('Loading plans from backend...');
        const response = await apiCall('/api/plans');
        
        if (response.success && response.plans) {
            renderPlans(response.plans);
        }
    } catch (error) {
        console.log('Could not load plans from backend:', error.message);
        // Continue with static plans if backend fails
    }
}

// NEW: Render plans dynamically - FIXED TEMPLATE LITERALS
function renderPlans(plans) {
    const plansContainer = document.getElementById('plans-container');
    if (!plansContainer) return;
    
    const planHTML = plans.map(plan => `
        <div class="plan-card ${plan.featured ? 'featured' : ''}">
            <div class="plan-header">
                <h3>${plan.name}</h3>
                <div class="plan-price">₹${parseFloat(plan.price).toFixed(2)}<span>/month</span></div>
            </div>
            <div class="plan-features">
                ${(plan.features || []).map(feature => `<div class="feature">✓ ${feature}</div>`).join('')}
            </div>
            <button class="plan-btn ${plan.featured ? 'featured' : ''}"
                    data-plan-id="${plan.id}"
                    data-plan="${plan.name}"
                    data-price="${plan.price}">
                ${plan.featured ? 'Choose Premium' : 'Select Plan'}
            </button>
        </div>
    `).join('');
    
    plansContainer.innerHTML = planHTML;
}

// Expose functions globally for onclick handlers
window.login = login;
window.signup = signup;
window.logout = logout;
window.clearMessage = clearMessage;

// Popup notification function - ADD THIS TO SCRIPT.JS
function showPopupNotification(message) {
    // Remove existing popup if present
    let existingPopup = document.getElementById('cart-popup-notification');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create new popup
    const popup = document.createElement('div');
    popup.id = 'cart-popup-notification';
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';
    popup.style.backgroundColor = '#4CAF50';
    popup.style.color = 'white';
    popup.style.padding = '15px 20px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    popup.style.zIndex = '10000';
    popup.style.fontSize = '14px';
    popup.style.fontWeight = '500';
    popup.style.opacity = '0';
    popup.style.transform = 'translateX(100%)';
    popup.style.transition = 'all 0.3s ease';
    popup.textContent = message;
    
    document.body.appendChild(popup);
    
    // Animate in
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateX(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 300);
    }, 3000);
}

