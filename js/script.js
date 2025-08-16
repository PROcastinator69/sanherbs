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
    updateCartCount();

    if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
        checkAuth();
    }

    if (window.location.pathname === '/marketplace' || window.location.pathname === '/marketplace.html') {
        loadProducts();
    }

    if (window.location.pathname === '/plans' || window.location.pathname === '/plans.html') {
        loadPlans();
    }
    // ❌ COMMENT OUT THIS LINE TO FIX 404 ERROR
    // if (authToken) {
    //     loadUserProfile();
    // }
});

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

function setAuthMode(isSignup) {
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const toggleText = document.getElementById("toggleText");
    isSignupMode = isSignup;
    if (isSignupMode) {
        if (authTitle) authTitle.textContent = "Create Account";
        if (authSubtitle) authSubtitle.textContent = "Join SanHerbs today";
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "block";
        if (toggleText) {
            toggleText.innerHTML = `Already have an account? <a href="#" id="toggleLink">Sign in here</a>`;
        }
    } else {
        if (authTitle) authTitle.textContent = "Welcome Back";
        if (authSubtitle) authSubtitle.textContent = "Sign in to your SanHerbs account";
        if (loginBtn) loginBtn.style.display = "block";
        if (signupBtn) signupBtn.style.display = "none";
        if (toggleText) {
            toggleText.innerHTML = `Don't have an account? <a href="#" id="toggleLink">Sign up here</a>`;
        }
    }
    const newToggleLink = document.getElementById("toggleLink");
    if (newToggleLink) {
        newToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode();
        });
    }
    clearMessage();
}

function initializeAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const toggleLink = document.getElementById('toggleLink');
    const logoutBtn = document.getElementById('logoutBtn');
    setAuthMode(false);
    if (loginBtn) loginBtn.addEventListener('click', login);
    if (signupBtn) signupBtn.addEventListener('click', signup);
    if (toggleLink) toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function initializeProductOrdering() {
    document.addEventListener('click', function(event) {
        const addToCartBtn = event.target.closest('.add-to-cart-btn');
        if (addToCartBtn) {
            event.preventDefault();
            const productName = addToCartBtn.getAttribute('data-product');
            const price = addToCartBtn.getAttribute('data-price');
            const productId = addToCartBtn.getAttribute('data-product-id');
            const image = addToCartBtn.getAttribute('data-image');
            const category = addToCartBtn.getAttribute('data-category');
            if (!productName || !price) {
                showMessage("❌ Product information missing", "error");
                return;
            }
            addToCart({
                id: productId || `product_${Date.now()}`,
                name: productName,
                price: price,
                image: image,
                category: category
            });
            showPopupNotification(`${productName} +1 added to cart`);
        }
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

function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
        });
    });
    updateNavigation();
}

function updateNavigation() {
    const loginNavItem = document.querySelector('.login-nav');
    const logoutNavItem = document.querySelector('.logout-nav');
    if (authToken) {
        if (loginNavItem) loginNavItem.style.display = 'none';
        if (logoutNavItem) logoutNavItem.style.display = 'block';
    } else {
        if (loginNavItem) loginNavItem.style.display = 'block';
        if (logoutNavItem) logoutNavItem.style.display = 'none';
    }
}

// Cart Functions
function addToCart(product) {
    try {
        let cart = JSON.parse(localStorage.getItem('sanherbs_cart')) ||
                  JSON.parse(localStorage.getItem('greentap_cart')) ||
                  JSON.parse(localStorage.getItem('cart')) || [];
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
        localStorage.setItem('sanherbs_cart', JSON.stringify(cart));
        localStorage.setItem('greentap_cart', JSON.stringify(cart));
        localStorage.setItem('cart', JSON.stringify(cart));
        showMessage(`✅ ${product.name} added to cart!`, "success");
        updateCartCount();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage("❌ Failed to add item to cart", "error");
    }
}

function buyNow(product) {
    if (!authToken) {
        showMessage("Please login to make a purchase", "error");
        setTimeout(() => {
            window.location.href = '/login.html?redirect=checkout';
        }, 1500);
        return;
    }
    addToCart(product);
    setTimeout(() => {
        window.location.href = '/cart.html';
    }, 1000);
}

function subscribePlan(plan) {
    if (!authToken) {
        showMessage("Please login to subscribe to a plan", "error");
        setTimeout(() => {
            window.location.href = '/login.html?redirect=plans';
        }, 1500);
        return;
    }
    const planData = {
        id: plan.id || `plan_${Date.now()}`,
        name: plan.name,
        price: parseFloat(plan.price),
        type: 'subscription'
    };
    localStorage.setItem('checkoutPlan', JSON.stringify(planData));
    window.location.href = '/checkout.html';
}

function updateCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('sanherbs_cart')) ||
                     JSON.parse(localStorage.getItem('greentap_cart')) ||
                     JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0);
        const cartCountElements = document.querySelectorAll('.cart-count');
        cartCountElements.forEach(element => {
            if (element) {
                element.textContent = cartCount;
                element.style.display = cartCount > 0 ? 'inline-flex' : 'none';
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

// Product & Plan Filtering/Search
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.getAttribute('data-category');
            filterProducts(category);
        });
    });
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
            card.style.display = cardCategories.includes(category) ? 'block' : 'none';
        }
    });
}

function searchProducts(searchTerm) {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const productName = card.querySelector('h3')?.textContent?.toLowerCase() || '';
        const productDescription = card.querySelector('.product-subtitle')?.textContent?.toLowerCase() || '';
        card.style.display = (productName.includes(searchTerm) || productDescription.includes(searchTerm)) ? 'block' : 'none';
    });
}

// API Helper Functions
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
        const response = await fetch(url, finalOptions);
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    } catch (error) {
        if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
            throw new Error('Cannot connect to server. Please check your internet connection.');
        }
        throw error;
    }
}

// Message Display
function showMessage(message, type = "error") {
    const msg = document.getElementById("message");
    if (msg) {
        msg.innerHTML = `
            ${message}
            <button onclick="clearMessage()" style="float: right; background: none; border: none; color: inherit; font-size: 18px; cursor: pointer;">&times;</button>
        `;
        msg.className = `message ${type}`;
        msg.style.display = 'block';
        if (msg.hideTimeout) clearTimeout(msg.hideTimeout);
        const hideTime = type === "error" ? 15000 : 8000;
        msg.hideTimeout = setTimeout(() => { msg.style.display = 'none'; }, hideTime);
    }
}

function clearMessage() {
    const msg = document.getElementById("message");
    if (msg) {
        if (msg.hideTimeout) clearTimeout(msg.hideTimeout);
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

// Authentication Functions
async function login() {
    const mobile = document.getElementById("mobile")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    if (!validateInputs(mobile, password)) return;
    try {
        showMessage("Logging in...", "success");
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.token) {
                authToken = data.token;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('user', JSON.stringify(data.user));
                showMessage("✅ Login successful!", "success");
                updateNavigation();
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                setTimeout(() => {
                    if (redirect === 'checkout') window.location.href = '/checkout.html';
                    else if (redirect === 'plans') window.location.href = '/plans.html';
                    else window.location.href = '/';
                }, 1000);
            } else {
                throw new Error(data.message || 'Invalid login response - no token received');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Login failed with status: ${response.status}`);
        }
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage(`❌ Cannot connect to server. Backend: ${API_BASE_URL}`, "error");
        } else {
            showMessage(`❌ ${error.message}`, "error");
        }
    }
}

async function signup() {
    const mobile = document.getElementById("mobile")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    if (!validateInputs(mobile, password)) return;
    try {
        showMessage("Creating account...", "success");
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showMessage("✅ " + data.message, "success");
                setTimeout(() => {
                    setAuthMode(false);
                    const mobileInput = document.getElementById("mobile");
                    const passwordInput = document.getElementById("password");
                    if (mobileInput) mobileInput.value = mobile;
                    if (passwordInput) passwordInput.value = "";
                }, 1500);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Registration failed with status: ${response.status}`);
        }
    } catch (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showMessage("❌ Cannot connect to server. Backend URL: " + API_BASE_URL, "error");
        } else {
            showMessage("❌ " + error.message, "error");
        }
    }
}

async function loadUserProfile() {
    try {
        const response = await apiCall('/api/users/profile');
        if (response.success && response.user) {
            const user = response.user;
            localStorage.setItem('user', JSON.stringify(user));
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

// Expose functions for onclick handlers
window.login = login;
window.signup = signup;
window.logout = logout;
window.clearMessage = clearMessage;

// Popup notification
function showPopupNotification(message) {
    let existingPopup = document.getElementById('cart-popup-notification');
    if (existingPopup) existingPopup.remove();
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
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateX(0)';
    }, 10);
    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (popup.parentNode) popup.remove();
        }, 300);
    }, 3000);
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

function initializeProfileTabs() {
    const tabButtons = document.querySelectorAll('.profile-tab-btn');
    const tabContents = document.querySelectorAll('.profile-tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

function initializeAnimations() {
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
    document.querySelectorAll('.product-card, .feature-card, .plan-card').forEach(el => {
        observer.observe(el);
    });
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    if (token && user) window.location.href = '/';
}

async function loadProducts() {
    try {
        const response = await apiCall('/api/products');
        if (response.success && response.products) {
            renderProducts(response.products);
        }
    } catch (error) {
        // fallback logic here
    }
}

function renderProducts(products) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    const productHTML = products.map(product => `
        <div class="product-card" data-category="${product.category}">
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" loading="lazy">` : '💊'}
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

async function loadPlans() {
    try {
        const response = await apiCall('/api/plans');
        if (response.success && response.plans) {
            renderPlans(response.plans);
        }
    } catch (error) {
        // fallback logic here
    }
}

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
