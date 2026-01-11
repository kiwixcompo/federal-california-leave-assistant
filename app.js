class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Pro Version)...');
            
            // Initialize basic properties
            console.log('📝 Setting up basic properties...');
            this.currentUser = null;
            this.sessionToken = null;
            this.idleTimer = null;
            this.idleTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
            this.trialTimerInterval = null; // For countdown timer
            this.serverRunning = false;
            this.lastConversation = {}; // Store conversation context for regeneration and follow-ups
            
            // Initialize users from localStorage for client-side fallback
            console.log('💾 Loading user data...');
            this.users = this.loadUsers();
            
            console.log('⚙️ Loading payment config...');
            this.paymentConfig = this.loadPaymentConfig();
            
            // Check for stored session
            console.log('🔐 Checking stored session...');
            this.sessionToken = localStorage.getItem('sessionToken');
            
            // Update footer year
            console.log('📅 Updating footer year...');
            this.updateFooterYear();
            
            // Start App
            console.log('🚀 Starting app initialization...');
            this.init();
            
            console.log('⏰ Setting up idle timer...');
            this.setupIdleTimer();
            
            console.log('✅ Constructor completed successfully');
        } catch (error) {
            console.error('❌ Critical Init Error:', error);
            console.error('❌ Error stack:', error.stack);
            this.logError(error, 'Constructor', { phase: 'initialization' });
            setTimeout(() => this.showPage('loginPage'), 100);
        }
    }

    // ==========================================
    // API CONNECTION HELPER (The Fix)
    // ==========================================
    getApiUrl(endpoint) {
        // For production/Netlify deployment, use client-side storage for admin functions
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('⚠️ Production environment detected. Using client-side admin functionality.');
            
            // Return null for server-dependent endpoints, but allow admin functions to work client-side
            const clientSideEndpoints = [
                'admin/generate-access-code',
                'admin/access-codes', 
                'admin/api-settings',
                'admin/test-api-key',
                'config'
            ];
            
            if (clientSideEndpoints.some(ep => endpoint.includes(ep))) {
                return 'client-side'; // Special flag for client-side handling
            }
            
            return null; // This will force fallback to client-only mode for other endpoints
        }
        
        // If the app is loaded from port 3001, use relative path
        if (window.location.port === '3001') {
            return `/api/${endpoint}`;
        }
        
        // Otherwise, force connection to the backend port 3001
        // This fixes the "http://localhost/api/..." 404 error
        const hostname = window.location.hostname || 'localhost';
        return `http://${hostname}:3001/api/${endpoint}`;
    }

    // ==========================================
    // ERROR LOGGING SYSTEM
    // ==========================================
    
    async logError(error, context = 'Unknown', additionalInfo = {}) {
        try {
            const timestamp = new Date().toISOString();
            const errorData = {
                timestamp,
                context,
                message: error.message || error.toString(),
                stack: error.stack || 'No stack trace available',
                url: window.location.href,
                userAgent: navigator.userAgent,
                user: this.currentUser ? {
                    id: this.currentUser.id,
                    email: this.currentUser.email,
                    isAdmin: this.currentUser.isAdmin
                } : null,
                additionalInfo
            };
            
            // Log to console for immediate debugging
            console.error(`❌ [${context}] Error logged:`, errorData);
            
            // Store in localStorage as backup
            this.storeErrorInLocalStorage(errorData);
            
            // Try to send to server for file logging
            await this.sendErrorToServer(errorData);
            
        } catch (loggingError) {
            console.error('❌ Failed to log error:', loggingError);
            // Fallback: at least store in localStorage
            try {
                this.storeErrorInLocalStorage({
                    timestamp: new Date().toISOString(),
                    context: 'Error Logging Failed',
                    message: `Original: ${error.message || error.toString()}, Logging Error: ${loggingError.message}`,
                    url: window.location.href
                });
            } catch (fallbackError) {
                console.error('❌ Complete error logging failure:', fallbackError);
            }
        }
    }
    
    storeErrorInLocalStorage(errorData) {
        try {
            const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]');
            existingErrors.push(errorData);
            
            // Keep only last 100 errors to prevent localStorage bloat
            if (existingErrors.length > 100) {
                existingErrors.splice(0, existingErrors.length - 100);
            }
            
            localStorage.setItem('errorLog', JSON.stringify(existingErrors));
        } catch (storageError) {
            console.error('❌ Failed to store error in localStorage:', storageError);
        }
    }
    
    async sendErrorToServer(errorData) {
        try {
            const apiUrl = this.getApiUrl('log-error');
            
            // Only try server logging if we have a server connection
            if (apiUrl && apiUrl !== 'client-side' && this.serverRunning) {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': this.sessionToken ? `Bearer ${this.sessionToken}` : ''
                    },
                    body: JSON.stringify(errorData)
                });
                
                if (!response.ok) {
                    throw new Error(`Server error logging failed: ${response.status}`);
                }
            } else {
                // In production/client-only mode, we can't write to server files
                // The localStorage backup is our primary logging method
                console.log('📝 Error logged to localStorage (client-only mode)');
            }
        } catch (serverError) {
            console.warn('⚠️ Server error logging failed, using localStorage only:', serverError.message);
        }
    }
    
    // Method to retrieve error logs (useful for debugging)
    getErrorLogs() {
        try {
            return JSON.parse(localStorage.getItem('errorLog') || '[]');
        } catch (error) {
            console.error('❌ Failed to retrieve error logs:', error);
            return [];
        }
    }
    
    // Method to clear error logs
    clearErrorLogs() {
        try {
            localStorage.removeItem('errorLog');
            console.log('✅ Error logs cleared');
        } catch (error) {
            console.error('❌ Failed to clear error logs:', error);
        }
    }
    
    // Method to display error logs in console (useful for debugging)
    showErrorLogs() {
        try {
            const logs = this.getErrorLogs();
            if (logs.length === 0) {
                console.log('📝 No error logs found');
                return;
            }
            
            console.log(`📝 Found ${logs.length} error log(s):`);
            logs.forEach((log, index) => {
                console.group(`Error ${index + 1} - ${log.timestamp}`);
                console.log('Context:', log.context);
                console.log('Message:', log.message);
                console.log('URL:', log.url);
                console.log('User:', log.user || 'Anonymous');
                if (log.stack) console.log('Stack:', log.stack);
                if (log.additionalInfo && Object.keys(log.additionalInfo).length > 0) {
                    console.log('Additional Info:', log.additionalInfo);
                }
                console.groupEnd();
            });
        } catch (error) {
            console.error('❌ Failed to display error logs:', error);
        }
    }
    
    // Test method for error logging (can be called from browser console)
    testErrorLogging() {
        console.log('🧪 Testing error logging system...');
        const testError = new Error('This is a test error for logging verification');
        this.logError(testError, 'Error Logging Test', { 
            testData: 'This is test data',
            timestamp: Date.now()
        });
        console.log('✅ Test error logged. Check localStorage or server logs.');
    }

    // ==========================================
    // LANDING PAGE FUNCTIONALITY
    // ==========================================

    showDemo() {
        // Show a demo of the tool functionality
        this.showSuccess('Demo feature coming soon! Sign up for free trial to experience the full functionality.');
    }

    toggleMobileMenu() {
        // Mobile menu toggle functionality
        const navMenu = document.querySelector('.nav-menu');
        const toggleButton = document.getElementById('mobileMenuToggle');
        
        if (navMenu && toggleButton) {
            const isOpen = navMenu.classList.contains('mobile-open');
            navMenu.classList.toggle('mobile-open');
            toggleButton.setAttribute('aria-expanded', !isOpen);
            
            // Update icon
            const icon = toggleButton.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'fas fa-bars' : 'fas fa-times';
            }
        }
    }

    copyOutput(tool) {
        const outputElement = document.getElementById(`${tool}Output`);
        if (outputElement && outputElement.textContent) {
            navigator.clipboard.writeText(outputElement.textContent).then(() => {
                this.showSuccess('Response copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = outputElement.textContent;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showSuccess('Response copied to clipboard!');
            });
        } else {
            this.showError('No response to copy');
        }
    }

    // ==========================================
    // INITIALIZATION & AUTH
    // ==========================================

    async init() {
        try {
            console.log('🔄 Starting initialization...');
            
            // Hide pages
            document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
            
            this.bindEvents();
            console.log('✅ Events bound successfully');
            
            // Check server status
            await this.checkServerStatus();
            
            // URL Parameter Checks
            const urlParams = new URLSearchParams(window.location.search);
            
            // Email verification
            if (urlParams.get('verify')) {
                console.log('🔗 Email verification token detected');
                await this.verifyEmailToken(urlParams.get('verify'));
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Payment success
            if (urlParams.get('session_id') || window.location.pathname.includes('payment-success')) {
                console.log('💳 Payment success detected');
                this.showPage('paymentSuccessPage');
                this.showSuccess('Payment completed successfully!');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Payment cancelled
            if (window.location.pathname.includes('payment-cancelled')) {
                console.log('❌ Payment cancelled detected');
                this.showPage('paymentCancelledPage');
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Session Check
            if (this.sessionToken) {
                console.log('👤 Existing session found, validating...');
                const isValid = await this.validateSession();
                if (isValid) {
                    console.log('✅ Session valid, checking subscription');
                    this.checkSubscriptionAndRedirect();
                } else {
                    console.log('❌ Session invalid, showing landing page');
                    this.sessionToken = null;
                    localStorage.removeItem('sessionToken');
                    this.showPage('landingPage');
                }
            } else {
                console.log('🆕 No existing session, showing landing page');
                this.showPage('landingPage');
            }
            
            this.hideLoading();
            console.log('✅ Initialization complete');
            
        } catch (error) {
            console.error('❌ Initialization Error:', error);
            this.logError(error, 'Initialization', { phase: 'app_init' });
            this.hideLoading();
            this.showPage('loginPage');
            this.showError('Application failed to initialize. Please refresh the page.');
        }
    }

    // UI Helpers
    showPage(id) { 
        console.log(`📄 Showing page: ${id}`);
        
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        console.log(`📄 Found ${pages.length} pages to hide`);
        
        pages.forEach(page => {
            page.classList.add('hidden');
        });
        
        // Show target page
        const targetPage = document.getElementById(id);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            console.log(`✅ Successfully showed page: ${id}`);
        } else {
            console.error(`❌ Page not found: ${id}`);
        }
    }

    hideSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
    showLoading() { document.getElementById('loading').classList.remove('hidden'); }
    hideLoading() { document.getElementById('loading').classList.add('hidden'); }
    
    showSuccess(msg) { this.showToast(msg, 'success'); }
    showError(msg) { this.showToast(msg, 'error'); }
    
    showToast(message, type) {
        try {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
                <span>${message}</span>
            `;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, type === 'error' ? 4000 : 3000);
        } catch (error) {
            console.error('❌ Toast display error:', error);
            this.logError(error, 'Toast Display', { message, type });
            // Fallback: use browser alert
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    bindEvents() {
        console.log('🔗 Binding events...');
        
        // Landing page navigation
        const loginBtn = document.getElementById('loginBtn');
        const getStartedBtn = document.getElementById('getStartedBtn');
        const startTrialBtn = document.getElementById('startTrialBtn');
        
        console.log('🔍 Button elements found:', {
            loginBtn: !!loginBtn,
            getStartedBtn: !!getStartedBtn,
            startTrialBtn: !!startTrialBtn
        });
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('🔘 Login button clicked');
                this.showPage('loginPage');
            });
        }
        
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => {
                console.log('🔘 Get Started button clicked');
                this.showPage('registerPage');
            });
        }
        
        if (startTrialBtn) {
            startTrialBtn.addEventListener('click', () => {
                console.log('🔘 Start Trial button clicked');
                this.showPage('registerPage');
            });
        }
        
        document.getElementById('watchDemoBtn')?.addEventListener('click', () => this.showDemo());
        document.getElementById('finalCtaBtn')?.addEventListener('click', () => this.showPage('registerPage'));
        
        // Mobile menu toggle
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => this.toggleMobileMenu());
        
        // Navigation between pages
        const showRegisterEl = document.getElementById('showRegister');
        const showLoginEl = document.getElementById('showLogin');
        if (showRegisterEl) showRegisterEl.onclick = () => this.showPage('registerPage');
        if (showLoginEl) showLoginEl.onclick = () => this.showPage('loginPage');
        
        // Back to homepage buttons
        document.getElementById('backToHomepageFromLogin')?.addEventListener('click', () => {
            console.log('🔘 Back to homepage from login clicked');
            this.showPage('landingPage');
        });
        document.getElementById('backToHomepageFromRegister')?.addEventListener('click', () => {
            console.log('🔘 Back to homepage from register clicked');
            this.showPage('landingPage');
        });
        document.getElementById('backToHomepage')?.addEventListener('click', () => {
            console.log('🔘 Back to homepage clicked');
            this.showPage('landingPage');
        });
        
        // Footer modal links
        document.getElementById('termsLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Terms link clicked');
            document.getElementById('termsModal')?.classList.remove('hidden');
        });
        document.getElementById('refundPolicyLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Refund policy link clicked');
            document.getElementById('refundPolicyModal')?.classList.remove('hidden');
        });
        document.getElementById('whatItDoesLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 What it does link clicked');
            document.getElementById('whatItDoesModal')?.classList.remove('hidden');
        });
        document.getElementById('quickStartLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Quick start link clicked');
            document.getElementById('quickStartModal')?.classList.remove('hidden');
        });
        document.getElementById('accessLicensingLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Access licensing link clicked');
            document.getElementById('accessLicensingModal')?.classList.remove('hidden');
        });
        
        // Inline terms link in registration form
        document.getElementById('termsLinkInline')?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Inline terms link clicked');
            document.getElementById('termsModal')?.classList.remove('hidden');
        });
        
        // Smooth scrolling for navigation links (but prevent default for modal links)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            // Skip modal links - they're handled above
            if (anchor.id && (anchor.id.includes('Link') || anchor.id.includes('Modal'))) {
                return;
            }
            
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Only do smooth scrolling for actual page sections, not modal triggers
                if (href.length > 1) { // More than just "#"
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
        
        console.log('✅ All events bound successfully');
    }

    // Data Loaders
    loadUsers() { 
        const u = localStorage.getItem('users'); 
        const users = u ? JSON.parse(u) : [{ 
            id: 'admin-001',
            firstName: 'Admin',
            lastName: 'User',
            email: 'talk2char@gmail.com',
            password: 'Password@123',
            isAdmin: true,
            emailVerified: true,
            createdAt: Date.now(),
            subscriptionExpiry: null
        }];
        return users;
    }
    saveUsers(u) { localStorage.setItem('users', JSON.stringify(u)); }
    
    loadPaymentConfig() { 
        const c = localStorage.getItem('paymentConfig'); 
        const config = c ? JSON.parse(c) : {};
        return config;
    }

    updateFooterYear() {
        const currentYear = new Date().getFullYear();
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = currentYear;
        }
    }

    async checkServerStatus() {
        try {
            const url = this.getApiUrl('health');
            
            // If no URL (production environment), skip server check
            if (!url) {
                console.log('🌐 Production environment - running in client-only mode');
                this.serverRunning = false;
                return;
            }
            
            console.log(`📡 Connecting to backend at: ${url}`);
            
            // Use AbortController for timeout instead of timeout option (not supported in fetch)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch(url, { 
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    console.log('✅ Server connection established');
                    this.serverRunning = true;
                } else {
                    console.warn('⚠️ Server responded with error:', response.status);
                    this.serverRunning = false;
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.warn('⚠️ Server check timed out after 5 seconds');
                } else {
                    throw fetchError;
                }
            }
        } catch (error) {
            console.warn('⚠️ Server check failed. Running in client-only mode.');
            console.warn('Error details:', error.message);
            this.logError(error, 'Server Check', { phase: 'connection_test' });
            this.serverRunning = false;
        }
    }

    setupIdleTimer() {
        // Events that reset the idle timer
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, () => this.resetIdleTimer(), true);
        });
        
        this.resetIdleTimer();
    }

    resetIdleTimer() {
        // Only track idle time if user is logged in
        if (!this.currentUser) return;
        
        // Clear existing timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        // Set new timer
        this.idleTimer = setTimeout(() => {
            this.showError('Session expired due to inactivity. Please log in again.');
            setTimeout(() => this.logout(), 2000);
        }, this.idleTimeout);
    }

    async validateSession() {
        if (!this.sessionToken) return false;
        
        // Check if it's a client-side token
        if (this.sessionToken.startsWith('client-side-token-')) {
            // Validate client-side session
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    this.currentUser = JSON.parse(storedUser);
                    // Verify user still exists in local storage
                    const user = this.findUser(this.currentUser.email);
                    if (user) {
                        this.currentUser = { ...user }; // Refresh user data
                        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                        return true;
                    }
                } catch (error) {
                    console.error('Client-side session validation error:', error);
                }
            }
            return false;
        }
        
        // Server-side session validation
        const apiUrl = this.getApiUrl('user/profile');
        if (!apiUrl || !this.serverRunning) {
            // Server not available, try client-side validation
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    this.currentUser = JSON.parse(storedUser);
                    const user = this.findUser(this.currentUser.email);
                    if (user) {
                        this.currentUser = { ...user };
                        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                        return true;
                    }
                } catch (error) {
                    console.error('Client-side session validation error:', error);
                }
            }
            return false;
        }
        
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Session validation error:', error);
            this.logError(error, 'Session Validation', { type: 'server_side' });
            // Fall back to client-side validation
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    this.currentUser = JSON.parse(storedUser);
                    const user = this.findUser(this.currentUser.email);
                    if (user) {
                        this.currentUser = { ...user };
                        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                        return true;
                    }
                } catch (err) {
                    console.error('Client-side session validation error:', err);
                    this.logError(err, 'Session Validation', { type: 'client_side_fallback' });
                }
            }
            return false;
        }
    }

    checkSubscriptionAndRedirect() {
        if (this.currentUser.isAdmin) {
            this.showPage('adminDashboard');
            this.resetIdleTimer(); // Start idle timer for admin
            return;
        }

        // Ensure user has required properties (migration for existing users)
        if (!this.currentUser.createdAt) {
            this.currentUser.createdAt = Date.now();
            this.updateUserRecord(this.currentUser);
            console.log('✅ Set createdAt for existing user');
        }

        const status = this.getSubscriptionStatus(this.currentUser);
        document.getElementById('userWelcomeName').textContent = this.currentUser.firstName;
        
        if (status.active) {
            this.showPage('dashboard');
            this.resetIdleTimer(); // Start idle timer for regular users
        } else {
            this.showPage('subscriptionPage');
            this.resetIdleTimer(); // Start idle timer even on subscription page
        }
    }

    getSubscriptionStatus(user) {
        const now = Date.now();
        const created = user.createdAt || now;
        
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() > now) {
            return { active: true, type: 'subscription', expiry: new Date(user.subscriptionExpiry).getTime() };
        }

        const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
        const trialEnd = created + trialDuration;
        
        if (now < trialEnd) {
            return { active: true, type: 'trial', expiry: trialEnd };
        }

        return { active: false, type: 'expired' };
    }

    findUser(email) { 
        const user = this.users.find(u => u.email === email);
        
        // Migrate existing users to have required properties if they don't have them
        if (user && !user.createdAt) {
            user.createdAt = Date.now();
            this.saveUsers(this.users);
            console.log(`✅ Migrated user ${email} to have createdAt`);
        }
        
        return user;
    }
    
    updateUserRecord(user) {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = user;
            this.saveUsers(this.users);
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    }

    async logout() {
        try {
            if (this.sessionToken) {
                // Clear session on server if available
                const apiUrl = this.getApiUrl('auth/logout');
                if (apiUrl && this.serverRunning) {
                    try {
                        await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
                        });
                    } catch (error) {
                        console.warn('Server logout failed:', error);
                    }
                }
            }
            
            // Clear local session
            this.currentUser = null;
            this.sessionToken = null;
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('currentUser');
            
            // Clear timers
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
            }
            
            if (this.trialTimerInterval) {
                clearInterval(this.trialTimerInterval);
                this.trialTimerInterval = null;
            }
            
            // Redirect to landing page
            this.showPage('landingPage');
            this.showSuccess('Logged out successfully');
            
        } catch (error) {
            console.error('Logout error:', error);
            this.logError(error, 'Logout', { user: this.currentUser?.email });
            // Force logout even if there's an error
            this.currentUser = null;
            this.sessionToken = null;
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('currentUser');
            this.showPage('landingPage');
        }
    }
}

// Global error handlers to prevent refresh loops
window.addEventListener('error', (event) => {
    console.error('❌ Global JavaScript error caught:', event.error);
    console.error('❌ Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
    });
    
    // Log error if app is available
    if (window.app && typeof window.app.logError === 'function') {
        window.app.logError(event.error || new Error(event.message), 'Global Error Handler', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }
    
    // Prevent default error handling that might cause refresh
    event.preventDefault();
    return false;
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    
    // Log error if app is available
    if (window.app && typeof window.app.logError === 'function') {
        const error = event.reason instanceof Error ? event.reason : new Error(event.reason);
        window.app.logError(error, 'Unhandled Promise Rejection', {
            reason: event.reason
        });
    }
    
    // Prevent default error handling
    event.preventDefault();
});

// Start
let app;
document.addEventListener('DOMContentLoaded', () => { 
    try {
        console.log('🚀 DOM loaded, starting app...');
        
        // Check if required elements exist
        const requiredElements = ['landingPage', 'loginPage', 'registerPage'];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('❌ Missing required page elements:', missingElements);
        }
        
        // Test if basic DOM elements exist
        console.log('🔍 Testing DOM elements...');
        console.log('loginBtn exists:', !!document.getElementById('loginBtn'));
        console.log('getStartedBtn exists:', !!document.getElementById('getStartedBtn'));
        
        app = new LeaveAssistantApp(); 
        
        // Make app globally accessible for debugging
        window.app = app;
        
        console.log('✅ App initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to start app:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Try to log error even if app failed to initialize
        try {
            if (window.app && typeof window.app.logError === 'function') {
                window.app.logError(error, 'App Initialization Failure');
            } else {
                // Fallback error logging to localStorage
                const errorData = {
                    timestamp: new Date().toISOString(),
                    context: 'App Initialization Failure',
                    message: error.message || error.toString(),
                    stack: error.stack || 'No stack trace available',
                    url: window.location.href,
                    userAgent: navigator.userAgent
                };
                
                const existingErrors = JSON.parse(localStorage.getItem('errorLog') || '[]');
                existingErrors.push(errorData);
                localStorage.setItem('errorLog', JSON.stringify(existingErrors));
            }
        } catch (loggingError) {
            console.error('❌ Failed to log initialization error:', loggingError);
        }
        
        // Show error message to user without causing refresh
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; background: white; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000;';
        errorDiv.innerHTML = `
            <h2 style="color: #ef4444;">Application Error</h2>
            <p>Failed to initialize the Leave Assistant application.</p>
            <p style="color: #666; font-size: 14px;">Please refresh the page or contact support if the problem persists.</p>
            <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #0023F5; color: white; border: none; border-radius: 5px; cursor: pointer;">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
});