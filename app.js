class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Pro Version)...');
            this.currentUser = null;
            this.sessionToken = null;
            this.idleTimer = null;
            this.idleTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
            this.trialTimerInterval = null; // For countdown timer
            this.serverRunning = false;
            
            // Initialize users from localStorage for client-side fallback
            this.users = this.loadUsers();
            this.paymentConfig = this.loadPaymentConfig();
            
            // Check for stored session
            this.sessionToken = localStorage.getItem('sessionToken');
            
            // Update footer year
            this.updateFooterYear();
            
            // 3. Start App
            this.init();
            this.setupIdleTimer();
        } catch (error) {
            console.error('❌ Critical Init Error:', error);
            setTimeout(() => this.showPage('loginPage'), 100);
        }
    }

    // ==========================================
    // API CONNECTION HELPER (The Fix)
    // ==========================================
    getApiUrl(endpoint) {
        // For production/Netlify deployment, don't try to connect to localhost
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('⚠️ Production environment detected. Server endpoints not available.');
            return null; // This will force fallback to client-only mode
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
    // LANDING PAGE FUNCTIONALITY
    // ==========================================

    showDemo() {
        // Show a demo of the tool functionality
        this.showSuccess('Demo feature coming soon! Sign up for free trial to experience the full functionality.');
    }

    toggleMobileMenu() {
        // Mobile menu toggle functionality
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.toggle('mobile-open');
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
            this.hideLoading();
            this.showPage('loginPage');
            this.showError('Application failed to initialize. Please refresh the page.');
        }
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
                }
            }
            return false;
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
            this.serverRunning = false;
        }
    }

    bindEvents() {
        // Landing page navigation
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showPage('loginPage'));
        document.getElementById('getStartedBtn')?.addEventListener('click', () => this.showPage('registerPage'));
        document.getElementById('startTrialBtn')?.addEventListener('click', () => this.showPage('registerPage'));
        document.getElementById('watchDemoBtn')?.addEventListener('click', () => this.showDemo());
        document.getElementById('finalCtaBtn')?.addEventListener('click', () => this.showPage('registerPage'));
        
        // Mobile menu toggle
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => this.toggleMobileMenu());
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Auth
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('subLogoutBtn')?.addEventListener('click', () => this.logout());

        // Navigation
        const showRegisterEl = document.getElementById('showRegister');
        const showLoginEl = document.getElementById('showLogin');
        if (showRegisterEl) showRegisterEl.onclick = () => this.showPage('registerPage');
        if (showLoginEl) showLoginEl.onclick = () => this.showPage('loginPage');
        document.getElementById('backToHomepageFromLogin')?.addEventListener('click', () => this.showPage('landingPage'));
        document.getElementById('backToHomepageFromRegister')?.addEventListener('click', () => this.showPage('landingPage'));
        
        // Legal/Information Links
        document.getElementById('termsLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('termsModal')?.classList.remove('hidden');
        });
        document.getElementById('refundPolicyLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('refundPolicyModal')?.classList.remove('hidden');
        });
        document.getElementById('whatItDoesLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('whatItDoesModal')?.classList.remove('hidden');
        });
        document.getElementById('quickStartLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('quickStartModal')?.classList.remove('hidden');
        });
        document.getElementById('accessLicensingLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('accessLicensingModal')?.classList.remove('hidden');
        });
        
        // Inline terms link in registration form
        document.getElementById('termsLinkInline')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('termsModal')?.classList.remove('hidden');
        });
        document.getElementById('federalTool')?.addEventListener('click', () => this.showTool('federalPage'));
        document.getElementById('californiaTool')?.addEventListener('click', () => this.showTool('californiaPage'));
        document.getElementById('backToDashboard1')?.addEventListener('click', () => this.showPage('dashboard'));
        document.getElementById('backToDashboard2')?.addEventListener('click', () => this.showPage('dashboard'));

        // Verification page
        document.getElementById('resendVerification')?.addEventListener('click', () => this.resendVerificationEmail());
        document.getElementById('backToLogin')?.addEventListener('click', () => this.showPage('loginPage'));
        
        // Copy verification link functionality
        document.getElementById('copyVerificationLink')?.addEventListener('click', () => {
            const linkInput = document.getElementById('verificationLinkInput');
            if (linkInput) {
                linkInput.select();
                linkInput.setSelectionRange(0, 99999); // For mobile devices
                navigator.clipboard.writeText(linkInput.value).then(() => {
                    this.showSuccess('Verification link copied to clipboard!');
                }).catch(() => {
                    // Fallback for older browsers
                    document.execCommand('copy');
                    this.showSuccess('Verification link copied to clipboard!');
                });
            }
        });

        // Mode buttons for tools
        document.getElementById('federalEmailMode')?.addEventListener('click', () => this.setToolMode('federal', 'email'));
        document.getElementById('federalQuestionMode')?.addEventListener('click', () => this.setToolMode('federal', 'question'));
        document.getElementById('californiaEmailMode')?.addEventListener('click', () => this.setToolMode('california', 'email'));
        document.getElementById('californiaQuestionMode')?.addEventListener('click', () => this.setToolMode('california', 'question'));

        // Settings
        const toggleSettings = () => this.showSettings();
        document.getElementById('settingsBtn')?.addEventListener('click', toggleSettings);
        document.getElementById('settingsBtn2')?.addEventListener('click', toggleSettings);
        document.getElementById('settingsBtn3')?.addEventListener('click', toggleSettings);
        document.getElementById('closeSettings')?.addEventListener('click', () => this.hideSettings());
        document.getElementById('settingsForm')?.addEventListener('submit', (e) => this.handleSettings(e));
        document.getElementById('aiProvider')?.addEventListener('change', (e) => this.toggleKeyFields(e.target.value));

        // Tool Logic
        document.getElementById('federalSubmit')?.addEventListener('click', () => this.handleAISubmit('federal'));
        document.getElementById('californiaSubmit')?.addEventListener('click', () => this.handleAISubmit('california'));
        document.getElementById('federalClear')?.addEventListener('click', () => this.clearOutput('federal'));
        document.getElementById('californiaClear')?.addEventListener('click', () => this.clearOutput('california'));
        document.getElementById('federalCopy')?.addEventListener('click', () => this.copyOutput('federal'));
        document.getElementById('californiaCopy')?.addEventListener('click', () => this.copyOutput('california'));
        
        // Regenerate buttons
        document.getElementById('federalRegenerate')?.addEventListener('click', () => this.regenerateResponse('federal'));
        document.getElementById('californiaRegenerate')?.addEventListener('click', () => this.regenerateResponse('california'));
        
        // Follow-up submit buttons
        document.getElementById('federalFollowupSubmit')?.addEventListener('click', () => this.handleFollowupSubmit('federal'));
        document.getElementById('californiaFollowupSubmit')?.addEventListener('click', () => this.handleFollowupSubmit('california'));

        // Payment
        document.getElementById('payStripe')?.addEventListener('click', () => this.handlePayment('stripe'));
        document.getElementById('payPaypal')?.addEventListener('click', () => this.handlePayment('paypal'));
        document.getElementById('continueToApp')?.addEventListener('click', () => this.checkSubscriptionAndRedirect());
        document.getElementById('retryPayment')?.addEventListener('click', () => this.showPage('subscriptionPage'));
        document.getElementById('backToDashboardFromCancel')?.addEventListener('click', () => this.checkSubscriptionAndRedirect());
        document.getElementById('backToHomepage')?.addEventListener('click', () => this.logout());

        // Admin functionality (only bind if admin elements exist)
        if (document.getElementById('refreshUsers')) {
            this.bindAdminEvents();
        }
    }

    bindAdminEvents() {
        // Admin dashboard events
        document.getElementById('refreshUsers')?.addEventListener('click', () => this.loadAdminDashboard());
        document.getElementById('exportUsers')?.addEventListener('click', () => this.exportUsersCSV());
        document.getElementById('paymentSettingsForm')?.addEventListener('submit', (e) => this.handlePaymentConfig(e));
        document.getElementById('emailSettingsForm')?.addEventListener('submit', (e) => this.handleEmailConfig(e));
        document.getElementById('testEmailBtn')?.addEventListener('click', () => this.sendTestEmail());
        document.getElementById('smtpProvider')?.addEventListener('change', (e) => this.toggleCustomSmtp(e.target.value));
        document.getElementById('bulkGrantBtn')?.addEventListener('click', () => this.showBulkGrantModal());
        document.getElementById('closeBulkGrant')?.addEventListener('click', () => document.getElementById('bulkGrantModal')?.classList.add('hidden'));
        document.getElementById('bulkGrantForm')?.addEventListener('submit', (e) => this.handleBulkGrant(e));
        document.getElementById('selectAllUsers')?.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        document.getElementById('adminSettingsBtn')?.addEventListener('click', () => this.showAdminProfile());
        document.getElementById('clearAllData')?.addEventListener('click', () => this.clearAllData());
        document.getElementById('userSearch')?.addEventListener('input', () => this.filterUsers());
        document.getElementById('userFilter')?.addEventListener('change', () => this.filterUsers());
        
        // Statistics cards click handlers
        document.querySelectorAll('.clickable-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.showFilteredUsers(filter);
            });
        });
        
        // Modal close handlers
        document.getElementById('closeUserDetails')?.addEventListener('click', () => document.getElementById('userDetailsModal')?.classList.add('hidden'));
        document.getElementById('closeFilteredUsers')?.addEventListener('click', () => document.getElementById('filteredUsersModal')?.classList.add('hidden'));
        
        // User details modal action handlers
        document.getElementById('backToUserList')?.addEventListener('click', () => this.backToUserListFromModal());
        document.getElementById('grantUserAccess')?.addEventListener('click', () => this.grantUserAccessFromModal());
        document.getElementById('resetUserPassword')?.addEventListener('click', () => this.resetUserPasswordFromModal());
        document.getElementById('editUserProfile')?.addEventListener('click', () => this.editUserFromModal());
        document.getElementById('viewUserConversations')?.addEventListener('click', () => this.viewUserConversationsFromModal());
        document.getElementById('deleteUserAccount')?.addEventListener('click', () => this.deleteUserFromModal());
        
        // Filtered users modal handlers
        document.getElementById('filteredUserSearch')?.addEventListener('input', () => this.filterModalUsers());
        document.getElementById('refreshFilteredUsers')?.addEventListener('click', () => this.refreshFilteredUsers());
        document.getElementById('selectAllFiltered')?.addEventListener('click', () => this.toggleSelectAllFiltered());
        document.getElementById('bulkGrantFiltered')?.addEventListener('click', () => this.bulkGrantFromModal());

        // Admin profile page
        document.getElementById('backToAdminDashboard')?.addEventListener('click', () => this.showPage('adminDashboard'));
        document.getElementById('adminLogoutBtn2')?.addEventListener('click', () => this.logout());
        document.getElementById('adminProfileForm')?.addEventListener('submit', (e) => this.handleAdminProfileUpdate(e));
        document.getElementById('cancelProfileChanges')?.addEventListener('click', () => this.showPage('adminDashboard'));
        
        // System settings
        document.getElementById('allowRegistration')?.addEventListener('change', () => this.updateSystemSettings());
        document.getElementById('requireEmailVerification')?.addEventListener('change', () => this.updateSystemSettings());
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });
    }

    // ==========================================
    // SUBSCRIPTION & TRIAL LOGIC
    // ==========================================

    checkSubscriptionAndRedirect() {
        if (this.currentUser.isAdmin) {
            this.loadAdminDashboard();
            this.showPage('adminDashboard');
            this.resetIdleTimer(); // Start idle timer for admin
            return;
        }

        // Ensure user has aiProvider set (migration for existing users)
        if (!this.currentUser.aiProvider) {
            this.currentUser.aiProvider = 'puter';
            this.updateUserRecord(this.currentUser);
            console.log('✅ Set default AI provider to Puter.js for existing user');
        }

        const status = this.getSubscriptionStatus(this.currentUser);
        document.getElementById('userWelcomeName').textContent = this.currentUser.firstName;
        
        if (status.active) {
            this.showPage('dashboard');
            this.updateTrialTimer(status);
            this.resetIdleTimer(); // Start idle timer for regular users
        } else {
            this.showPage('subscriptionPage');
            this.loadSubscriptionPricing();
            this.resetIdleTimer(); // Start idle timer even on subscription page
        }
    }

    getSubscriptionStatus(user) {
        const now = Date.now();
        const created = user.createdAt || now;
        
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() > now) {
            return { active: true, type: 'subscription', expiry: user.subscriptionExpiry };
        }

        const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
        const trialEnd = created + trialDuration;
        
        if (now < trialEnd) {
            return { active: true, type: 'trial', expiry: trialEnd };
        }

        return { active: false, type: 'expired' };
    }

    updateTrialTimer(status) {
        const timerEl = document.getElementById('trialTimer');
        if (status.type === 'trial') {
            const timeLeft = new Date(status.expiry).getTime() - Date.now();
            
            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                timerEl.textContent = `Trial: ${hours}h ${minutes}m ${seconds}s remaining`;
                timerEl.classList.remove('hidden');
                timerEl.style.background = '#f59e0b';
                timerEl.style.color = 'white';
                
                // Update every second
                if (!this.trialTimerInterval) {
                    this.trialTimerInterval = setInterval(() => {
                        const currentStatus = this.getSubscriptionStatus(this.currentUser);
                        if (currentStatus.type !== 'trial') {
                            clearInterval(this.trialTimerInterval);
                            this.trialTimerInterval = null;
                            // Redirect to subscription page when trial expires
                            this.showPage('subscriptionPage');
                            this.loadSubscriptionPricing();
                            this.showError('Your 24-hour free trial has expired. Please subscribe to continue.');
                        } else {
                            this.updateTrialTimer(currentStatus);
                        }
                    }, 1000);
                }
            } else {
                // Trial expired
                timerEl.textContent = 'Trial Expired';
                timerEl.classList.remove('hidden');
                timerEl.style.background = '#ef4444';
                timerEl.style.color = 'white';
                
                if (this.trialTimerInterval) {
                    clearInterval(this.trialTimerInterval);
                    this.trialTimerInterval = null;
                }
                
                // Redirect to subscription page
                setTimeout(() => {
                    this.showPage('subscriptionPage');
                    this.loadSubscriptionPricing();
                    this.showError('Your 24-hour free trial has expired. Please subscribe to continue.');
                }, 2000);
            }
        } else if (status.type === 'subscription') {
            timerEl.textContent = 'Premium Active 👑';
            timerEl.classList.remove('hidden');
            timerEl.style.background = '#10b981';
            timerEl.style.color = 'white';
            
            if (this.trialTimerInterval) {
                clearInterval(this.trialTimerInterval);
                this.trialTimerInterval = null;
            }
        } else {
            timerEl.classList.add('hidden');
            if (this.trialTimerInterval) {
                clearInterval(this.trialTimerInterval);
                this.trialTimerInterval = null;
            }
        }
    }

    showTool(pageId) {
        const status = this.getSubscriptionStatus(this.currentUser);
        if (!status.active) {
            this.showPage('subscriptionPage');
            this.loadSubscriptionPricing();
            this.showError('Your trial has expired. Please subscribe to continue using the tools.');
            return;
        }
        
        // Check if trial is about to expire (less than 1 hour left)
        if (status.type === 'trial') {
            const timeLeft = new Date(status.expiry).getTime() - Date.now();
            const hoursLeft = timeLeft / (1000 * 60 * 60);
            
            if (hoursLeft < 1) {
                this.showError(`Trial expires in ${Math.ceil(hoursLeft * 60)} minutes. Consider subscribing to avoid interruption.`);
            }
        }
        
        this.showPage(pageId);
    }

    loadSubscriptionPricing() {
        const fee = this.paymentConfig.monthlyFee || 29;
        document.getElementById('displayMonthlyFee').textContent = fee;
    }

    async handlePayment(method) {
        this.showLoading();
        
        try {
            if (method === 'stripe') {
                await this.handleStripePayment();
            } else if (method === 'paypal') {
                await this.handlePayPalPayment();
            }
        } catch (error) {
            console.error('Payment Error', error);
            this.showError('Payment failed: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async handleStripePayment() {
        try {
            const response = await fetch(this.getApiUrl('payment/stripe/create-session'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create Stripe session');
            }
        } catch (error) {
            throw new Error('Stripe payment failed: ' + error.message);
        }
    }

    async handlePayPalPayment() {
        try {
            const response = await fetch(this.getApiUrl('payment/paypal/create-order'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Redirect to PayPal
                window.location.href = data.approvalUrl;
            } else {
                throw new Error(data.error || 'Failed to create PayPal order');
            }
        } catch (error) {
            throw new Error('PayPal payment failed: ' + error.message);
        }
    }

    // ==========================================
    // AI LOGIC (MULTI-MODEL)
    // ==========================================

    toggleKeyFields(provider) {
        // Hide all sections first
        const sections = ['openaiKeySection', 'geminiKeySection'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) element.classList.add('hidden');
        });
        
        // Show the relevant section
        let targetSection = '';
        if (provider === 'openai') {
            targetSection = 'openaiKeySection';
        } else if (provider === 'gemini') {
            targetSection = 'geminiKeySection';
        }
        // Puter and demo don't need API key sections
        
        if (targetSection) {
            const element = document.getElementById(targetSection);
            if (element) element.classList.remove('hidden');
        }
    }

    async handleAISubmit(toolName) {
        const inputId = `${toolName}Input`;
        const outputId = `${toolName}Output`;
        const followupId = `${toolName}Followup`;
        const followupSectionId = `${toolName}FollowupSection`;
        
        const input = document.getElementById(inputId).value.trim();
        const followupInput = document.getElementById(followupId)?.value.trim() || '';
        
        if (!input) return this.showError('Please enter some text');
        
        // Combine main input with follow-up if present
        let fullInput = input;
        if (followupInput) {
            fullInput += `\n\nAdditional Information/Follow-up: ${followupInput}`;
        }
        
        this.showLoading();
        
        try {
            console.log('🔍 AI Submit Debug:', {
                currentUser: this.currentUser,
                userProvider: this.currentUser?.aiProvider,
                userOpenAI: this.currentUser?.openaiApiKey ? 'present' : 'missing',
                userGemini: this.currentUser?.geminiApiKey ? 'present' : 'missing'
            });
            
            // Ensure we have a current user
            if (!this.currentUser) {
                throw new Error('No user session found. Please log in again.');
            }
            
            // Determine which provider to use
            let provider = this.currentUser.aiProvider || 'puter';
            let apiKey = '';
            
            console.log(`🎯 Selected provider: ${provider}`);
            
            // Check for API keys and validate them
            const keys = {
                openai: this.currentUser.openaiApiKey,
                gemini: this.currentUser.geminiApiKey || this.paymentConfig?.systemGeminiKey
            };
            
            // If user selected a specific provider, validate they have the key
            if (provider === 'openai' && (!keys.openai || !keys.openai.startsWith('sk-'))) {
                // Fall back to Puter.js if OpenAI key is invalid
                console.log('⚠️ OpenAI selected but no valid key found, falling back to Puter.js');
                provider = 'puter';
            } else if (provider === 'gemini' && (!keys.gemini || !keys.gemini.startsWith('AIza'))) {
                // Fall back to Puter.js if Gemini key is invalid
                console.log('⚠️ Gemini selected but no valid key found, falling back to Puter.js');
                provider = 'puter';
            } else if (provider === 'openai') {
                apiKey = keys.openai;
            } else if (provider === 'gemini') {
                apiKey = keys.gemini;
            }
            // For 'puter' and 'demo', no API key needed
            
            console.log(`✅ Final provider: ${provider}, API key: ${apiKey ? 'present' : 'not needed'}`);

            let responseText = '';
            const systemPrompts = {
                federal: `SYSTEM INSTRUCTIONS (HR PRACTITIONER · EMPLOYEE-FACING · INPUT-GATED)

0. Input Gate — HARD STOP (Critical)
Do not generate any response until the user enters a Quick Question or an Email.
If no user input is provided: Remain silent, do not draft an email, do not provide guidance, examples, or filler text.
This rule overrides all other instructions.

1. System Role & Purpose (Non-Negotiable)
You are an AI-assisted HR leave response tool.
Your sole function is to draft employee-facing email responses to questions about medical and family leave under the Federal Family and Medical Leave Act (FMLA).
All responses must:
- Be written as if sent directly from Human Resources
- Be ready to send without editing
- Be concise, calm, and supportive
- Answer only what the employee asked
- Avoid unnecessary legal explanation
You do not replace HR judgment, employer policy, or legal determinations.

2. Voice & Authority (Strict Enforcement)
Required Voice - Write in first-person plural only: "we", "our office", "our team"
The HR professional is the authority speaking directly to the employee.
Prohibited Language (Never Use): "HR can confirm…", "Your HR department…", "Contact HR…", "HR will review…"
Required Equivalent Language: "We can review…", "We'll confirm…", "We can walk you through next steps…", "Let us know if you'd like us to take a look…"
Never imply the employee must go elsewhere for answers.

3. Response Style & Structure
Length: Default to short, direct responses. Typically 2–4 short paragraphs. Expand only when needed to avoid confusion.
Tone: Calm, Reassuring, Professional, Human. You are responding to a real employee — not explaining the law.

4. Content Boundaries (Strict)
You MAY: Answer the employee's specific question, Explain what generally happens next, Clarify job protection vs pay (briefly), Use conditional language when prior leave is mentioned, Acknowledge return-to-work or accommodation discussions without legal framing.
You MUST NOT: Provide legal background or history, Explain statutory mechanics, Cite statutes, regulations, or sections, List eligibility formulas unless explicitly asked, State exact leave balances, Declare leave approved, denied, exhausted, or designated.

5. Law References (Minimal & Controlled)
Reference "FMLA" by name only. Mention it once at most.
Approved Example: "This type of leave can provide job protection for qualifying medical absences."
Prohibited Example: "FMLA provides up to 12 weeks of job-protected leave in a rolling 12-month period…"

6. Risk-Safe Language Rules
When prior leave is mentioned, use conditional phrasing only: "may be reduced", "could already be used", "depends on how prior time was designated"
Never calculate remaining leave. Never assume eligibility or coverage.

7. Job Protection vs Pay (Simplified)
Always distinguish job-protected leave from pay. Never imply FMLA provides pay.
Approved phrasing: "This type of leave provides job protection. Pay depends on available paid time or other benefits that may apply."

8. Federal Scope Only
This covers Federal FMLA only. Do not reference: State laws, Paid family leave programs, Disability insurance, CFRA or PDL.
If the employee raises something outside scope: "We can review how that applies based on your situation."

9. Mandatory Closing (All Responses)
Every response must end with a supportive invitation, such as:
"Please let us know if you have questions or would like us to review next steps with you."
"Let us know if you'd like us to take a look or walk through next steps."

10. Final Self-Check (Silent but Required)
Before finalizing, ask internally: "Would an experienced HR professional send this email exactly as written?"
If no, simplify and shorten.`,
                california: `SYSTEM INSTRUCTIONS (HR PRACTITIONER · EMPLOYEE-FACING · INPUT-GATED)

0. Input Gate — HARD STOP (Critical)
Do not generate any response until the user enters a Quick Question or an Email.
If no user input is provided: Remain silent, do not draft an email, do not provide guidance, examples, or filler text.
This rule overrides all other instructions.

1. System Role & Purpose (Non-Negotiable)
You are an AI-assisted HR leave response tool for California employees.
Your sole function is to draft employee-facing email responses to questions about medical and family leave under California and Federal laws (CFRA, PDL, and FMLA).
Analysis order: FMLA → CFRA → PDL.
All responses must:
- Be written as if sent directly from Human Resources
- Be ready to send without editing
- Be concise, calm, and supportive
- Answer only what the employee asked
- Avoid unnecessary legal explanation
You do not replace HR judgment, employer policy, or legal determinations.

2. Voice & Authority (Strict Enforcement)
Required Voice - Write in first-person plural only: "we", "our office", "our team"
The HR professional is the authority speaking directly to the employee.
Prohibited Language (Never Use): "HR can confirm…", "Your HR department…", "Contact HR…", "HR will review…"
Required Equivalent Language: "We can review…", "We'll confirm…", "We can walk you through next steps…", "Let us know if you'd like us to take a look…"
Never imply the employee must go elsewhere for answers.

3. Response Style & Structure
Length: Default to short, direct responses. Typically 2–4 short paragraphs. Expand only when needed to avoid confusion.
Tone: Calm, Reassuring, Professional, Human. You are responding to a real employee — not explaining the law.

4. Content Boundaries (Strict)
You MAY: Answer the employee's specific question, Explain what generally happens next, Clarify job protection vs pay (briefly), Use conditional language when prior leave is mentioned, Acknowledge return-to-work or accommodation discussions without legal framing.
You MUST NOT: Provide legal background or history, Explain statutory mechanics, Cite statutes, regulations, or sections, List eligibility formulas unless explicitly asked, State exact leave balances, Declare leave approved, denied, exhausted, or designated.

5. Law References (Minimal & Controlled)
Reference applicable laws by name only (FMLA, CFRA, PDL). Mention each once at most.
Approved Example: "This type of leave can provide job protection for qualifying medical absences under California and federal law."
Prohibited Example: "CFRA provides up to 12 weeks of job-protected leave in a rolling 12-month period…"

6. Risk-Safe Language Rules
When prior leave is mentioned, use conditional phrasing only: "may be reduced", "could already be used", "depends on how prior time was designated"
Never calculate remaining leave. Never assume eligibility or coverage.

7. Job Protection vs Pay (Simplified)
Always distinguish job-protected leave from pay. Never imply leave laws provide pay.
Approved phrasing: "This type of leave provides job protection. Pay depends on available paid time or other benefits that may apply."

8. California Scope
This covers California-specific laws (CFRA, PDL) and Federal FMLA interaction.
If the employee raises something outside scope: "We can review how that applies based on your situation."

9. Mandatory Closing (All Responses)
Every response must end with a supportive invitation, such as:
"Please let us know if you have questions or would like us to review next steps with you."
"Let us know if you'd like us to take a look or walk through next steps."

10. Final Self-Check (Silent but Required)
Before finalizing, ask internally: "Would an experienced HR professional send this email exactly as written?"
If no, simplify and shorten.`
            };

            if (provider === 'demo') {
                console.log('🎭 Using demo mode...');
                await new Promise(r => setTimeout(r, 1000));
                responseText = "DEMO RESPONSE: This is a simulated response. Please configure an AI provider in settings for real results.";
            } 
            else if (provider === 'puter') {
                // Use Puter.js AI - no API key required!
                try {
                    console.log('🤖 Using Puter.js AI (Free)...');
                    
                    // Check if Puter.js is available and initialized
                    if (typeof puter === 'undefined' || !puter.ai) {
                        throw new Error('Puter.js not available');
                    }
                    
                    // Create the full prompt with system context
                    const fullPrompt = `${systemPrompts[toolName]}\n\nUser Query: ${fullInput}\n\nPlease provide a helpful, compliant response:`;
                    
                    // Use Puter.js AI chat function with timeout
                    const response = await Promise.race([
                        puter.ai.chat(fullPrompt, {
                            model: 'gpt-4o-mini',
                            max_tokens: 800,
                            temperature: 0.3
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Puter.js timeout')), 15000)
                        )
                    ]);
                    
                    responseText = response || 'No response received from Puter.js AI';
                    console.log('✅ Puter.js AI success');
                    
                } catch (puterError) {
                    console.error('❌ Puter.js AI error:', puterError);
                    // If Puter.js fails, fall back to demo mode
                    console.log('⚠️ Puter.js failed, falling back to demo mode');
                    responseText = `DEMO RESPONSE: Puter.js AI is temporarily unavailable (${puterError.message}). This is a simulated response for ${toolName === 'federal' ? 'Federal FMLA' : 'California Leave'} compliance. Please try again later or configure an API key in settings for reliable service.`;
                }
            }
            else {
                // Check server status for API-based providers
                const endpoint = this.getApiUrl(provider);
                
                if (!endpoint || !this.serverRunning) {
                    if (!endpoint) {
                        console.warn('⚠️ Server endpoints not available in production. Falling back to Puter.js/Demo mode.');
                    } else {
                        await this.checkServerStatus();
                        if (!this.serverRunning) {
                            console.warn('⚠️ Server not running. Falling back to Puter.js/Demo mode.');
                        }
                    }
                    
                    // Fall back to Puter.js or demo mode
                    if (typeof puter !== 'undefined' && puter.ai) {
                        console.log('🔄 Falling back to Puter.js AI...');
                        provider = 'puter';
                        // Retry with Puter.js
                        try {
                            const fullPrompt = `${systemPrompts[toolName]}\n\nUser Query: ${fullInput}\n\nPlease provide a helpful, compliant response:`;
                            const response = await puter.ai.chat(fullPrompt, {
                                model: 'gpt-4o-mini',
                                max_tokens: 800,
                                temperature: 0.3
                            });
                            responseText = response || 'No response received from Puter.js AI';
                        } catch (puterFallbackError) {
                            console.error('❌ Puter.js fallback failed:', puterFallbackError);
                            responseText = `DEMO RESPONSE: Server unavailable and Puter.js failed. This is a simulated response for ${toolName === 'federal' ? 'Federal FMLA' : 'California Leave'} compliance. Please try again later.`;
                        }
                    } else {
                        console.log('🔄 Falling back to demo mode...');
                        responseText = `DEMO RESPONSE: Server unavailable. This is a simulated response for ${toolName === 'federal' ? 'Federal FMLA' : 'California Leave'} compliance. Please configure the server or use Puter.js for real AI responses.`;
                    }
                } else {
                    // Server is available, proceed with API call
                    const requestBody = {
                        apiKey: apiKey,
                        prompt: fullInput,
                        systemPrompt: systemPrompts[toolName]
                    };

                    // Add model-specific parameters
                    if (provider === 'openai') {
                        requestBody.messages = [
                            { role: 'system', content: systemPrompts[toolName] },
                            { role: 'user', content: fullInput }
                        ];
                        requestBody.model = 'gpt-4o-mini';
                    }

                    try {
                        const res = await fetch(endpoint, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.sessionToken}`
                            },
                            body: JSON.stringify(requestBody)
                        });
                        
                        // Handle both JSON and HTML error responses
                        let data;
                        const contentType = res.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            data = await res.json();
                        } else {
                            throw new Error(`Server Error (${res.status}): Unable to connect to ${provider} API endpoint.`);
                        }
                        
                        if (!res.ok || data.error) {
                            throw new Error(data.error?.message || data.error || `API Error: ${res.status}`);
                        }
                        
                        // Parse response based on provider
                        if (provider === 'gemini') {
                            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                                responseText = data.candidates[0].content.parts[0].text;
                            } else {
                                throw new Error('Invalid response format from Gemini API');
                            }
                        } else {
                            // OpenAI uses standardized format
                            responseText = data.choices?.[0]?.message?.content || 'No response received';
                        }

                    } catch (fetchError) {
                        if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
                            throw new Error(`❌ Connection Error: Cannot connect to ${provider} API. Please ensure the server is running.`);
                        }
                        throw fetchError;
                    }
                }
            }

            document.getElementById(outputId).textContent = responseText;
            
            // Show follow-up section after first response is generated (only if it's not already visible)
            const followupSection = document.getElementById(followupSectionId);
            if (followupSection && followupSection.classList.contains('hidden')) {
                followupSection.classList.remove('hidden');
            }
            
            this.showSuccess(`Response Generated! (${provider.toUpperCase()})`);

        } catch (error) {
            console.error('AI Submit Error:', error);
            this.showError(`❌ ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // UTILITIES
    // ==========================================
    
    updateFooterYear() {
        const currentYear = new Date().getFullYear();
        const yearElement = document.getElementById('currentYear');
        if (yearElement) {
            yearElement.textContent = currentYear;
        }
    }

    setToolMode(tool, mode) {
        // Update active mode button
        document.querySelectorAll(`#${tool}Page .mode-btn`).forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}${mode === 'email' ? 'Email' : 'Question'}Mode`).classList.add('active');
        
        // Update input label
        const label = mode === 'email' ? 'Paste Employee Email:' : 'Enter Your Question:';
        document.getElementById(`${tool}InputLabel`).textContent = label;
        
        // Update placeholder
        const placeholder = mode === 'email' ? 'Paste employee email here...' : 'Type your HR compliance question...';
        document.getElementById(`${tool}Input`).placeholder = placeholder;
    }

    findUser(email) { 
        const user = this.users.find(u => u.email === email);
        
        // Migrate existing users to have aiProvider if they don't have one
        if (user && !user.aiProvider) {
            user.aiProvider = 'puter';
            this.saveUsers(this.users);
            console.log(`✅ Migrated user ${email} to use Puter.js AI`);
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

    showVerificationPage(email, verificationLink = null) {
        // Show the verification page
        this.showPage('verificationPage');
        
        // Update the email message
        const emailMessage = document.querySelector('#verificationPage p');
        if (emailMessage) {
            emailMessage.textContent = `We've sent a verification link to ${email}.`;
        }
        
        // Only show verification link if email delivery failed or in development mode
        if (verificationLink && (!this.serverRunning || !emailTransporter)) {
            const linkSection = document.getElementById('verificationLinkSection');
            const linkButton = document.getElementById('verificationLinkButton');
            const linkInput = document.getElementById('verificationLinkInput');
            
            if (linkSection && linkButton && linkInput) {
                linkSection.classList.remove('hidden');
                linkButton.href = verificationLink;
                linkInput.value = verificationLink;
            }
        }
        
        this.showSuccess(`Registration successful! Please check your email to verify your account.`);
    }

    resendVerificationEmail() {
        this.showSuccess('Verification email resent! Please check your inbox.');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();
        
        const email = document.getElementById('loginEmail').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        // Check if server is available, otherwise use client-side auth
        const apiUrl = this.getApiUrl('auth/login');
        if (!apiUrl || !this.serverRunning) {
            console.log('🔄 Server not available, using client-side authentication');
            return this.handleClientSideLogin(email, password);
        }
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.currentUser = data.user;
                this.sessionToken = data.sessionToken;
                localStorage.setItem('sessionToken', this.sessionToken);
                this.resetIdleTimer();
                this.checkSubscriptionAndRedirect();
                this.showSuccess('Login successful!');
            } else {
                this.showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            console.log('🔄 Server connection failed, falling back to client-side authentication');
            // Fall back to client-side authentication
            this.handleClientSideLogin(email, password);
        } finally {
            this.hideLoading();
        }
    }
    
    handleClientSideLogin(email, password) {
        try {
            // Find user in local storage
            const user = this.findUser(email);
            
            if (!user) {
                this.hideLoading();
                return this.showError('Invalid email or password');
            }
            
            // Simple password check (in production, this should be hashed)
            if (user.password !== password) {
                this.hideLoading();
                return this.showError('Invalid email or password');
            }
            
            // Check if email is verified (if verification is required)
            if (!user.emailVerified && this.paymentConfig?.requireEmailVerification !== false) {
                this.hideLoading();
                return this.showError('Please verify your email before logging in');
            }
            
            // Login successful
            this.currentUser = { ...user }; // Create a copy to avoid mutations
            this.sessionToken = 'client-side-token-' + Date.now(); // Generate a simple token
            localStorage.setItem('sessionToken', this.sessionToken);
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            this.resetIdleTimer();
            this.checkSubscriptionAndRedirect();
            this.showSuccess('Login successful! (Client-side mode)');
            this.hideLoading();
        } catch (error) {
            console.error('Client-side login error:', error);
            this.hideLoading();
            this.showError('Login failed: ' + error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Basic validation
        if (!email || !firstName || !lastName || !password || !confirmPassword) {
            this.hideLoading();
            return this.showError('All fields are required');
        }
        
        // Password confirmation validation
        if (password !== confirmPassword) {
            this.hideLoading();
            return this.showError('Passwords do not match. Please try again.');
        }
        
        // Password strength validation
        if (password.length < 8) {
            this.hideLoading();
            return this.showError('Password must be at least 8 characters long.');
        }
        
        // Disposable Email Check
        const disposableDomains = [
            'mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', 
            '10minutemail.com', 'throwawaymail.com', 'trashmail.com'
        ];
        const domain = email.split('@')[1];
        if (disposableDomains.includes(domain)) {
            this.hideLoading();
            return this.showError('❌ Registration Rejected: Disposable emails are not allowed.');
        }

        // Check if server is available, otherwise use client-side registration
        const apiUrl = this.getApiUrl('auth/register');
        if (!apiUrl || !this.serverRunning) {
            console.log('🔄 Server not available, using client-side registration');
            return this.handleClientSideRegister(email, firstName, lastName, password);
        }
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, firstName, lastName, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Show verification page with link
                this.showVerificationPage(email, data.verificationLink);
            } else {
                this.showError(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            console.log('🔄 Server connection failed, falling back to client-side registration');
            // Fall back to client-side registration
            this.handleClientSideRegister(email, firstName, lastName, password);
        } finally {
            this.hideLoading();
        }
    }
    
    handleClientSideRegister(email, firstName, lastName, password) {
        try {
            // Enhanced disposable email check
            const disposableDomains = [
                'mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', 
                '10minutemail.com', 'throwawaymail.com', 'trashmail.com', 'temp-mail.org',
                'maildrop.cc', 'sharklasers.com', 'guerrillamailblock.com', 'pokemail.net',
                'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com', 'fakeinbox.com'
            ];
            const domain = email.split('@')[1];
            if (disposableDomains.includes(domain)) {
                this.hideLoading();
                return this.showError('❌ Registration Rejected: Disposable emails are not allowed.');
            }
            
            // Check if user already exists
            if (this.findUser(email)) {
                this.hideLoading();
                return this.showError('This email address is already registered. Please use a different email or try logging in.');
            }
            
            // Create verification token
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
            const verificationLink = `${window.location.origin}${window.location.pathname}?verify=${token}`;
            
            // Store pending verification in localStorage
            const pending = this.loadPendingVerificationsData();
            pending.push({
                token: token,
                userData: {
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    password: password,
                    emailVerified: false,
                    createdAt: Date.now(),
                    aiProvider: 'puter'
                },
                createdAt: Date.now()
            });
            this.savePendingVerifications(pending);
            
            // Try to send email via EmailJS (for Netlify)
            if (typeof window.sendVerificationEmail === 'function') {
                window.sendVerificationEmail(email, firstName, verificationLink)
                    .then(result => {
                        console.log('📧 Email service result:', result);
                    })
                    .catch(error => {
                        console.warn('📧 Email service failed:', error);
                    });
            }
            
            this.hideLoading();
            
            // Show verification page with link
            this.showVerificationPage(email, verificationLink);
            
        } catch (error) {
            console.error('Client-side registration error:', error);
            this.hideLoading();
            this.showError('Registration failed: ' + error.message);
        }
    }

    async verifyEmailToken(token) {
        try {
            // Try server-side verification first
            if (this.serverRunning) {
                const response = await fetch(this.getApiUrl('auth/verify'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    this.showSuccess('Email verified successfully! Please login.');
                    this.showPage('loginPage');
                    return;
                }
            }
            
            // Fall back to client-side verification
            this.handleClientSideVerification(token);
            
        } catch (error) {
            console.error('Verification error:', error);
            // Fall back to client-side verification
            this.handleClientSideVerification(token);
        }
    }
    
    handleClientSideVerification(token) {
        try {
            const pending = this.loadPendingVerificationsData();
            const pendingIndex = pending.findIndex(p => p.token === token);
            
            if (pendingIndex === -1) {
                this.showError('Invalid verification token');
                return;
            }
            
            const pendingUser = pending[pendingIndex];
            
            // Create verified user
            const newUser = {
                id: Date.now().toString(),
                ...pendingUser.userData,
                emailVerified: true
            };
            
            // Add to users and remove from pending
            this.users.push(newUser);
            this.saveUsers(this.users);
            
            pending.splice(pendingIndex, 1);
            this.savePendingVerifications(pending);
            
            this.showSuccess('Email verified successfully! Please login.');
            this.showPage('loginPage');
            
        } catch (error) {
            console.error('Client-side verification error:', error);
            this.showError('Verification failed. Please try again.');
        }
    }

    async logout() {
        try {
            if (this.sessionToken) {
                await fetch(this.getApiUrl('auth/logout'), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionToken}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.currentUser = null;
        this.sessionToken = null;
        localStorage.removeItem('sessionToken');
        this.clearIdleTimer();
        
        // Clear trial timer
        if (this.trialTimerInterval) {
            clearInterval(this.trialTimerInterval);
            this.trialTimerInterval = null;
        }
        
        this.showPage('landingPage');
        this.showSuccess('Logged out successfully');
    }

    // ==========================================
    // IDLE TIMER FUNCTIONALITY
    // ==========================================

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
        
        this.clearIdleTimer();
        
        this.idleTimer = setTimeout(() => {
            this.showError('Session expired due to inactivity. Please log in again.');
            setTimeout(() => this.logout(), 2000);
        }, this.idleTimeout);
    }

    clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    // ==========================================
    // STATISTICS CARDS & USER DETAILS FUNCTIONALITY
    // ==========================================

    showFilteredUsers(filter) {
        console.log(`📊 Showing filtered users for: ${filter}`);
        
        // Get all users and pending verifications
        const allUsers = this.users || [];
        const pending = this.loadPendingVerificationsData() || [];
        let filteredUsers = [];
        let modalTitle = '';
        
        switch (filter) {
            case 'all':
                // Show ALL users including admins for total count
                filteredUsers = allUsers;
                modalTitle = 'All Users';
                break;
            case 'verified':
                // Show all verified users (including admins if they're verified)
                filteredUsers = allUsers.filter(u => u.emailVerified);
                modalTitle = 'Verified Users';
                break;
            case 'pending':
                // Convert pending verifications to user-like objects
                filteredUsers = pending.map(p => ({
                    ...p.userData,
                    id: p.token,
                    isPending: true,
                    createdAt: p.createdAt
                }));
                modalTitle = 'Pending Verifications';
                break;
            case 'active':
                // Show users with active paid subscriptions (exclude admins)
                const now = Date.now();
                filteredUsers = allUsers.filter(u => {
                    if (u.isAdmin) return false;
                    if (!u.subscriptionExpiry) return false;
                    return new Date(u.subscriptionExpiry).getTime() > now;
                });
                modalTitle = 'Users with Active Subscriptions';
                break;
            case 'trial':
                // Show users currently in trial period (exclude admins)
                const currentTime = Date.now();
                const trialDuration = 24 * 60 * 60 * 1000;
                filteredUsers = allUsers.filter(u => {
                    if (u.isAdmin) return false;
                    if (u.subscriptionExpiry) return false; // Has paid subscription
                    if (!u.emailVerified) return false; // Must be verified
                    const trialEnd = (u.createdAt || currentTime) + trialDuration;
                    return currentTime < trialEnd;
                });
                modalTitle = 'Users in Trial';
                break;
            default:
                filteredUsers = allUsers;
                modalTitle = 'All Users';
        }
        
        // Store current filter for refresh functionality
        this.currentModalFilter = filter;
        this.currentFilteredUsers = filteredUsers;
        
        // Update modal title
        document.getElementById('filteredUsersTitle').textContent = `${modalTitle} (${filteredUsers.length})`;
        
        // Populate the filtered users list
        this.populateFilteredUsersList(filteredUsers);
        
        // Show the modal
        document.getElementById('filteredUsersModal').classList.remove('hidden');
        
        // Clear search
        document.getElementById('filteredUserSearch').value = '';
        
        console.log(`📊 Filtered ${filteredUsers.length} users for ${filter}`);
    }
    
    populateFilteredUsersList(users) {
        const listContainer = document.getElementById('filteredUsersList');
        
        if (!users || users.length === 0) {
            listContainer.innerHTML = '<div class="no-users-message">No users found for this criteria.</div>';
            return;
        }
        
        listContainer.innerHTML = users.map(user => {
            const isAdmin = user.isAdmin;
            const isPending = user.isPending;
            
            let statusInfo = '';
            let userActions = '';
            
            if (isPending) {
                statusInfo = `
                    <div class="user-status pending">
                        <i class="fa-solid fa-clock"></i> Pending Verification
                    </div>
                    <div class="user-meta">
                        <small>Registered: ${new Date(user.createdAt).toLocaleDateString()}</small>
                    </div>
                `;
                userActions = `
                    <button class="btn btn-sm btn-success" onclick="app.approveVerification('${user.id}')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.rejectVerification('${user.id}')">
                        <i class="fa-solid fa-times"></i> Reject
                    </button>
                `;
            } else if (isAdmin) {
                statusInfo = `
                    <div class="user-status admin">
                        <i class="fa-solid fa-crown"></i> Administrator
                    </div>
                    <div class="user-meta">
                        <small>Joined: ${new Date(user.createdAt).toLocaleDateString()}</small>
                        <small>Email: ${user.emailVerified ? 'Verified' : 'Not Verified'}</small>
                    </div>
                `;
                userActions = `
                    <button class="btn btn-sm btn-primary" onclick="app.showUserDetails('${user.id}')">
                        <i class="fa-solid fa-eye"></i> View Details
                    </button>
                `;
            } else {
                const status = this.getSubscriptionStatus(user);
                const statusText = status.active ? 
                    (status.type === 'trial' ? 'Trial Active' : 'Premium Active') : 
                    'Access Expired';
                const statusIcon = status.active ? 
                    (status.type === 'trial' ? 'fa-clock' : 'fa-crown') : 
                    'fa-exclamation-triangle';
                
                statusInfo = `
                    <div class="user-status ${status.active ? (status.type === 'trial' ? 'trial' : 'premium') : 'expired'}">
                        <i class="fa-solid ${statusIcon}"></i> ${statusText}
                    </div>
                    <div class="user-meta">
                        <small>Joined: ${new Date(user.createdAt).toLocaleDateString()}</small>
                        <small>Email: ${user.emailVerified ? 'Verified' : 'Not Verified'}</small>
                        ${status.expiry ? `<small>Expires: ${new Date(status.expiry).toLocaleDateString()}</small>` : ''}
                    </div>
                `;
                userActions = `
                    <input type="checkbox" class="filtered-user-select" value="${user.id}">
                    <button class="btn btn-sm btn-primary" onclick="app.showUserDetails('${user.id}')">
                        <i class="fa-solid fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-sm btn-success" onclick="app.grantAccess('${user.id}')">
                        <i class="fa-solid fa-key"></i> Grant Access
                    </button>
                `;
            }
            
            return `
                <div class="filtered-user-card ${isAdmin ? 'admin-user' : ''} ${isPending ? 'pending-user' : ''}" data-user-id="${user.id}">
                    <div class="user-info">
                        <div class="user-name">
                            <h4>${user.firstName} ${user.lastName} ${isAdmin ? '👑' : ''}</h4>
                            <p class="user-email">${user.email}</p>
                        </div>
                        ${statusInfo}
                    </div>
                    <div class="user-actions">
                        ${userActions}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    showUserDetails(userId) {
        console.log(`👤 Showing details for user: ${userId}`);
        
        // Don't close the filtered users modal - let it stay open behind
        // The z-index will ensure user details modal appears on top
        
        // Find user in regular users or pending verifications
        let user = this.users.find(u => u.id === userId);
        let isPending = false;
        
        if (!user) {
            // Check pending verifications
            const pending = this.loadPendingVerificationsData() || [];
            const pendingUser = pending.find(p => p.token === userId);
            if (pendingUser) {
                user = { ...pendingUser.userData, id: pendingUser.token, isPending: true };
                isPending = true;
            }
        }
        
        if (!user) {
            this.showError('User not found');
            return;
        }
        
        // Store current user for modal actions
        this.currentModalUser = user;
        
        try {
            // Populate user details modal
            document.getElementById('userDetailsTitle').textContent = `${user.firstName} ${user.lastName}${user.isAdmin ? ' (Administrator)' : ''}`;
            document.getElementById('userFullName').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('userEmail').textContent = user.email;
            
            // Status badge
            const statusEl = document.getElementById('userStatus');
            if (isPending) {
                statusEl.innerHTML = '<span class="badge badge-warning">Pending Verification</span>';
            } else if (user.isAdmin) {
                statusEl.innerHTML = '<span class="badge badge-admin">Administrator</span>';
            } else {
                const status = this.getSubscriptionStatus(user);
                const statusClass = status.active ? (status.type === 'trial' ? 'badge-warning' : 'badge-success') : 'badge-danger';
                const statusText = status.active ? (status.type === 'trial' ? 'Trial Active' : 'Premium Active') : 'Access Expired';
                statusEl.innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
            }
            
            // Account information
            document.getElementById('userDetailId').textContent = user.id;
            document.getElementById('userDetailVerified').textContent = user.emailVerified ? 'Yes' : 'No';
            document.getElementById('userDetailCreated').textContent = new Date(user.createdAt).toLocaleDateString();
            document.getElementById('userDetailProvider').textContent = user.aiProvider || 'Not Set';
            
            // Subscription status
            if (isPending) {
                document.getElementById('userDetailStatus').textContent = 'Pending Verification';
                document.getElementById('userDetailTrial').textContent = 'N/A';
                document.getElementById('userDetailExpiry').textContent = 'N/A';
                document.getElementById('userDetailAccess').textContent = 'No Access';
            } else if (user.isAdmin) {
                document.getElementById('userDetailStatus').textContent = 'Administrator';
                document.getElementById('userDetailTrial').textContent = 'N/A';
                document.getElementById('userDetailExpiry').textContent = 'Permanent';
                document.getElementById('userDetailAccess').textContent = 'Full Access';
            } else {
                const status = this.getSubscriptionStatus(user);
                document.getElementById('userDetailStatus').textContent = status.active ? 
                    (status.type === 'trial' ? 'Trial Active' : 'Premium Active') : 'Expired';
                
                if (status.type === 'trial') {
                    const timeLeft = new Date(status.expiry).getTime() - Date.now();
                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                    document.getElementById('userDetailTrial').textContent = timeLeft > 0 ? `${hoursLeft} hours remaining` : 'Expired';
                } else {
                    document.getElementById('userDetailTrial').textContent = 'N/A';
                }
                
                document.getElementById('userDetailExpiry').textContent = status.expiry ? 
                    new Date(status.expiry).toLocaleDateString() : 'N/A';
                document.getElementById('userDetailAccess').textContent = status.active ? 'Active' : 'No Access';
            }
            
            // Usage statistics (placeholder - you can implement actual tracking)
            document.getElementById('userDetailConversations').textContent = '0'; // Implement conversation tracking
            document.getElementById('userDetailLastLogin').textContent = 'Current Session'; // Implement last login tracking
            document.getElementById('userDetailApiKeys').textContent = this.getUserApiKeyStatus(user);
            document.getElementById('userDetailType').textContent = user.isAdmin ? 'Administrator' : 'Regular User';
            
            // Show/hide action buttons based on user type
            const actionButtons = document.querySelector('.user-actions-section');
            if (user.isAdmin || isPending) {
                actionButtons.style.display = 'none';
            } else {
                actionButtons.style.display = 'flex';
            }
            
            // Show the modal (it will appear on top due to higher z-index)
            document.getElementById('userDetailsModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error showing user details:', error);
            this.showError('Failed to load user details');
        }
    }
        document.getElementById('userDetailVerified').textContent = user.emailVerified ? 'Yes' : 'No';
        document.getElementById('userDetailCreated').textContent = new Date(user.createdAt).toLocaleDateString();
        document.getElementById('userDetailProvider').textContent = user.aiProvider || 'Not Set';
        
        // Subscription status
        if (isPending) {
            document.getElementById('userDetailStatus').textContent = 'Pending Verification';
            document.getElementById('userDetailTrial').textContent = 'N/A';
            document.getElementById('userDetailExpiry').textContent = 'N/A';
            document.getElementById('userDetailAccess').textContent = 'No Access';
        } else if (user.isAdmin) {
            document.getElementById('userDetailStatus').textContent = 'Administrator';
            document.getElementById('userDetailTrial').textContent = 'N/A';
            document.getElementById('userDetailExpiry').textContent = 'Permanent';
            document.getElementById('userDetailAccess').textContent = 'Full Access';
        } else {
            const status = this.getSubscriptionStatus(user);
            document.getElementById('userDetailStatus').textContent = status.active ? 
                (status.type === 'trial' ? 'Trial Active' : 'Premium Active') : 'Expired';
            
            if (status.type === 'trial') {
                const timeLeft = new Date(status.expiry).getTime() - Date.now();
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                document.getElementById('userDetailTrial').textContent = timeLeft > 0 ? `${hoursLeft} hours remaining` : 'Expired';
            } else {
                document.getElementById('userDetailTrial').textContent = 'N/A';
            }
            
            document.getElementById('userDetailExpiry').textContent = status.expiry ? 
                new Date(status.expiry).toLocaleDateString() : 'N/A';
            document.getElementById('userDetailAccess').textContent = status.active ? 'Active' : 'No Access';
        }
        
        // Usage statistics (placeholder - you can implement actual tracking)
        document.getElementById('userDetailConversations').textContent = '0'; // Implement conversation tracking
        document.getElementById('userDetailLastLogin').textContent = 'Current Session'; // Implement last login tracking
        document.getElementById('userDetailApiKeys').textContent = this.getUserApiKeyStatus(user);
        document.getElementById('userDetailType').textContent = user.isAdmin ? 'Administrator' : 'Regular User';
        
        // Show/hide action buttons based on user type
        const actionButtons = document.querySelector('.user-actions-section');
        if (user.isAdmin) {
            actionButtons.style.display = 'none';
        } else {
            actionButtons.style.display = 'block';
        }
        
        // Show the modal (it will appear on top due to higher z-index)
        document.getElementById('userDetailsModal').classList.remove('hidden');
    }
    
    getUserApiKeyStatus(user) {
        const keys = [];
        if (user.openaiApiKey && user.openaiApiKey.startsWith('sk-')) keys.push('OpenAI');
        if (user.geminiApiKey && user.geminiApiKey.startsWith('AIza')) keys.push('Gemini');
        return keys.length > 0 ? keys.join(', ') : 'None';
    }
    
    // Modal action handlers
    backToUserListFromModal() {
        // Close user details modal
        document.getElementById('userDetailsModal').classList.add('hidden');
        // Show the filtered users modal if there was a previous filter
        if (this.currentModalFilter) {
            this.showFilteredUsers(this.currentModalFilter);
        }
    }
    
    grantUserAccessFromModal() {
        if (this.currentModalUser) {
            // Close user details modal
            document.getElementById('userDetailsModal').classList.add('hidden');
            // Grant access
            this.grantAccess(this.currentModalUser.id);
            // Refresh the filtered users modal if it was open
            if (this.currentModalFilter) {
                setTimeout(() => {
                    this.showFilteredUsers(this.currentModalFilter);
                }, 500);
            }
        }
    }
    
    resetUserPasswordFromModal() {
        if (this.currentModalUser) {
            // Close user details modal
            document.getElementById('userDetailsModal').classList.add('hidden');
            // Reset password
            this.resetUserPassword(this.currentModalUser.id);
            // Refresh the filtered users modal if it was open
            if (this.currentModalFilter) {
                setTimeout(() => {
                    this.showFilteredUsers(this.currentModalFilter);
                }, 500);
            }
        }
    }
    
    editUserFromModal() {
        if (this.currentModalUser) {
            // Close user details modal
            document.getElementById('userDetailsModal').classList.add('hidden');
            // Edit user
            this.editUser(this.currentModalUser.id);
            // Refresh the filtered users modal if it was open
            if (this.currentModalFilter) {
                setTimeout(() => {
                    this.showFilteredUsers(this.currentModalFilter);
                }, 500);
            }
        }
    }
    
    viewUserConversationsFromModal() {
        if (this.currentModalUser) {
            // Close user details modal
            document.getElementById('userDetailsModal').classList.add('hidden');
            // View conversations
            this.viewUserConversations(this.currentModalUser.id);
        }
    }
    
    deleteUserFromModal() {
        if (this.currentModalUser) {
            // Close user details modal
            document.getElementById('userDetailsModal').classList.add('hidden');
            // Delete user
            this.deleteUser(this.currentModalUser.id);
            // Refresh the filtered users modal if it was open
            if (this.currentModalFilter) {
                setTimeout(() => {
                    this.showFilteredUsers(this.currentModalFilter);
                }, 500);
            }
        }
    }
    
    // Filtered users modal functionality
    filterModalUsers() {
        const searchTerm = document.getElementById('filteredUserSearch').value.toLowerCase();
        const userCards = document.querySelectorAll('.filtered-user-card');
        
        userCards.forEach(card => {
            const userName = card.querySelector('.user-name h4').textContent.toLowerCase();
            const userEmail = card.querySelector('.user-email').textContent.toLowerCase();
            
            if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    refreshFilteredUsers() {
        if (this.currentModalFilter) {
            this.showFilteredUsers(this.currentModalFilter);
        }
    }
    
    toggleSelectAllFiltered() {
        const checkboxes = document.querySelectorAll('.filtered-user-select');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
    }
    
    bulkGrantFromModal() {
        const selectedIds = Array.from(document.querySelectorAll('.filtered-user-select:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            this.showError('No users selected');
            return;
        }
        
        // Close the filtered users modal and show bulk grant modal
        document.getElementById('filteredUsersModal').classList.add('hidden');
        
        // Update bulk count and show modal
        document.getElementById('bulkCount').textContent = selectedIds.length;
        document.getElementById('bulkGrantModal').classList.remove('hidden');
        
        // Store selected IDs for bulk grant
        this.selectedUserIds = selectedIds;
    }

    // ==========================================
    // ADMIN DASHBOARD FUNCTIONALITY
    // ==========================================

    handleSettings(e) {
        e.preventDefault();
        
        // Get AI provider
        this.currentUser.aiProvider = document.getElementById('aiProvider').value;
        
        // Only get API keys from fields that exist
        const openaiField = document.getElementById('openaiApiKey');
        const geminiField = document.getElementById('geminiApiKey');
        
        if (openaiField) this.currentUser.openaiApiKey = openaiField.value;
        if (geminiField) this.currentUser.geminiApiKey = geminiField.value;
        
        const newPass = document.getElementById('newPassword').value;
        if (newPass) this.currentUser.password = newPass;

        this.updateUserRecord(this.currentUser);
        
        // Show which provider is active
        const provider = this.currentUser.aiProvider;
        let providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        if (provider === 'puter') providerName = 'Puter.js AI (Free)';
        
        this.showSuccess(`Settings Saved (${providerName} Active)`);
        this.hideSettings();
    }

    // Admin
    async loadAdminDashboard() {
        try {
            console.log('🔄 Loading admin dashboard...');
            
            // Try server-side first, fall back to client-side
            if (this.serverRunning) {
                await this.loadServerAdminDashboard();
            } else {
                console.log('📊 Server not available, using client-side admin dashboard');
                this.loadClientSideAdminDashboard();
            }
            
        } catch (error) {
            console.error('Admin dashboard load error:', error);
            console.log('📊 Falling back to client-side admin dashboard');
            this.loadClientSideAdminDashboard();
        }
    }
    
    async loadServerAdminDashboard() {
        // Load stats
        const statsResponse = await fetch(this.getApiUrl('admin/stats'), {
            headers: { 'Authorization': `Bearer ${this.sessionToken}` }
        });
        
        console.log('📊 Stats response status:', statsResponse.status);
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            const stats = statsData.stats;
            
            console.log('📊 Admin Stats:', stats);
            
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('verifiedUsers').textContent = stats.verifiedUsers || 0;
            document.getElementById('pendingVerifications').textContent = stats.pendingVerifications || 0;
            document.getElementById('activeSubscriptions').textContent = stats.activeSubscriptions || 0;
            document.getElementById('trialUsers').textContent = stats.trialUsers || 0;
        }
        
        // Load users and other data
        await this.loadUsers();
        await this.loadPendingVerifications();
        await this.loadAdminConfig();
    }
    
    loadClientSideAdminDashboard() {
        // Load from localStorage
        const users = this.loadUsers() || [];
        const pending = this.loadPendingVerificationsData() || [];
        
        // Calculate stats properly
        const allUsers = users; // Include all users for total count
        const regularUsers = users.filter(u => !u.isAdmin); // Exclude admins for most stats
        const verifiedUsers = regularUsers.filter(u => u.emailVerified);
        
        const now = Date.now();
        const trialDuration = 24 * 60 * 60 * 1000;
        
        // Calculate trial users (non-admin users currently in trial period)
        const trialUsers = regularUsers.filter(u => {
            if (u.subscriptionExpiry) return false; // Has paid subscription
            const trialEnd = (u.createdAt || now) + trialDuration;
            return now < trialEnd && u.emailVerified; // Must be verified and in trial period
        });
        
        // Calculate active subscriptions (users with valid subscription expiry)
        const activeSubscriptions = regularUsers.filter(u => {
            if (!u.subscriptionExpiry) return false;
            return new Date(u.subscriptionExpiry).getTime() > now;
        });
        
        // Update stats display - show all users including admins for total
        document.getElementById('totalUsers').textContent = allUsers.length;
        document.getElementById('verifiedUsers').textContent = verifiedUsers.length;
        document.getElementById('pendingVerifications').textContent = pending.length;
        document.getElementById('activeSubscriptions').textContent = activeSubscriptions.length;
        document.getElementById('trialUsers').textContent = trialUsers.length;
        
        // Load users table (exclude admins from main table)
        this.populateUserTable(regularUsers);
        
        // Load pending verifications
        this.displayPendingVerifications(pending);
        
        console.log('📊 Client-side admin dashboard loaded');
        console.log('📊 Stats:', {
            total: allUsers.length,
            verified: verifiedUsers.length,
            pending: pending.length,
            active: activeSubscriptions.length,
            trial: trialUsers.length
        });
    }

    async loadUsers(search = '', filter = 'all', page = 1) {
        try {
            const params = new URLSearchParams({ search, filter, page, limit: 50 });
            const response = await fetch(this.getApiUrl(`admin/users?${params}`), {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.users = data.users; // Store users for CSV export
                this.populateUserTable(data.users);
                this.updatePagination(data.pagination);
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.showError('Failed to load users');
        }
    }

    async loadPendingVerifications() {
        try {
            console.log('🔄 Loading pending verifications...');
            console.log('🔄 Session token:', this.sessionToken ? 'exists' : 'missing');
            
            const response = await fetch(this.getApiUrl('admin/pending'), {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            console.log('📋 Pending response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('📋 Pending data:', data);
                
                // Ensure data.pending exists and is an array
                const pendingList = data.pending || [];
                console.log('📋 Pending list length:', pendingList.length);
                this.displayPendingVerifications(pendingList);
            } else {
                console.error('❌ Failed to load pending verifications:', response.status);
                const errorData = await response.text();
                console.error('❌ Error details:', errorData);
                // Show empty list on error
                this.displayPendingVerifications([]);
            }
        } catch (error) {
            console.error('❌ Load pending verifications error:', error);
            console.error('❌ Error stack:', error.stack);
            // Show empty list on error
            this.displayPendingVerifications([]);
        }
    }

    async loadAdminConfig() {
        try {
            const response = await fetch(this.getApiUrl('config'), {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const config = data.config;
                
                // Populate form fields with null checks
                const monthlyFeeEl = document.getElementById('adminMonthlyFee');
                const paypalClientIdEl = document.getElementById('adminPaypalClientId');
                const paypalClientSecretEl = document.getElementById('adminPaypalClientSecret');
                const stripeSecretKeyEl = document.getElementById('adminStripeSecretKey');
                const stripeWebhookSecretEl = document.getElementById('adminStripeWebhookSecret');
                const systemGeminiKeyEl = document.getElementById('adminSystemGeminiKey');
                
                if (monthlyFeeEl) monthlyFeeEl.value = config.monthlyFee || '29';
                if (paypalClientIdEl) paypalClientIdEl.value = config.paypalClientId || '';
                if (paypalClientSecretEl) paypalClientSecretEl.value = config.paypalClientSecret || '';
                if (stripeSecretKeyEl) stripeSecretKeyEl.value = config.stripeSecretKey || '';
                if (stripeWebhookSecretEl) stripeWebhookSecretEl.value = config.stripeWebhookSecret || '';
                if (systemGeminiKeyEl) systemGeminiKeyEl.value = config.systemGeminiKey || '';
                
                // Load email configuration
                this.loadEmailConfig(config);
                
                // Show configuration status
                this.updateConfigStatus(config);
            }
        } catch (error) {
            console.error('Load admin config error:', error);
        }
    }
    
    loadEmailConfig(config) {
        const emailConfig = config.emailConfig;
        
        if (emailConfig) {
            const emailEl = document.getElementById('smtpEmail');
            const providerEl = document.getElementById('smtpProvider');
            const hostEl = document.getElementById('smtpHost');
            const portEl = document.getElementById('smtpPort');
            
            if (emailEl) emailEl.value = emailConfig.email || '';
            if (providerEl) providerEl.value = emailConfig.provider || 'gmail';
            if (hostEl) hostEl.value = emailConfig.host || '';
            if (portEl) portEl.value = emailConfig.port || 587;
            
            // Toggle custom SMTP settings if needed
            this.toggleCustomSmtp(emailConfig.provider || 'gmail');
            
            // Update email status
            this.updateEmailStatus(true);
        } else {
            this.updateEmailStatus(false);
        }
    }

    updateConfigStatus(config) {
        // Update status indicators
        const stripeStatus = document.getElementById('stripeStatus') || this.createStatusIndicator('Stripe', config.hasStripe);
        const paypalStatus = document.getElementById('paypalStatus') || this.createStatusIndicator('PayPal', config.hasPaypal);
        const emailStatus = document.getElementById('emailStatus') || this.createStatusIndicator('Email', config.hasEmail);
        
        // You can add these status indicators to the admin panel
    }

    createStatusIndicator(name, isConfigured) {
        const indicator = document.createElement('div');
        indicator.className = `status-indicator ${isConfigured ? 'configured' : 'not-configured'}`;
        indicator.innerHTML = `${name}: ${isConfigured ? '✅ Configured' : '❌ Not Configured'}`;
        return indicator;
    }

    populateUserTable(users) {
        const tbody = document.getElementById('usersListTableBody');
        tbody.innerHTML = users.map(u => {
            const status = u.status;
            const statusIcon = u.emailVerified ? '✅' : '❌';
            const isAdmin = u.isAdmin;
            
            // Different status display for admin users
            let statusText, expiryText;
            if (isAdmin) {
                statusText = '👑 Admin';
                expiryText = 'Permanent';
            } else {
                statusText = status.active ? (status.type === 'trial' ? '🆓 Trial' : '💎 Premium') : '⏰ Expired';
                expiryText = status.expiry ? new Date(status.expiry).toLocaleDateString() : 'N/A';
            }
            
            // Different actions for admin users
            const userActions = isAdmin ? `
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="app.editUser('${u.id}')">
                        <i class="fa-solid fa-edit"></i> Edit
                    </button>
                    <span class="badge badge-admin">Admin User</span>
                </div>
            ` : `
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="app.editUser('${u.id}')">
                        <i class="fa-solid fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-success" onclick="app.grantAccess('${u.id}')">
                        <i class="fa-solid fa-key"></i> Grant
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteUser('${u.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            return `
                <tr data-user-id="${u.id}" ${isAdmin ? 'class="admin-user-row"' : ''}>
                    <td><input type="checkbox" class="user-select-cb" value="${u.id}" ${isAdmin ? 'disabled' : ''}></td>
                    <td>
                        <strong>${u.firstName} ${u.lastName}</strong>${isAdmin ? ' 👑' : ''}<br>
                        <small>${u.email}</small><br>
                        <small class="text-muted">Joined: ${new Date(u.createdAt).toLocaleDateString()}</small>
                    </td>
                    <td>${statusIcon} ${u.emailVerified ? 'Verified' : 'Pending'}</td>
                    <td>
                        ${statusText}<br>
                        <small>Expires: ${expiryText}</small>
                    </td>
                    <td>
                        ${userActions}
                    </td>
                </tr>
            `;
        }).join('');
    }

    displayPendingVerifications(pending) {
        const pendingDiv = document.getElementById('pendingList');
        
        // Handle undefined, null, or non-array values
        if (!pending || !Array.isArray(pending) || pending.length === 0) {
            pendingDiv.innerHTML = '<p class="text-muted">No pending verifications</p>';
            return;
        }
        
        pendingDiv.innerHTML = pending.map(p => `
            <div class="pending-card">
                <h4>${p.userData.firstName} ${p.userData.lastName}</h4>
                <p>${p.userData.email}</p>
                <small>Registered: ${new Date(p.createdAt).toLocaleString()}</small>
                <div class="pending-actions">
                    <button class="btn btn-sm btn-success" onclick="app.approveVerification('${p.token}')">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.rejectVerification('${p.token}')">
                        <i class="fa-solid fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    updatePagination(pagination) {
        // You can implement pagination controls here if needed
        console.log('Pagination:', pagination);
    }

    loadSystemSettings() {
        const systemSettings = this.loadSystemSettingsData();
        document.getElementById('allowRegistration').checked = systemSettings.allowRegistration !== false;
        document.getElementById('requireEmailVerification').checked = systemSettings.requireEmailVerification !== false;
    }

    updateStorageUsage() {
        const usage = JSON.stringify(localStorage).length;
        const usageKB = (usage / 1024).toFixed(2);
        document.getElementById('storageUsed').textContent = `${usageKB} KB`;
    }

    // Admin Profile Management
    showAdminProfile() {
        // Populate admin profile form with current user data
        document.getElementById('adminFirstName').value = this.currentUser.firstName || '';
        document.getElementById('adminLastName').value = this.currentUser.lastName || '';
        document.getElementById('adminEmail').value = this.currentUser.email || '';
        
        // Clear password fields
        document.getElementById('adminCurrentPassword').value = '';
        document.getElementById('adminNewPassword').value = '';
        document.getElementById('adminConfirmPassword').value = '';
        
        this.showPage('adminProfilePage');
    }

    async handleAdminProfileUpdate(e) {
        e.preventDefault();
        this.showLoading();
        
        try {
            const firstName = document.getElementById('adminFirstName').value.trim();
            const lastName = document.getElementById('adminLastName').value.trim();
            const email = document.getElementById('adminEmail').value.trim();
            const currentPassword = document.getElementById('adminCurrentPassword').value;
            const newPassword = document.getElementById('adminNewPassword').value;
            const confirmPassword = document.getElementById('adminConfirmPassword').value;
            
            // Basic validation
            if (!firstName || !lastName || !email) {
                this.showError('First name, last name, and email are required');
                return;
            }
            
            // Password validation if changing password
            if (newPassword || confirmPassword) {
                if (!currentPassword) {
                    this.showError('Current password is required to change password');
                    return;
                }
                
                if (currentPassword !== this.currentUser.password) {
                    this.showError('Current password is incorrect');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    this.showError('New passwords do not match');
                    return;
                }
                
                if (newPassword.length < 6) {
                    this.showError('New password must be at least 6 characters');
                    return;
                }
            }
            
            // Update user profile
            const updateData = {
                firstName: firstName,
                lastName: lastName,
                email: email
            };
            
            if (newPassword) {
                updateData.password = newPassword;
            }
            
            const response = await fetch(this.getApiUrl('user/profile'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify(updateData)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update current user data
                this.currentUser = { ...this.currentUser, ...updateData };
                
                this.showSuccess('Profile updated successfully!');
                this.showPage('adminDashboard');
            } else {
                this.showError(data.error || 'Failed to update profile');
            }
            
        } catch (error) {
            console.error('Admin profile update error:', error);
            this.showError('Failed to update profile. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(this.getApiUrl(`admin/user/${userId}`), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('User deleted successfully');
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError('Failed to delete user');
        }
    }

    async grantAccess(userId) {
        const duration = prompt('Grant access for how many months? (Enter "forever" for permanent access)', '1');
        if (!duration) return;
        
        try {
            const response = await fetch(this.getApiUrl('admin/grant-access'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    userIds: [userId],
                    duration: duration
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess(data.message);
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to grant access');
            }
        } catch (error) {
            console.error('Grant access error:', error);
            this.showError('Failed to grant access');
        }
    }

    async resetUserPassword(userId) {
        const newPassword = prompt('Enter new password for user (minimum 6 characters):', '');
        if (!newPassword) return;
        
        if (newPassword.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }
        
        if (!confirm(`Are you sure you want to reset this user's password to "${newPassword}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(this.getApiUrl(`admin/reset-password/${userId}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    newPassword: newPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Password reset successfully');
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showError('Failed to reset password');
        }
    }

    async editUser(userId) {
        // Find the user
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }
        
        const firstName = prompt('First Name:', user.firstName);
        if (firstName === null) return; // User cancelled
        
        const lastName = prompt('Last Name:', user.lastName);
        if (lastName === null) return; // User cancelled
        
        const email = prompt('Email:', user.email);
        if (email === null) return; // User cancelled
        
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            this.showError('All fields are required');
            return;
        }
        
        try {
            const response = await fetch(this.getApiUrl(`admin/edit-user/${userId}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: email.trim()
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('User updated successfully');
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to update user');
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.showError('Failed to update user');
        }
    }

    async viewUserConversations(userId) {
        try {
            const response = await fetch(this.getApiUrl(`admin/user-conversations/${userId}`), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                const conversations = data.conversations || [];
                if (conversations.length === 0) {
                    this.showSuccess('This user has no conversations yet');
                } else {
                    let conversationText = `User has ${conversations.length} conversation(s):\n\n`;
                    conversations.forEach((conv, index) => {
                        conversationText += `${index + 1}. ${conv.toolName} - ${new Date(conv.timestamp).toLocaleString()}\n`;
                        conversationText += `Input: ${conv.input.substring(0, 100)}${conv.input.length > 100 ? '...' : ''}\n`;
                        conversationText += `Provider: ${conv.provider}\n\n`;
                    });
                    alert(conversationText);
                }
            } else {
                this.showError(data.error || 'Failed to load conversations');
            }
        } catch (error) {
            console.error('View conversations error:', error);
            this.showError('Failed to load conversations');
        }
    }

    // Pending Verification Actions
    async approveVerification(token) {
        try {
            const response = await fetch(this.getApiUrl('admin/approve-verification'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess(data.message);
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to approve verification');
            }
        } catch (error) {
            console.error('Approve verification error:', error);
            this.showError('Failed to approve verification');
        }
    }

    async rejectVerification(token) {
        if (!confirm('Are you sure you want to reject this verification?')) {
            return;
        }
        
        try {
            const response = await fetch(this.getApiUrl('admin/reject-verification'), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess(data.message);
                this.loadAdminDashboard();
            } else {
                this.showError(data.error || 'Failed to reject verification');
            }
        } catch (error) {
            console.error('Reject verification error:', error);
            this.showError('Failed to reject verification');
        }
    }

    // User Filtering
    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value;
        const filterType = document.getElementById('userFilter').value;
        
        // Add visual feedback for filtering
        const usersTable = document.getElementById('usersTable');
        if (usersTable) {
            usersTable.style.opacity = '0.6';
        }
        
        // Load filtered users
        this.loadUsers(searchTerm, filterType).then(() => {
            // Restore visual feedback
            if (usersTable) {
                usersTable.style.opacity = '1';
            }
        });
    }

    handlePaymentConfig(e) {
        e.preventDefault();
        
        // Get form elements with null checking
        const monthlyFeeEl = document.getElementById('adminMonthlyFee');
        const paypalClientIdEl = document.getElementById('adminPaypalClientId');
        const paypalClientSecretEl = document.getElementById('adminPaypalClientSecret');
        const stripeSecretKeyEl = document.getElementById('adminStripeSecretKey');
        const stripeWebhookSecretEl = document.getElementById('adminStripeWebhookSecret');
        const systemGeminiKeyEl = document.getElementById('adminSystemGeminiKey');
        
        // Build config object with null checks
        this.paymentConfig = {
            monthlyFee: monthlyFeeEl ? monthlyFeeEl.value : '',
            paypalClientId: paypalClientIdEl ? paypalClientIdEl.value : '',
            paypalClientSecret: paypalClientSecretEl ? paypalClientSecretEl.value : '',
            stripeSecretKey: stripeSecretKeyEl ? stripeSecretKeyEl.value : '',
            stripeWebhookSecret: stripeWebhookSecretEl ? stripeWebhookSecretEl.value : '',
            systemGeminiKey: systemGeminiKeyEl ? systemGeminiKeyEl.value : ''
        };
        
        // Save to localStorage
        localStorage.setItem('paymentConfig', JSON.stringify(this.paymentConfig));
        
        // Update server configuration if available
        this.updateServerPaymentConfig();
        
        this.showSuccess('Payment settings saved successfully');
    }

    async handleEmailConfig(e) {
        e.preventDefault();
        
        const emailEl = document.getElementById('smtpEmail');
        const passwordEl = document.getElementById('smtpPassword');
        const providerEl = document.getElementById('smtpProvider');
        const hostEl = document.getElementById('smtpHost');
        const portEl = document.getElementById('smtpPort');
        
        if (!emailEl || !passwordEl || !providerEl) {
            this.showError('Email configuration form not found');
            return;
        }
        
        const emailConfig = {
            email: emailEl.value,
            password: passwordEl.value,
            provider: providerEl.value,
            host: hostEl ? hostEl.value : '',
            port: portEl ? portEl.value : 587
        };
        
        if (!emailConfig.email || !emailConfig.password) {
            this.showError('Email and password are required');
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch(this.getApiUrl('admin/email-config'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify(emailConfig)
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Email configuration saved and tested successfully!');
                this.updateEmailStatus(true);
                
                // Clear password field for security
                passwordEl.value = '';
            } else {
                this.showError(data.error || 'Failed to save email configuration');
                this.updateEmailStatus(false);
            }
            
        } catch (error) {
            console.error('Email config error:', error);
            this.showError('Failed to save email configuration');
            this.updateEmailStatus(false);
        } finally {
            this.hideLoading();
        }
    }
    
    async sendTestEmail() {
        try {
            this.showLoading();
            
            const response = await fetch(this.getApiUrl('admin/test-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    testEmail: this.currentUser.email
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Test email sent successfully! Check your inbox.');
            } else {
                this.showError(data.error || 'Failed to send test email');
            }
            
        } catch (error) {
            console.error('Test email error:', error);
            this.showError('Failed to send test email');
        } finally {
            this.hideLoading();
        }
    }
    
    toggleCustomSmtp(provider) {
        const customSettings = document.getElementById('customSmtpSettings');
        if (customSettings) {
            if (provider === 'custom') {
                customSettings.classList.remove('hidden');
            } else {
                customSettings.classList.add('hidden');
            }
        }
    }
    
    updateEmailStatus(isWorking) {
        const statusEl = document.getElementById('emailStatus');
        if (statusEl) {
            const dot = statusEl.querySelector('.status-dot');
            const text = statusEl.querySelector('span:last-child') || statusEl;
            
            if (isWorking) {
                dot.className = 'status-dot status-success';
                text.textContent = 'Email service configured and working';
            } else {
                dot.className = 'status-dot status-error';
                text.textContent = 'Email service not configured';
            }
        }
    }

    async updateServerPaymentConfig() {
        try {
            const endpoint = this.getApiUrl('config');
            if (endpoint && this.serverRunning && this.sessionToken) {
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.sessionToken}`
                    },
                    body: JSON.stringify(this.paymentConfig)
                });
                
                if (response.ok) {
                    console.log('✅ Server payment configuration updated');
                } else {
                    console.warn('⚠️ Failed to update server payment config:', response.status);
                }
            }
        } catch (error) {
            console.warn('Failed to update server payment config:', error);
        }
    }

    // Bulk Actions
    toggleSelectAll(checked) { 
        document.querySelectorAll('.user-select-cb').forEach(cb => cb.checked = checked); 
    }
    
    showBulkGrantModal() { 
        const selected = document.querySelectorAll('.user-select-cb:checked');
        if (selected.length === 0) return this.showError('No users selected');
        
        document.getElementById('bulkCount').textContent = selected.length;
        document.getElementById('bulkGrantModal').classList.remove('hidden'); 
    }
    
    async handleBulkGrant(e) {
        e.preventDefault();
        const duration = document.getElementById('grantDuration').value;
        
        // Use selected IDs from modal if available, otherwise get from main table
        let selectedIds = this.selectedUserIds || Array.from(document.querySelectorAll('.user-select-cb:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            return this.showError('No users selected');
        }
        
        try {
            // Call server endpoint if available
            const endpoint = this.getApiUrl('admin/grant-access');
            if (endpoint && this.serverRunning) {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userIds: selectedIds,
                        duration: duration,
                        adminId: this.currentUser.id
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Server confirmed bulk access grant');
                }
            }
            
            // Update local data
            const expiryDate = new Date();
            if (duration === 'forever') {
                expiryDate.setFullYear(expiryDate.getFullYear() + 100);
            } else {
                expiryDate.setMonth(expiryDate.getMonth() + parseInt(duration));
            }
            
            this.users.forEach(u => {
                if (selectedIds.includes(u.id)) {
                    u.subscriptionExpiry = expiryDate.toISOString();
                }
            });
            
            this.saveUsers(this.users);
            document.getElementById('bulkGrantModal').classList.add('hidden');
            
            // Clear selected IDs
            this.selectedUserIds = null;
            
            // Refresh the appropriate view
            if (this.currentModalFilter) {
                this.showFilteredUsers(this.currentModalFilter);
            } else {
                this.loadAdminDashboard();
            }
            
            const durationText = duration === 'forever' ? 'permanent' : `${duration} month${duration > 1 ? 's' : ''}`;
            this.showSuccess(`${durationText} access granted to ${selectedIds.length} users!`);
            
        } catch (error) {
            console.error('Bulk grant error:', error);
            this.showError('Failed to grant access: ' + error.message);
        }
    }

    exportUsersCSV() {
        // Get the current filter to determine which users to export
        const currentFilter = document.getElementById('userFilter').value;
        
        // Use all users if "all" is selected, otherwise exclude admins
        const usersToExport = currentFilter === 'all' ? this.users : this.users.filter(u => !u.isAdmin);
        
        const csvData = [
            ['Name', 'Email', 'Verified', 'Status', 'User Type', 'Created', 'Subscription Expiry']
        ];
        
        usersToExport.forEach(u => {
            let statusText, userType;
            
            if (u.isAdmin) {
                statusText = 'Admin';
                userType = 'Administrator';
            } else {
                const status = this.getSubscriptionStatus(u);
                statusText = status.type === 'trial' ? 'Trial' : (status.type === 'subscription' ? 'Premium' : 'Expired');
                userType = 'Regular User';
            }
            
            csvData.push([
                `${u.firstName} ${u.lastName}`,
                u.email,
                u.emailVerified ? 'Yes' : 'No',
                statusText,
                userType,
                new Date(u.createdAt).toLocaleDateString(),
                u.isAdmin ? 'Permanent' : (u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'N/A')
            ]);
        });
        
        const csvContent = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showSuccess(`${usersToExport.length} users exported to CSV`);
    }

    resetUserPassword(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const newPassword = 'TempPass123!';
        user.password = newPassword;
        this.saveUsers(this.users);
        
        alert(`Password reset for ${user.email}\nNew password: ${newPassword}\nUser should change this immediately.`);
        this.showSuccess('Password reset successfully');
    }

    // Data Loaders
    loadUsers() { 
        const u = localStorage.getItem('users'); 
        const users = u ? JSON.parse(u) : [{ 
            id: '1', 
            email: 'talk2char@gmail.com', 
            password: 'Password@123', 
            isAdmin: true, 
            firstName:'Super', 
            lastName:'Admin', 
            emailVerified: true,
            aiProvider: 'puter' // Ensure admin has default provider
        }];
        
        // Migrate existing users to have aiProvider
        users.forEach(user => {
            if (!user.aiProvider) {
                user.aiProvider = 'puter';
            }
        });
        
        return users;
    }
    saveUsers(u) { localStorage.setItem('users', JSON.stringify(u)); }
    loadPendingVerificationsData() { const p = localStorage.getItem('pendingVerifications'); return p ? JSON.parse(p) : []; }
    savePendingVerifications(p) { localStorage.setItem('pendingVerifications', JSON.stringify(p)); }
    loadPaymentConfig() { const c = localStorage.getItem('paymentConfig'); return c ? JSON.parse(c) : {}; }

    // UI Helpers
    showPage(id) { 
        console.log(`📄 Showing page: ${id}`);
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden')); 
        const targetPage = document.getElementById(id);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        } else {
            console.error(`❌ Page not found: ${id}`);
        }
    }
    showSettings() { 
        try {
            console.log('⚙️ Opening settings modal...');
            
            // Ensure we have a current user
            if (!this.currentUser) {
                console.error('❌ No current user found for settings');
                this.showError('Please log in to access settings');
                return;
            }
            
            // Populate current values
            const aiProviderField = document.getElementById('aiProvider');
            if (aiProviderField) {
                aiProviderField.value = this.currentUser.aiProvider || 'puter';
                console.log('✅ AI Provider set to:', aiProviderField.value);
            } else {
                console.error('❌ AI Provider field not found');
            }
            
            // Only populate fields that exist in the HTML
            const openaiField = document.getElementById('openaiApiKey');
            const geminiField = document.getElementById('geminiApiKey');
            const passwordField = document.getElementById('newPassword');
            
            if (openaiField) {
                openaiField.value = this.currentUser.openaiApiKey || '';
                console.log('✅ OpenAI field populated');
            } else {
                console.log('ℹ️ OpenAI field not found (expected if removed)');
            }
            
            if (geminiField) {
                geminiField.value = this.currentUser.geminiApiKey || '';
                console.log('✅ Gemini field populated');
            } else {
                console.log('ℹ️ Gemini field not found (expected if removed)');
            }
            
            if (passwordField) {
                passwordField.value = '';
                console.log('✅ Password field cleared');
            } else {
                console.error('❌ Password field not found');
            }
            
            // Show/hide appropriate sections
            this.toggleKeyFields(this.currentUser.aiProvider || 'puter');
            
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal) {
                settingsModal.classList.remove('hidden');
                console.log('✅ Settings modal opened');
            } else {
                console.error('❌ Settings modal not found');
                this.showError('Settings modal not available');
            }
            
        } catch (error) {
            console.error('❌ Settings error:', error);
            this.showError('Failed to open settings: ' + error.message);
        }
    }
    hideSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
    showLoading() { document.getElementById('loading').classList.remove('hidden'); }
    hideLoading() { document.getElementById('loading').classList.add('hidden'); }
    
    showSuccess(msg) { this.showToast(msg, 'success'); }
    showError(msg) { this.showToast(msg, 'error'); }
    
    showToast(message, type) {
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
    }
    
    clearOutput(tool) {
        document.getElementById(`${tool}Output`).textContent = '';
        document.getElementById(`${tool}Input`).value = '';
        
        // Clear and hide follow-up section
        const followupInput = document.getElementById(`${tool}Followup`);
        const followupSection = document.getElementById(`${tool}FollowupSection`);
        if (followupInput) followupInput.value = '';
        if (followupSection) followupSection.classList.add('hidden');
    }
    
    switchAdminTab(tab) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Show selected tab
        const targetTab = document.getElementById(`${tab}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`button[data-tab="${tab}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        console.log(`📋 Switched to admin tab: ${tab}`);
    }
}

// Global error handlers to prevent refresh loops
window.addEventListener('error', (event) => {
    console.error('❌ Global error caught:', event.error);
    // Prevent default error handling that might cause refresh
    event.preventDefault();
    return false;
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    // Prevent default error handling
    event.preventDefault();
});

// Start
let app;
document.addEventListener('DOMContentLoaded', () => { 
    try {
        console.log('🚀 DOM loaded, starting app...');
        app = new LeaveAssistantApp(); 
    } catch (error) {
        console.error('❌ Failed to start app:', error);
        // Show error message to user without causing refresh
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;';
        errorDiv.innerHTML = `
            <h2 style="color: #ef4444;">Application Error</h2>
            <p>Failed to initialize the Leave Assistant application.</p>
            <p style="font-size: 0.9rem; color: #666;">Error: ${error.message}</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
});