class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Pro Version)...');
            this.currentUser = null;
            this.users = [];
            this.pendingVerifications = [];
            this.idleTimer = null;
            this.idleTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
            this.currentVerificationToken = null;
            this.currentVerificationEmail = null;
            this.trialTimerInterval = null; // For countdown timer
            
            // 1. Load Data
            try {
                this.users = this.loadUsers();
                this.pendingVerifications = this.loadPendingVerificationsData();
                this.paymentConfig = this.loadPaymentConfig();
            } catch (error) {
                console.error('❌ Data Load Error:', error);
                this.users = [];
            }
            
            // 2. Allowed/Blocked Domains
            this.disposableDomains = [
                'mailinator.com', 'yopmail.com', 'tempmail.com', 'guerrillamail.com', 
                '10minutemail.com', 'throwawaymail.com', 'trashmail.com'
            ];
            
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
            this.checkServerStatus();
            
            // URL Token Check
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('verify')) {
                console.log('🔗 Email verification token detected');
                this.verifyEmailToken(urlParams.get('verify'));
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            // Session Check
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                console.log('👤 Existing user session found');
                this.currentUser = JSON.parse(currentUser);
                // Refresh user data
                const freshUser = this.users.find(u => u.id === this.currentUser.id);
                if (freshUser) {
                    this.currentUser = freshUser;
                    localStorage.setItem('currentUser', JSON.stringify(freshUser));
                }

                if (!this.currentUser.emailVerified) {
                    console.log('📧 User needs email verification');
                    this.showPage('verificationPage');
                } else {
                    console.log('✅ User verified, checking subscription');
                    this.checkSubscriptionAndRedirect();
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
        document.getElementById('autoVerifyBtn').onclick = () => this.autoVerifyCurrentToken();
        document.getElementById('copyVerificationLink').onclick = () => this.copyVerificationLink();
        document.getElementById('resendVerification').onclick = () => this.resendVerificationEmail();
        document.getElementById('backToLogin').onclick = () => this.showPage('loginPage');

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
        document.getElementById('adminSettingsBtn').onclick = () => this.showAdminSettings();
        document.getElementById('clearAllData').onclick = () => this.clearAllData();
        document.getElementById('userSearch').oninput = (e) => this.filterUsers();
        document.getElementById('userFilter').onchange = (e) => this.filterUsers();
        
        // System settings
        document.getElementById('allowRegistration').onchange = (e) => this.updateSystemSettings();
        document.getElementById('requireEmailVerification').onchange = (e) => this.updateSystemSettings();
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = (e) => this.switchAdminTab(e.target.dataset.tab);
        });

        // Payment
        document.getElementById('payPaypal').onclick = () => this.handlePayment('paypal');
        document.getElementById('payStripe').onclick = () => this.handlePayment('stripe');
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
        const fee = this.paymentConfig.monthlyFee || 29.99;
        this.showLoading();
        
        try {
            const endpoint = this.getApiUrl('subscribe');
            
            if (endpoint && this.serverRunning) {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.currentUser.id,
                        paymentMethod: method,
                        amount: fee
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.currentUser.subscriptionExpiry = data.expiryDate;
                    this.updateUserRecord(this.currentUser);
                    this.showSuccess('Payment Successful! Subscription activated.');
                    setTimeout(() => this.checkSubscriptionAndRedirect(), 1500);
                }
            } else {
                // In production without server, simulate payment for demo
                console.log(`💰 Simulating payment: User ${this.currentUser.id} via ${method} (${fee})`);
                
                // Grant 30 days subscription
                const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                this.currentUser.subscriptionExpiry = expiryDate;
                this.updateUserRecord(this.currentUser);
                
                this.showSuccess('Payment Successful! Subscription activated. (Demo Mode)');
                setTimeout(() => this.checkSubscriptionAndRedirect(), 1500);
            }
        } catch (error) {
            console.error('Payment Error', error);
            this.showError('Payment failed. Please check console.');
        } finally {
            this.hideLoading();
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
                            headers: { 'Content-Type': 'application/json' },
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

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Disposable Email Check
        const domain = email.split('@')[1];
        if (this.disposableDomains.includes(domain)) {
            this.hideLoading();
            return this.showError('❌ Registration Rejected: Disposable emails are not allowed.');
        }

        if (this.findUser(email)) {
            this.hideLoading();
            return this.showError('User exists');
        }

        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const newUser = {
            firstName, lastName, email, password,
            isAdmin: false, emailVerified: false,
            createdAt: Date.now(), aiProvider: 'puter'  // Default to Puter.js AI
        };

        this.pendingVerifications.push({ token, userData: newUser, createdAt: Date.now() });
        this.savePendingVerifications(this.pendingVerifications);

        // Store current token for verification
        this.currentVerificationToken = token;
        this.currentVerificationEmail = email;

        // Create verification link
        const verificationLink = `${window.location.origin}${window.location.pathname}?verify=${token}`;

        // Send verification email (simulated)
        try {
            const endpoint = this.getApiUrl('send-verification');
            
            if (endpoint && this.serverRunning) {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        firstName: firstName,
                        token: token,
                        verificationLink: verificationLink
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log(`📨 Verification email sent to: ${email}`);
                    console.log(`🔗 Verification link: ${verificationLink}`);
                }
            } else {
                // In production or when server is not available, just log
                console.log(`📨 Verification email would be sent to: ${email}`);
                console.log(`🔗 Verification link: ${verificationLink}`);
            }
        } catch (error) {
            console.error('Email sending error:', error);
            // Don't fail registration if email sending fails
        }

        // Show verification page with link
        this.showVerificationPage(verificationLink, email);
        this.hideLoading();
    }

    showVerificationPage(verificationLink, email) {
        // Show the verification page
        this.showPage('verificationPage');
        
        // Display the verification link in demo mode
        document.getElementById('verificationLinkDisplay').value = verificationLink;
        document.getElementById('demoVerificationSection').classList.remove('hidden');
        document.getElementById('autoVerifyBtn').classList.remove('hidden');
        
        // Update the email message
        const emailMessage = document.querySelector('#verificationPage p');
        if (emailMessage) {
            emailMessage.textContent = `We've sent a verification link to ${email}.`;
        }
        
        this.showSuccess(`Registration successful! Verification link created for ${email}`);
    }

    autoVerifyCurrentToken() {
        if (this.currentVerificationToken) {
            this.verifyEmailToken(this.currentVerificationToken);
        } else {
            this.showError('No verification token available');
        }
    }

    copyVerificationLink() {
        const linkInput = document.getElementById('verificationLinkDisplay');
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            this.showSuccess('Verification link copied to clipboard!');
        } catch (err) {
            // Fallback for modern browsers
            navigator.clipboard.writeText(linkInput.value).then(() => {
                this.showSuccess('Verification link copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy link. Please copy manually.');
            });
        }
    }

    resendVerificationEmail() {
        if (this.currentVerificationEmail && this.currentVerificationToken) {
            const verificationLink = `${window.location.origin}${window.location.pathname}?verify=${this.currentVerificationToken}`;
            
            // Simulate resending
            console.log(`📨 Resending verification email to: ${this.currentVerificationEmail}`);
            console.log(`🔗 Verification link: ${verificationLink}`);
            
            // Update the displayed link
            document.getElementById('verificationLinkDisplay').value = verificationLink;
            
            this.showSuccess('Verification email resent! Check the link above.');
        } else {
            this.showError('No verification email to resend. Please register again.');
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        const user = this.findUser(email);
        
        if (user && user.password === password) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.resetIdleTimer(); // Start idle timer on login
            this.checkSubscriptionAndRedirect();
        } else {
            this.showError('Invalid credentials');
        }
    }

    verifyEmailToken(token) {
        const idx = this.pendingVerifications.findIndex(p => p.token === token);
        if (idx === -1) return this.showError('Invalid token');

        const pending = this.pendingVerifications[idx];
        const user = pending.userData;
        user.emailVerified = true;
        user.id = Date.now().toString();

        this.users.push(user);
        this.saveUsers(this.users);
        
        this.pendingVerifications.splice(idx, 1);
        this.savePendingVerifications(this.pendingVerifications);

        this.showSuccess('Email verified! Please login.');
        this.showPage('loginPage');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.clearIdleTimer();
        
        // Clear trial timer
        if (this.trialTimerInterval) {
            clearInterval(this.trialTimerInterval);
            this.trialTimerInterval = null;
        }
        
        this.showPage('loginPage');
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
    loadAdminDashboard() {
        const nonAdmins = this.users.filter(u => !u.isAdmin);
        const verifiedUsers = nonAdmins.filter(u => u.emailVerified);
        const activeUsers = nonAdmins.filter(u => this.getSubscriptionStatus(u).active);
        const trialUsers = nonAdmins.filter(u => this.getSubscriptionStatus(u).type === 'trial');
        const subscribedUsers = nonAdmins.filter(u => this.getSubscriptionStatus(u).type === 'subscription');
        
        // Update stats
        document.getElementById('totalUsers').textContent = nonAdmins.length;
        document.getElementById('verifiedUsers').textContent = verifiedUsers.length;
        document.getElementById('activeSubscriptions').textContent = subscribedUsers.length;
        document.getElementById('trialUsers').textContent = trialUsers.length;
        
        // Populate User Table
        this.populateUserTable(nonAdmins);
        
        // Load pending verifications
        this.loadPendingVerifications();
        
        // Load settings inputs
        if (this.paymentConfig) {
            document.getElementById('adminMonthlyFee').value = this.paymentConfig.monthlyFee || '29.99';
            document.getElementById('adminPaypalEmail').value = this.paymentConfig.paypalEmail || '';
            document.getElementById('adminStripeKey').value = this.paymentConfig.stripeKey || '';
            document.getElementById('adminSystemGeminiKey').value = this.paymentConfig.systemGeminiKey || '';
            document.getElementById('adminSmtpHost').value = this.paymentConfig.smtpHost || '';
            document.getElementById('adminSmtpPort').value = this.paymentConfig.smtpPort || '587';
            document.getElementById('adminSmtpUser').value = this.paymentConfig.smtpUser || '';
            document.getElementById('adminSmtpPass').value = this.paymentConfig.smtpPass || '';
        }
        
        // Load system settings
        this.loadSystemSettings();
        
        // Update storage usage
        this.updateStorageUsage();
    }

    populateUserTable(users) {
        const tbody = document.getElementById('usersListTableBody');
        tbody.innerHTML = users.map(u => {
            const status = this.getSubscriptionStatus(u);
            const statusIcon = u.emailVerified ? '✅' : '❌';
            const statusText = status.active ? (status.type === 'trial' ? '🆓 Trial' : '💎 Premium') : '⏰ Expired';
            const expiryText = status.expiry ? new Date(status.expiry).toLocaleDateString() : 'N/A';
            
            return `
                <tr data-user-id="${u.id}">
                    <td><input type="checkbox" class="user-select-cb" value="${u.id}"></td>
                    <td>
                        <strong>${u.firstName} ${u.lastName}</strong><br>
                        <small>${u.email}</small><br>
                        <small class="text-muted">Joined: ${new Date(u.createdAt).toLocaleDateString()}</small>
                    </td>
                    <td>${statusIcon} ${u.emailVerified ? 'Verified' : 'Pending'}</td>
                    <td>
                        ${statusText}<br>
                        <small>Expires: ${expiryText}</small>
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary" onclick="app.editUser('${u.id}')">
                                <i class="fa-solid fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-success" onclick="app.grantAccess('${u.id}')">
                                <i class="fa-solid fa-key"></i> Grant
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="app.resetPassword('${u.id}')">
                                <i class="fa-solid fa-lock"></i> Reset
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteUser('${u.id}')">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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

    // Individual User Actions
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return this.showError('User not found');
        
        const newFirstName = prompt('First Name:', user.firstName);
        const newLastName = prompt('Last Name:', user.lastName);
        const newEmail = prompt('Email:', user.email);
        
        if (newFirstName && newLastName && newEmail) {
            user.firstName = newFirstName;
            user.lastName = newLastName;
            user.email = newEmail.toLowerCase();
            
            this.saveUsers(this.users);
            this.loadAdminDashboard();
            this.showSuccess('User updated successfully');
        }
    }

    grantAccess(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return this.showError('User not found');
        
        const duration = prompt('Grant access for how many months? (Enter "forever" for permanent access)', '1');
        if (!duration) return;
        
        const expiryDate = new Date();
        if (duration.toLowerCase() === 'forever') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else {
            const months = parseInt(duration);
            if (isNaN(months) || months <= 0) {
                return this.showError('Invalid duration. Please enter a number or "forever"');
            }
            expiryDate.setMonth(expiryDate.getMonth() + months);
        }
        
        user.subscriptionExpiry = expiryDate.toISOString();
        this.saveUsers(this.users);
        this.loadAdminDashboard();
        this.showSuccess(`Access granted to ${user.firstName} ${user.lastName} until ${expiryDate.toLocaleDateString()}`);
    }

    resetPassword(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return this.showError('User not found');
        
        const newPassword = prompt('Enter new password for ' + user.firstName + ' ' + user.lastName + ':', 'TempPass123!');
        if (!newPassword) return;
        
        user.password = newPassword;
        this.saveUsers(this.users);
        
        alert(`Password reset for ${user.firstName} ${user.lastName}\nNew password: ${newPassword}\nUser should change this immediately.`);
        this.showSuccess('Password reset successfully');
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return this.showError('User not found');
        
        if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            this.users = this.users.filter(u => u.id !== userId);
            this.saveUsers(this.users);
            this.loadAdminDashboard();
            this.showSuccess('User deleted successfully');
        }
    }

    // Pending Verification Actions
    approveVerification(token) {
        const idx = this.pendingVerifications.findIndex(p => p.token === token);
        if (idx === -1) return this.showError('Verification not found');

        const pending = this.pendingVerifications[idx];
        const user = pending.userData;
        user.emailVerified = true;
        user.id = Date.now().toString();

        this.users.push(user);
        this.saveUsers(this.users);
        
        this.pendingVerifications.splice(idx, 1);
        this.savePendingVerifications(this.pendingVerifications);

        this.loadAdminDashboard();
        this.showSuccess(`${user.firstName} ${user.lastName} approved and activated`);
    }

    rejectVerification(token) {
        const idx = this.pendingVerifications.findIndex(p => p.token === token);
        if (idx === -1) return this.showError('Verification not found');

        const pending = this.pendingVerifications[idx];
        
        if (confirm(`Are you sure you want to reject ${pending.userData.firstName} ${pending.userData.lastName}?`)) {
            this.pendingVerifications.splice(idx, 1);
            this.savePendingVerifications(this.pendingVerifications);
            this.loadAdminDashboard();
            this.showSuccess('Verification rejected');
        }
    }

    // Admin Settings
    showAdminSettings() {
        const currentAdmin = this.currentUser;
        const newFirstName = prompt('First Name:', currentAdmin.firstName);
        const newLastName = prompt('Last Name:', currentAdmin.lastName);
        const newEmail = prompt('Email:', currentAdmin.email);
        const newPassword = prompt('New Password (leave blank to keep current):', '');
        
        if (newFirstName && newLastName && newEmail) {
            currentAdmin.firstName = newFirstName;
            currentAdmin.lastName = newLastName;
            currentAdmin.email = newEmail.toLowerCase();
            
            if (newPassword) {
                currentAdmin.password = newPassword;
            }
            
            this.updateUserRecord(currentAdmin);
            this.showSuccess('Admin profile updated successfully');
        }
    }

    // System Management
    clearAllData() {
        if (confirm('⚠️ WARNING: This will delete ALL user data, settings, and reset the system. This action cannot be undone!\n\nType "DELETE ALL DATA" to confirm:')) {
            const confirmation = prompt('Type "DELETE ALL DATA" to confirm:');
            if (confirmation === 'DELETE ALL DATA') {
                localStorage.clear();
                alert('All data has been cleared. The page will reload.');
                window.location.reload();
            } else {
                this.showError('Confirmation text did not match. Data not cleared.');
            }
        }
    }

    updateSystemSettings() {
        const settings = {
            allowRegistration: document.getElementById('allowRegistration').checked,
            requireEmailVerification: document.getElementById('requireEmailVerification').checked
        };
        
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        this.showSuccess('System settings updated');
    }

    loadSystemSettingsData() {
        const settings = localStorage.getItem('systemSettings');
        return settings ? JSON.parse(settings) : {
            allowRegistration: true,
            requireEmailVerification: true
        };
    }

    // User Filtering
    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const filterType = document.getElementById('userFilter').value;
        
        const nonAdmins = this.users.filter(u => !u.isAdmin);
        let filteredUsers = nonAdmins;
        
        // Apply search filter
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(u => 
                u.firstName.toLowerCase().includes(searchTerm) ||
                u.lastName.toLowerCase().includes(searchTerm) ||
                u.email.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter
        if (filterType !== 'all') {
            filteredUsers = filteredUsers.filter(u => {
                const status = this.getSubscriptionStatus(u);
                switch (filterType) {
                    case 'verified':
                        return u.emailVerified;
                    case 'active':
                        return status.active;
                    case 'expired':
                        return !status.active;
                    default:
                        return true;
                }
            });
        }
        
        this.populateUserTable(filteredUsers);
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
        const nonAdmins = this.users.filter(u => !u.isAdmin);
        const csvData = [
            ['Name', 'Email', 'Verified', 'Status', 'Created', 'Subscription Expiry']
        ];
        
        nonAdmins.forEach(u => {
            const status = this.getSubscriptionStatus(u);
            const statusText = status.type === 'trial' ? 'Trial' : (status.type === 'subscription' ? 'Premium' : 'Expired');
            csvData.push([
                `${u.firstName} ${u.lastName}`,
                u.email,
                u.emailVerified ? 'Yes' : 'No',
                statusText,
                new Date(u.createdAt).toLocaleDateString(),
                u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'N/A'
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
        
        this.showSuccess('Users exported to CSV');
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