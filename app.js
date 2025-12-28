class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Pro Version)...');
            this.currentUser = null;
            this.users = [];
            this.pendingVerifications = [];
            
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
        } catch (error) {
            console.error('❌ Critical Init Error:', error);
            setTimeout(() => this.showPage('loginPage'), 100);
        }
    }

    // ==========================================
    // API CONNECTION HELPER (The Fix)
    // ==========================================
    getApiUrl(endpoint) {
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
        // Hide pages
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        
        this.bindEvents();
        
        // Check server status
        this.checkServerStatus();
        
        // URL Token Check
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verify')) {
            this.verifyEmailToken(urlParams.get('verify'));
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Session Check
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            // Refresh user data
            const freshUser = this.users.find(u => u.id === this.currentUser.id);
            if (freshUser) {
                this.currentUser = freshUser;
                localStorage.setItem('currentUser', JSON.stringify(freshUser));
            }

            if (!this.currentUser.emailVerified) {
                this.showPage('verificationPage');
            } else {
                this.checkSubscriptionAndRedirect();
            }
        } else {
            this.showPage('loginPage');
        }
        
        this.hideLoading();
    }

    async checkServerStatus() {
        try {
            const url = this.getApiUrl('health');
            console.log(`📡 Connecting to backend at: ${url}`);
            
            const response = await fetch(url, { method: 'GET' });
            if (response.ok) {
                console.log('✅ Server connection established');
                this.serverRunning = true;
            }
        } catch (error) {
            console.warn('⚠️ Server check failed. Ensure "node server.js" is running.');
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
        document.getElementById('paymentSettingsForm').onsubmit = (e) => this.handlePaymentConfig(e);
        document.getElementById('bulkGrantBtn').onclick = () => this.showBulkGrantModal();
        document.getElementById('closeBulkGrant').onclick = () => document.getElementById('bulkGrantModal').classList.add('hidden');
        document.getElementById('bulkGrantForm').onsubmit = (e) => this.handleBulkGrant(e);
        document.getElementById('selectAllUsers').onchange = (e) => this.toggleSelectAll(e.target.checked);
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
            return;
        }

        const status = this.getSubscriptionStatus(this.currentUser);
        document.getElementById('userWelcomeName').textContent = this.currentUser.firstName;
        
        if (status.active) {
            this.showPage('dashboard');
            this.updateTrialTimer(status);
        } else {
            this.showPage('subscriptionPage');
            this.loadSubscriptionPricing();
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
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            timerEl.textContent = `Trial Active: ${hoursLeft}h remaining`;
            timerEl.classList.remove('hidden');
        } else if (status.type === 'subscription') {
            timerEl.textContent = 'Premium Active 👑';
            timerEl.classList.remove('hidden');
            timerEl.style.background = '#10b981';
        } else {
            timerEl.classList.add('hidden');
        }
    }

    showTool(pageId) {
        const status = this.getSubscriptionStatus(this.currentUser);
        if (!status.active) {
            this.showPage('subscriptionPage');
            this.loadSubscriptionPricing();
            return;
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
            const url = this.getApiUrl('subscribe');
            const response = await fetch(url, {
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
        document.getElementById('openaiKeySection').classList.add('hidden');
        document.getElementById('geminiKeySection').classList.add('hidden');
        document.getElementById('huggingfaceKeySection').classList.add('hidden');
        document.getElementById('cohereKeySection').classList.add('hidden');
        document.getElementById('anthropicKeySection').classList.add('hidden');
        
        // Show the relevant section
        if (provider === 'openai') {
            document.getElementById('openaiKeySection').classList.remove('hidden');
        } else if (provider === 'gemini') {
            document.getElementById('geminiKeySection').classList.remove('hidden');
        } else if (provider === 'huggingface') {
            document.getElementById('huggingfaceKeySection').classList.remove('hidden');
        } else if (provider === 'cohere') {
            document.getElementById('cohereKeySection').classList.remove('hidden');
        } else if (provider === 'anthropic') {
            document.getElementById('anthropicKeySection').classList.remove('hidden');
        }
    }

    async handleAISubmit(toolName) {
        const inputId = `${toolName}Input`;
        const outputId = `${toolName}Output`;
        const input = document.getElementById(inputId).value.trim();
        
        if (!input) return this.showError('Please enter some text');
        
        this.showLoading();
        
        try {
            // Auto-detect API provider based on available keys
            let provider = this.currentUser.aiProvider || 'openai';
            let apiKey = '';
            
            // Check for API keys and auto-detect provider
            const keys = {
                openai: this.currentUser.openaiApiKey,
                gemini: this.currentUser.geminiApiKey || this.paymentConfig.systemGeminiKey,
                huggingface: this.currentUser.huggingfaceApiKey,
                cohere: this.currentUser.cohereApiKey,
                anthropic: this.currentUser.anthropicApiKey
            };
            
            // Auto-detect based on key format and availability
            if (keys.openai && keys.openai.startsWith('sk-')) {
                provider = 'openai';
                apiKey = keys.openai;
            } else if (keys.gemini && keys.gemini.startsWith('AIza')) {
                provider = 'gemini';
                apiKey = keys.gemini;
            } else if (keys.huggingface && keys.huggingface.startsWith('hf_')) {
                provider = 'huggingface';
                apiKey = keys.huggingface;
            } else if (keys.cohere && keys.cohere.length > 10) {
                provider = 'cohere';
                apiKey = keys.cohere;
            } else if (keys.anthropic && keys.anthropic.startsWith('sk-ant-')) {
                provider = 'anthropic';
                apiKey = keys.anthropic;
            } else if (provider === 'demo') {
                // Keep demo mode
            } else {
                throw new Error('No valid API key found. Please add an API key for any supported provider in Settings.');
            }

            // Check server status for non-demo modes
            if (provider !== 'demo' && !this.serverRunning) {
                await this.checkServerStatus();
                if (!this.serverRunning) {
                    throw new Error('❌ Server Connection Required: Please start the server by running "node server.js"');
                }
            }

            let responseText = '';
            const systemPrompts = {
                federal: "You are a Federal FMLA HR Assistant. Provide compliant, neutral responses regarding Federal FMLA law only. Do not give legal advice.",
                california: "You are a California HR Assistant. Provide compliant responses regarding CFRA, PDL, and FMLA interaction. Order of analysis: FMLA -> CFRA -> PDL."
            };

            if (provider === 'demo') {
                await new Promise(r => setTimeout(r, 1000));
                responseText = "DEMO RESPONSE: This is a simulated response. Please configure an AI provider in settings for real results.";
            } else {
                // Call the appropriate API endpoint
                const endpoint = this.getApiUrl(provider);
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
                        // OpenAI, Hugging Face, Cohere, Anthropic use standardized format
                        responseText = data.choices?.[0]?.message?.content || 'No response received';
                    }

                } catch (fetchError) {
                    if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
                        throw new Error(`❌ Connection Error: Cannot connect to ${provider} API. Please ensure the server is running.`);
                    }
                    throw fetchError;
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

    findUser(email) { return this.users.find(u => u.email === email); }
    
    updateUserRecord(user) {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = user;
            this.saveUsers(this.users);
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        
        // Disposable Email Check
        const domain = email.split('@')[1];
        if (this.disposableDomains.includes(domain)) {
            return this.showError('❌ Registration Rejected: Disposable emails are not allowed.');
        }

        // Standard Register Logic...
        const password = document.getElementById('registerPassword').value;
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;

        if (this.findUser(email)) return this.showError('User exists');

        const token = Math.random().toString(36).substring(7);
        const newUser = {
            firstName, lastName, email, password,
            isAdmin: false, emailVerified: false,
            createdAt: Date.now(), aiProvider: 'openai'
        };

        this.pendingVerifications.push({ token, userData: newUser, createdAt: Date.now() });
        this.savePendingVerifications(this.pendingVerifications);

        console.log('Verify Link:', `?verify=${token}`);
        this.showPage('verificationPage');
        
        // Auto verify for demo
        setTimeout(() => {
            if (confirm('DEMO: Click OK to auto-verify email')) {
                this.verifyEmailToken(token);
            }
        }, 1000);
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        const user = this.findUser(email);
        
        if (user && user.password === password) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
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
        this.showPage('loginPage');
    }

    handleSettings(e) {
        e.preventDefault();
        
        // Get all API keys
        this.currentUser.aiProvider = document.getElementById('aiProvider').value;
        this.currentUser.openaiApiKey = document.getElementById('openaiApiKey').value;
        this.currentUser.geminiApiKey = document.getElementById('geminiApiKey').value;
        this.currentUser.huggingfaceApiKey = document.getElementById('huggingfaceApiKey').value;
        this.currentUser.cohereApiKey = document.getElementById('cohereApiKey').value;
        this.currentUser.anthropicApiKey = document.getElementById('anthropicApiKey').value;
        
        const newPass = document.getElementById('newPassword').value;
        if (newPass) this.currentUser.password = newPass;

        this.updateUserRecord(this.currentUser);
        
        // Show which provider is active
        const provider = this.currentUser.aiProvider;
        let providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        if (provider === 'huggingface') providerName = 'Hugging Face';
        
        this.showSuccess(`Settings Saved (${providerName} Active)`);
        this.hideSettings();
    }

    // Admin
    loadAdminDashboard() {
        const nonAdmins = this.users.filter(u => !u.isAdmin);
        document.getElementById('totalUsers').textContent = nonAdmins.length;
        document.getElementById('verifiedUsers').textContent = nonAdmins.filter(u => u.emailVerified).length;
        
        // Populate Table
        const tbody = document.getElementById('usersListTableBody');
        tbody.innerHTML = nonAdmins.map(u => `
            <tr>
                <td><input type="checkbox" class="user-select-cb" value="${u.id}"></td>
                <td><strong>${u.firstName} ${u.lastName}</strong><br><small>${u.email}</small></td>
                <td>${u.emailVerified ? '✅' : '❌'}</td>
                <td>${this.getSubscriptionStatus(u).type}</td>
                <td><button class="btn btn-sm btn-secondary">Edit</button></td>
            </tr>`).join('');
            
        // Load settings inputs
        if (this.paymentConfig) {
            document.getElementById('adminMonthlyFee').value = this.paymentConfig.monthlyFee || '';
            document.getElementById('adminSystemGeminiKey').value = this.paymentConfig.systemGeminiKey || '';
        }
    }

    handlePaymentConfig(e) {
        e.preventDefault();
        this.paymentConfig = {
            monthlyFee: document.getElementById('adminMonthlyFee').value,
            paypalEmail: document.getElementById('adminPaypalEmail').value,
            stripeKey: document.getElementById('adminStripeKey').value,
            systemGeminiKey: document.getElementById('adminSystemGeminiKey').value
        };
        localStorage.setItem('paymentConfig', JSON.stringify(this.paymentConfig));
        this.showSuccess('Payment settings saved');
    }

    // Bulk Actions
    toggleSelectAll(checked) { document.querySelectorAll('.user-select-cb').forEach(cb => cb.checked = checked); }
    showBulkGrantModal() { document.getElementById('bulkGrantModal').classList.remove('hidden'); }
    handleBulkGrant(e) {
        e.preventDefault();
        const duration = document.getElementById('grantDuration').value;
        const selectedIds = Array.from(document.querySelectorAll('.user-select-cb:checked')).map(cb => cb.value);
        
        const d = new Date();
        d.setMonth(d.getMonth() + (duration === 'forever' ? 1200 : parseInt(duration)));
        
        this.users.forEach(u => {
            if (selectedIds.includes(u.id)) u.subscriptionExpiry = d.toISOString();
        });
        
        this.saveUsers(this.users);
        document.getElementById('bulkGrantModal').classList.add('hidden');
        this.loadAdminDashboard();
        this.showSuccess('Access Granted!');
    }

    // Data Loaders
    loadUsers() { const u = localStorage.getItem('users'); return u ? JSON.parse(u) : [{ id: '1', email: 'talk2char@gmail.com', password: 'Password@123', isAdmin: true, firstName:'Super', lastName:'Admin', emailVerified: true }]; }
    saveUsers(u) { localStorage.setItem('users', JSON.stringify(u)); }
    loadPendingVerificationsData() { const p = localStorage.getItem('pendingVerifications'); return p ? JSON.parse(p) : []; }
    savePendingVerifications(p) { localStorage.setItem('pendingVerifications', JSON.stringify(p)); }
    loadPaymentConfig() { const c = localStorage.getItem('paymentConfig'); return c ? JSON.parse(c) : {}; }

    // UI Helpers
    showPage(id) { document.querySelectorAll('.page').forEach(p => p.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
    showSettings() { 
        // Populate current values
        document.getElementById('aiProvider').value = this.currentUser.aiProvider || 'openai';
        document.getElementById('openaiApiKey').value = this.currentUser.openaiApiKey || '';
        document.getElementById('geminiApiKey').value = this.currentUser.geminiApiKey || '';
        document.getElementById('huggingfaceApiKey').value = this.currentUser.huggingfaceApiKey || '';
        document.getElementById('cohereApiKey').value = this.currentUser.cohereApiKey || '';
        document.getElementById('anthropicApiKey').value = this.currentUser.anthropicApiKey || '';
        document.getElementById('newPassword').value = '';
        
        // Show/hide appropriate sections
        this.toggleKeyFields(this.currentUser.aiProvider || 'openai');
        
        document.getElementById('settingsModal').classList.remove('hidden'); 
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
document.addEventListener('DOMContentLoaded', () => { app = new LeaveAssistantApp(); });