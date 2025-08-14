// Global Variables
let isSignupMode = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeAuth();
    initializeFilters();
    initializeProfileTabs();
    initializeAnimations();
    initializeProductOrdering();
    initializePlanSubscription();

    // Update cart count on page load
    updateCartCount();

    // Check if user is already logged in
    if (window.location.pathname === '/login' || window.location.pathname === '/login.html') {
        checkAuth();
    }

    // Load products if on marketplace page
    if (window.location.pathname === '/marketplace' || window.location.pathname === '/marketplace.html') {
        loadProducts();
    }

    // Load plans if on plans page
    if (window.location.pathname === '/plans' || window.location.pathname === '/plans.html') {
        loadPlans();
    }
});

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
        toggleLink.addEventListener('click', toggleAuthMode);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// NEW: Set Authentication Mode Function
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
        if (authSubtitle) authSubtitle.textContent = "Join GreenTap Health today";
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "block";
        if (toggleText) {
            toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Sign in here</a>';
        }
    } else {
        // LOGIN MODE (Default)
        if (authTitle) authTitle.textContent = "Welcome Back";
        if (authSubtitle) authSubtitle.textContent = "Sign in to your GreenTap Health account";
        if (loginBtn) loginBtn.style.display = "block";
        if (signupBtn) signupBtn.style.display = "none";
        if (toggleText) {
            toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Sign up here</a>';
        }
    }

    // Re-attach event listener to the new toggleLink
    const newToggleLink = document.getElementById("toggleLink");
    if (newToggleLink) {
        newToggleLink.addEventListener('click', toggleAuthMode);
    }

    clearMessage();
}

// Product Ordering Initialization - NO WHATSAPP
function initializeProductOrdering() {
    const productButtons = document.querySelectorAll('.add-to-cart-btn');
    const buyNowButtons = document.querySelectorAll('.buy-now-btn');

    productButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Add to cart clicked');
            
            const productName = this.getAttribute('data-product');
            const price = this.getAttribute('data-price');
            const productId = this.getAttribute('data-product-id');
            
            console.log('Product data:', { productName, price, productId });
            
            if (productName && price) {
                addToCart(productName, price, productId);
            } else {
                console.error('Missing product data');
                showMessage("❌ Product information missing", "error");
            }
        });
    });

    buyNowButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Buy now clicked');
            
            const productName = this.getAttribute('data-product');
            const price = this.getAttribute('data-price');
            
            console.log('Buy now data:', { productName, price });
            
            if (productName && price) {
                buyNow(productName, price);
            } else {
                console.error('Missing product data');
                showMessage("❌ Product information missing", "error");
            }
        });
    });
}

// Plan Subscription Initialization - NO WHATSAPP
function initializePlanSubscription() {
    const planButtons = document.querySelectorAll('.plan-btn');

    planButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const planName = this.getAttribute('data-plan');
            const price = this.getAttribute('data-price');
            if (planName && price) {
                subscribePlan(planName, price);
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
}

// Cart Functions - ONLINE PAYMENT ONLY
function addToCart(productName, price, productId = null) {
    console.log('Adding to cart:', { productName, price, productId });
    
    try {
        // Add to cart functionality
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        const existingItem = cart.find(item => item.name === productName);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: productId || Date.now(),
                name: productName,
                price: parseFloat(price),
                quantity: 1
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        showMessage(`✅ ${productName} added to cart!`, "success");
        updateCartCount();
        
        console.log('Cart updated:', cart);
    } catch (error) {
        console.error('Error adding to cart:', error);
        showMessage("❌ Failed to add item to cart", "error");
    }
}

function buyNow(productName, price) {
    console.log('Buy now:', { productName, price });
    
    try {
        // Redirect to checkout with this item
        const item = {
            id: Date.now(),
            name: productName,
            price: parseFloat(price),
            quantity: 1
        };
        
        localStorage.setItem('checkoutItem', JSON.stringify(item));
        window.location.href = '/checkout.html';
    } catch (error) {
        console.error('Error in buy now:', error);
        showMessage("❌ Failed to proceed to checkout", "error");
    }
}

function subscribePlan(planName, price) {
    console.log('Subscribe to plan:', { planName, price });
    
    try {
        // Redirect to subscription checkout
        const plan = {
            id: Date.now(),
            name: planName,
            price: parseFloat(price),
            type: 'subscription'
        };
        
        localStorage.setItem('checkoutPlan', JSON.stringify(plan));
        window.location.href = '/checkout.html';
    } catch (error) {
        console.error('Error in plan subscription:', error);
        showMessage("❌ Failed to proceed to subscription", "error");
    }
}

// Cart count update
function updateCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = cart.reduce((total, item) => total + (item.quantity || 0), 0);
        const cartCountElement = document.querySelector('.cart-count');
        
        console.log('Updating cart count:', cartCount);
        
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? 'inline-flex' : 'none';
        }
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

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');

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
        console.log('Making API call to:', url);
        const response = await fetch(url, finalOptions);
        const data = await response.json();

        console.log('API response:', { status: response.status, data });

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Message Display Functions
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

    // Clean mobile number
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

// Authentication Functions - FIXED VERSION (NO DEMO FALLBACK)
async function login() {
    const mobile = document.getElementById("mobile")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();

    if (!validateInputs(mobile, password)) return;

    try {
        showMessage("Logging in...", "success");

        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ mobile, password })
        });

        if (response.success) {
            authToken = response.token;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            showMessage("✅ Login successful!", "success");
            setTimeout(() => {
                window.location.href = '/'; // Redirect to home page
            }, 1000);
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Check if it's a network error (API not reachable)
        if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            showMessage("❌ Cannot connect to server. Please check if the server is running on http://localhost:3000", "error");
        } else {
            // Show the actual error from the server
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

        const response = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ mobile, password })
        });

        if (response.success) {
            showMessage("✅ Account created successfully! You can now login.", "success");
            setTimeout(() => {
                setAuthMode(false); // Switch to login mode
                
                // Keep mobile number, clear password
                if (document.getElementById("mobile")) {
                    document.getElementById("mobile").value = mobile;
                }
                if (document.getElementById("password")) {
                    document.getElementById("password").value = "";
                }
            }, 1500);
        }
    } catch (error) {
        console.error('Signup error:', error);
        
        // Check if it's a network error
        if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            showMessage("❌ Cannot connect to server. Please check if the server is running on http://localhost:3000", "error");
        } else {
            // Show the actual error from the server
            showMessage(`❌ ${error.message}`, "error");
        }
    }
}

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

function loadMain(mobile) {
    clearMessage();
    
    const authSection = document.querySelector(".auth-section");
    const mainSection = document.getElementById("main-section");
    const welcomeText = document.getElementById("welcome-text");

    if (authSection) authSection.style.display = "none";
    if (mainSection) mainSection.style.display = "block";
    if (welcomeText) welcomeText.innerText = `Welcome, ${mobile}!`;

    loadHealthTips();
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    authToken = null;

    const authSection = document.querySelector(".auth-section");
    const mainSection = document.getElementById("main-section");

    if (authSection) authSection.style.display = "block";
    if (mainSection) mainSection.style.display = "none";

    const mobileInput = document.getElementById("mobile");
    const passwordInput = document.getElementById("password");
    
    if (mobileInput) mobileInput.value = "";
    if (passwordInput) passwordInput.value = "";

    clearMessage();
    updateCartCount();
}

function loadHealthTips() {
    const tips = [
        "💡 Take supplements with meals for better absorption",
        "💧 Drink plenty of water throughout the day",
        "🏃♂️ Combine supplements with regular exercise",
        "😴 Get 7-8 hours of quality sleep",
        "🥗 Maintain a balanced diet rich in fruits and vegetables"
    ];

    const tipsContainer = document.getElementById("health-tips");
    if (tipsContainer) {
        tipsContainer.innerHTML = tips.map(tip => `<div class="tip-item">${tip}</div>`).join('');
    }
}

// Initialize profile tabs and animations (stubs)
function initializeProfileTabs() {
    // Profile tab functionality
}

function initializeAnimations() {
    // Animation initialization
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // User is already logged in, redirect to home
        window.location.href = '/';
    }
}

function loadProducts() {
    // Load products for marketplace
    console.log('Loading products...');
}

function loadPlans() {
    // Load subscription plans
    console.log('Loading plans...');
}
