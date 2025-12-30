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
            
            // Check for stored session
            this.sessionToken = localStorage.getItem('sessionToken');
            
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
                    console.log('❌ Session invalid, showing login');
                    this.sessionToken = null;
                    localStorage.removeItem('sessionToken');
                    this.showPage('loginPage');
                }
            } else {
                console.log('🆕 No existing session, showing login');
                this.showPage('loginPage');
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
        
        try {
            const response = await fetch(this.getApiUrl('user/profile'), {
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
            
            const response = await fetch(url, { 
                method: 'GET',
                timeout: 5000 // 5 second timeout
            });
            
            if (response.ok) {
                console.log('✅ Server connection established');
                this.serverRunning = true;
            } else {
                console.warn('⚠️ Server responded with error:', response.status);
                this.serverRunning = false;
            }
        } catch (error) {
            console.warn('⚠️ Server check failed. Running in client-only mode.');
            console.warn('Error details:', error.message);
            this.serverRunning = false;
        }
    }

    bindEvents() {
        // Auth
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('subLogoutBtn').addEventListener('click', () => this.logout());

        // Navigation
        document.getElementById('showRegister').onclick = () => this.showPage('registerPage');
        document.getElementById('showLogin').onclick = () => this.showPage('loginPage');
        document.getElementById('federalTool').onclick = () => this.showTool('federalPage');
        document.getElementById('californiaTool').onclick = () => this.showTool('californiaPage');
        document.getElementById('backToDashboard1').onclick = () => this.showPage('dashboard');
        document.getElementById('backToDashboard2').onclick = () => this.showPage('dashboard');

        // Verification page
        document.getElementById('resendVerification').onclick = () => this.resendVerificationEmail();
        document.getElementById('backToLogin').onclick = () => this.showPage('loginPage');
        
        // Copy verification link functionality
        document.getElementById('copyVerificationLink').onclick = () => {
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
        };

        // Mode buttons for tools
        document.getElementById('federalEmailMode')?.addEventListener('click', () => this.setToolMode('federal', 'email'));
        document.getElementById('federalQuestionMode')?.addEventListener('click', () => this.setToolMode('federal', 'question'));
        document.getElementById('californiaEmailMode')?.addEventListener('click', () => this.setToolMode('california', 'email'));
        document.getElementById('californiaQuestionMode')?.addEventListener('click', () => this.setToolMode('california', 'question'));

        // Settings
        const toggleSettings = () => this.showSettings();
        document.getElementById('settingsBtn').onclick = toggleSettings;
        document.getElementById('settingsBtn2').onclick = toggleSettings;
        document.getElementById('settingsBtn3').onclick = toggleSettings;
        document.getElementById('closeSettings').onclick = () => this.hideSettings();
        document.getElementById('settingsForm').onsubmit = (e) => this.handleSettings(e);
        document.getElementById('aiProvider').onchange = (e) => this.toggleKeyFields(e.target.value);

        // Tool Logic
        document.getElementById('federalSubmit').onclick = () => this.handleAISubmit('federal');
        document.getElementById('californiaSubmit').onclick = () => this.handleAISubmit('california');
        document.getElementById('federalClear').onclick = () => this.clearOutput('federal');
        document.getElementById('californiaClear').onclick = () => this.clearOutput('california');

        // Admin
        document.getElementById('refreshUsers').onclick = () => this.loadAdminDashboard();
        document.getElementById('exportUsers').onclick = () => this.exportUsersCSV();
        document.getElementById('paymentSettingsForm').onsubmit = (e) => this.handlePaymentConfig(e);
        document.getElementById('bulkGrantBtn').onclick = () => this.showBulkGrantModal();
        document.getElementById('closeBulkGrant').onclick = () => document.getElementById('bulkGrantModal').classList.add('hidden');
        document.getElementById('bulkGrantForm').onsubmit = (e) => this.handleBulkGrant(e);
        document.getElementById('selectAllUsers').onchange = (e) => this.toggleSelectAll(e.target.checked);
        document.getElementById('adminSettingsBtn').onclick = () => this.showAdminProfile();
        document.getElementById('clearAllData').onclick = () => this.clearAllData();
        document.getElementById('userSearch').oninput = (e) => this.filterUsers();
        document.getElementById('userFilter').onchange = (e) => this.filterUsers();
        
        // Admin profile page
        document.getElementById('backToAdminDashboard').onclick = () => this.showPage('adminDashboard');
        document.getElementById('adminLogoutBtn2').onclick = () => this.logout();
        document.getElementById('adminProfileForm').onsubmit = (e) => this.handleAdminProfileUpdate(e);
        document.getElementById('cancelProfileChanges').onclick = () => this.showPage('adminDashboard');
        
        // System settings
        document.getElementById('allowRegistration').onchange = (e) => this.updateSystemSettings();
        document.getElementById('requireEmailVerification').onchange = (e) => this.updateSystemSettings();
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => this.switchAdminTab(e.target.dataset.tab);
        });

        // Payment
        document.getElementById('payStripe').onclick = () => this.handlePayment('stripe');
        document.getElementById('payPaypal').onclick = () => this.handlePayment('paypal');
        document.getElementById('continueToApp').onclick = () => this.checkSubscriptionAndRedirect();
        document.getElementById('retryPayment').onclick = () => this.showPage('subscriptionPage');
        document.getElementById('backToDashboardFromCancel').onclick = () => this.checkSubscriptionAndRedirect();
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
        const fee = this.paymentConfig.monthlyFee || 29.99;
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
        const input = document.getElementById(inputId).value.trim();
        
        if (!input) return this.showError('Please enter some text');
        
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
                federal: "You are a Federal FMLA HR Assistant. Provide compliant, neutral responses regarding Federal FMLA law only. Do not give legal advice.",
                california: "You are a California HR Assistant. Provide compliant responses regarding CFRA, PDL, and FMLA interaction. Order of analysis: FMLA -> CFRA -> PDL."
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
                    const fullPrompt = `${systemPrompts[toolName]}\n\nUser Query: ${input}\n\nPlease provide a helpful, compliant response:`;
                    
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
                            const fullPrompt = `${systemPrompts[toolName]}\n\nUser Query: ${input}\n\nPlease provide a helpful, compliant response:`;
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
                        prompt: input,
                        systemPrompt: systemPrompts[toolName]
                    };

                    // Add model-specific parameters
                    if (provider === 'openai') {
                        requestBody.messages = [
                            { role: 'system', content: systemPrompts[toolName] },
                            { role: 'user', content: input }
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

    getApiUrl(endpoint) {
        return `http://localhost:3001/api/${endpoint}`;
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
        
        // Show verification link if provided
        if (verificationLink) {
            const linkSection = document.getElementById('verificationLinkSection');
            const linkButton = document.getElementById('verificationLinkButton');
            const linkInput = document.getElementById('verificationLinkInput');
            
            if (linkSection && linkButton && linkInput) {
                linkSection.classList.remove('hidden');
                linkButton.href = verificationLink;
                linkInput.value = verificationLink;
            }
        }
        
        this.showSuccess(`Registration successful! Verification email sent to ${email}`);
    }

    resendVerificationEmail() {
        this.showSuccess('Verification email resent! Please check your inbox.');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();
        
        const email = document.getElementById('loginEmail').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(this.getApiUrl('auth/login'), {
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
            this.showError('Login failed. Please check your connection.');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Basic validation
        if (!email || !firstName || !lastName || !password) {
            this.hideLoading();
            return this.showError('All fields are required');
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

        try {
            const response = await fetch(this.getApiUrl('auth/register'), {
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
            this.showError('Registration failed. Please check your connection.');
        } finally {
            this.hideLoading();
        }
    }

    async verifyEmailToken(token) {
        try {
            const response = await fetch(this.getApiUrl('auth/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showSuccess('Email verified successfully! Please login.');
                this.showPage('loginPage');
            } else {
                this.showError(data.error || 'Verification failed');
            }
        } catch (error) {
            console.error('Verification error:', error);
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
        
        this.showPage('loginPage');
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
            // Load stats
            const statsResponse = await fetch(this.getApiUrl('admin/stats'), {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                const stats = statsData.stats;
                
                document.getElementById('totalUsers').textContent = stats.totalUsers;
                document.getElementById('verifiedUsers').textContent = stats.verifiedUsers;
                document.getElementById('activeSubscriptions').textContent = stats.activeSubscriptions;
                document.getElementById('trialUsers').textContent = stats.trialUsers;
            }
            
            // Load users
            await this.loadUsers();
            
            // Load pending verifications
            await this.loadPendingVerifications();
            
            // Load configuration
            await this.loadAdminConfig();
            
        } catch (error) {
            console.error('Admin dashboard load error:', error);
            this.showError('Failed to load admin dashboard');
        }
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
            const response = await fetch(this.getApiUrl('admin/pending'), {
                headers: { 'Authorization': `Bearer ${this.sessionToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayPendingVerifications(data.pending);
            }
        } catch (error) {
            console.error('Load pending verifications error:', error);
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
                
                // Populate form fields
                document.getElementById('adminMonthlyFee').value = config.monthlyFee || '29.99';
                
                // Show configuration status
                this.updateConfigStatus(config);
            }
        } catch (error) {
            console.error('Load admin config error:', error);
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
        if (pending.length === 0) {
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

    loadPendingVerifications() {
        const pendingDiv = document.getElementById('pendingList');
        if (this.pendingVerifications.length === 0) {
            pendingDiv.innerHTML = '<p class="text-muted">No pending verifications</p>';
            return;
        }
        
        pendingDiv.innerHTML = this.pendingVerifications.map(p => `
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
        document.getElementById('adminUserId').textContent = this.currentUser.id || '-';
        document.getElementById('adminCreatedDate').textContent = this.currentUser.createdAt ? 
            new Date(this.currentUser.createdAt).toLocaleDateString() : '-';
        
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
        
        this.loadUsers(searchTerm, filterType);
    }

    handlePaymentConfig(e) {
        e.preventDefault();
        this.paymentConfig = {
            monthlyFee: document.getElementById('adminMonthlyFee').value,
            paypalEmail: document.getElementById('adminPaypalEmail').value,
            stripeKey: document.getElementById('adminStripeKey').value,
            systemGeminiKey: document.getElementById('adminSystemGeminiKey').value,
            smtpHost: document.getElementById('adminSmtpHost').value,
            smtpPort: document.getElementById('adminSmtpPort').value,
            smtpUser: document.getElementById('adminSmtpUser').value,
            smtpPass: document.getElementById('adminSmtpPass').value
        };
        localStorage.setItem('paymentConfig', JSON.stringify(this.paymentConfig));
        
        // Update server email configuration if available
        this.updateServerEmailConfig();
        
        this.showSuccess('Payment and email settings saved');
    }

    async updateServerEmailConfig() {
        try {
            const endpoint = this.getApiUrl('admin/update-email-config');
            if (endpoint && this.serverRunning) {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        smtpHost: this.paymentConfig.smtpHost,
                        smtpPort: this.paymentConfig.smtpPort,
                        smtpUser: this.paymentConfig.smtpUser,
                        smtpPass: this.paymentConfig.smtpPass
                    })
                });
            }
        } catch (error) {
            console.warn('Failed to update server email config:', error);
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
        const selectedIds = Array.from(document.querySelectorAll('.user-select-cb:checked')).map(cb => cb.value);
        
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
            this.loadAdminDashboard();
            
            const durationText = duration === 'forever' ? 'permanent' : `${duration} month${duration > 1 ? 's' : ''}`;
            this.showSuccess(`${durationText} access granted to ${selectedIds.length} users!`);
            
        } catch (error) {
            console.error('Bulk grant error:', error);
            this.showError('Failed to grant access: ' + error.message);
        }
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${tab}Tab`).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`button[data-tab="${tab}"]`).classList.add('active');
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
        toast.innerHTML = message;
        toast.style.cssText = `position:fixed;top:20px;right:20px;padding:15px;background:${type==='error'?'#ef4444':'#10b981'};color:white;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    clearOutput(tool) {
        document.getElementById(`${tool}Output`).textContent = '';
        document.getElementById(`${tool}Input`).value = '';
    }
    
    switchAdminTab(tab) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${tab}Tab`).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`button[data-tab="${tab}"]`).classList.add('active');
    }
}

// Start
let app;
document.addEventListener('DOMContentLoaded', () => { 
    try {
        console.log('🚀 DOM loaded, starting app...');
        app = new LeaveAssistantApp(); 
    } catch (error) {
        console.error('❌ Failed to start app:', error);
        // Show error message to user
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
                <h2 style="color: #ef4444;">Application Error</h2>
                <p>Failed to initialize the Leave Assistant application.</p>
                <p style="font-size: 0.9rem; color: #666;">Error: ${error.message}</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Reload Page</button>
            </div>
        `;
    }
});