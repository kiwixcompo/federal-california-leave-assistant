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
            // Fallback to login
            setTimeout(() => this.showPage('loginPage'), 100);
        }
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
        await this.checkServerStatus();
        
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
            // Refresh user data from main array to get latest subscription status
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
            const response = await fetch('http://localhost:3001/api/health', { 
                method: 'GET',
                timeout: 3000 
            });
            if (response.ok) {
                console.log('✅ Server is running on port 3001');
                this.serverRunning = true;
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            console.warn('⚠️ Server not running on port 3001. API calls will fail.');
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
        document.getElementById('backToDashboard1').onclick = () => this.showDashboard();
        document.getElementById('backToDashboard2').onclick = () => this.showDashboard();

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
        
        // Update UI
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
        
        // 1. Check if Admin Granted/Paid Subscription is active
        if (user.subscriptionExpiry && new Date(user.subscriptionExpiry).getTime() > now) {
            return { active: true, type: 'subscription', expiry: user.subscriptionExpiry };
        }

        // 2. Check 24-Hour Free Trial
        const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
        const trialEnd = created + trialDuration;
        
        if (now < trialEnd) {
            return { active: true, type: 'trial', expiry: trialEnd };
        }

        // 3. Expired
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
            timerEl.style.background = '#10b981'; // Green
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
        
        // Simulate Processing
        this.showLoading();
        
        try {
            // Mock API call
            const response = await fetch('/api/subscribe', {
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
                // Update User
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
        document.getElementById('openaiKeySection').classList.toggle('hidden', provider !== 'openai');
        document.getElementById('geminiKeySection').classList.toggle('hidden', provider !== 'gemini');
    }

    async handleAISubmit(toolName) {
        const inputId = `${toolName}Input`;
        const outputId = `${toolName}Output`;
        const input = document.getElementById(inputId).value.trim();
        
        if (!input) return this.showError('Please enter some text');
        
        this.showLoading();
        
        try {
            // Auto-detect API provider based on key format
            let provider = this.currentUser.aiProvider || 'openai';
            let apiKey = '';
            
            // Check for API keys and auto-detect provider
            const openaiKey = this.currentUser.openaiApiKey;
            const geminiKey = this.currentUser.geminiApiKey || this.paymentConfig.systemGeminiKey;
            
            if (openaiKey && openaiKey.startsWith('sk-')) {
                provider = 'openai';
                apiKey = openaiKey;
            } else if (geminiKey && geminiKey.startsWith('AIza')) {
                provider = 'gemini';
                apiKey = geminiKey;
            } else if (provider === 'demo') {
                // Keep demo mode
            } else {
                throw new Error('No valid API key found. Please add an OpenAI (sk-...) or Gemini (AIza...) key in Settings.');
            }

            // Check server status for non-demo modes
            if (provider !== 'demo' && !this.serverRunning) {
                await this.checkServerStatus();
                if (!this.serverRunning) {
                    throw new Error('❌ Server Connection Required: Please start the server by running "node server.js" or double-clicking "start-server.bat" file.');
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
            } 
            else if (provider === 'gemini') {
                try {
                    const res = await fetch('http://localhost:3001/api/gemini', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: apiKey,
                            prompt: input,
                            systemPrompt: systemPrompts[toolName]
                        })
                    });
                    
                    // Handle both JSON and HTML error responses
                    let data;
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await res.json();
                    } else {
                        // HTML error response (404, etc.)
                        const htmlText = await res.text();
                        throw new Error(`Server Error (${res.status}): Unable to connect to Gemini API endpoint. Please ensure the server is running on port 3001.`);
                    }
                    
                    if (!res.ok || data.error) {
                        throw new Error(data.error?.message || data.error || `API Error: ${res.status}`);
                    }
                    
                    // Gemini response parsing
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        responseText = data.candidates[0].content.parts[0].text;
                    } else if (data.error) {
                        // Handle specific Gemini API errors
                        if (data.error.message.includes('API key not valid') || data.error.message.includes('API_KEY_INVALID')) {
                            throw new Error('Invalid Gemini API key. Please check your API key in Settings.');
                        } else if (data.error.message.includes('quota') || data.error.message.includes('QUOTA_EXCEEDED')) {
                            throw new Error('Gemini API quota exceeded. Please try again later or check your billing.');
                        } else if (data.error.message.includes('not found') || data.error.message.includes('models')) {
                            throw new Error('Gemini model not available. The service is trying different models automatically.');
                        } else {
                            throw new Error(`Gemini API Error: ${data.error.message || data.error}`);
                        }
                    } else {
                        throw new Error('Invalid response format from Gemini API - no content received');
                    }
                } catch (fetchError) {
                    if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
                        throw new Error('❌ Connection Error: Cannot connect to server on port 3001. Please ensure the server is running by executing "node server.js" or using the start-server.bat file.');
                    }
                    throw fetchError;
                }
            } 
            else {
                // OpenAI (Default)
                try {
                    const res = await fetch('http://localhost:3001/api/openai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: apiKey,
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: systemPrompts[toolName] },
                                { role: 'user', content: input }
                            ]
                        })
                    });

                    // Handle both JSON and HTML error responses
                    let data;
                    const contentType = res.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        data = await res.json();
                    } else {
                        const htmlText = await res.text();
                        throw new Error(`Server Error (${res.status}): Unable to connect to OpenAI API endpoint. Please ensure the server is running on port 3001.`);
                    }

                    if (!res.ok || data.error) {
                        throw new Error(data.error?.message || data.error || `API Error: ${res.status}`);
                    }
                    
                    responseText = data.choices?.[0]?.message?.content || 'No response received';
                } catch (fetchError) {
                    if (fetchError.message.includes('Failed to fetch') || fetchError.name === 'TypeError') {
                        throw new Error('❌ Connection Error: Cannot connect to server on port 3001. Please ensure the server is running by executing "node server.js" or using the start-server.bat file.');
                    }
                    throw fetchError;
                }
            }

            document.getElementById(outputId).textContent = responseText;
            this.showSuccess('Response Generated!');

        } catch (error) {
            console.error('AI Submit Error:', error);
            this.showError(`❌ ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // ==========================================
    // AUTHENTICATION LOGIC
    // ==========================================

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value;

        // 1. Check Disposable Email
        const domain = email.split('@')[1];
        if (this.disposableDomains.includes(domain)) {
            this.hideLoading();
            return this.showError('❌ Registration Rejected: Disposable email addresses are not accepted. Please use a valid work or personal email.');
        }

        if (this.findUser(email)) {
            this.hideLoading();
            return this.showError('User already exists');
        }

        // 2. Create Pending Verification
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const newUser = {
            firstName, lastName, email, password,
            isAdmin: false,
            emailVerified: false,
            createdAt: Date.now(), // Important for Trial
            aiProvider: 'openai'
        };

        this.pendingVerifications.push({ token, userData: newUser, createdAt: Date.now() });
        this.savePendingVerifications(this.pendingVerifications);

        // Simulate Email Send
        console.log(`📨 Verification Link: ${window.location.origin}?verify=${token}`);
        
        setTimeout(() => {
            alert('DEMO: Verification email sent.\n\nCheck console for link, or click OK to auto-verify in 2 seconds.');
            setTimeout(() => this.verifyEmailToken(token), 2000);
            this.showPage('verificationPage');
            this.hideLoading();
        }, 500);
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

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    loadAdminDashboard() {
        // Stats
        const nonAdmins = this.users.filter(u => !u.isAdmin);
        document.getElementById('totalUsers').textContent = nonAdmins.length;
        document.getElementById('verifiedUsers').textContent = nonAdmins.filter(u => u.emailVerified).length;
        
        let activeCount = 0;
        let trialCount = 0;
        
        nonAdmins.forEach(u => {
            const status = this.getSubscriptionStatus(u);
            if (status.type === 'subscription') activeCount++;
            if (status.type === 'trial') trialCount++;
        });
        
        document.getElementById('activeSubscriptions').textContent = activeCount;
        document.getElementById('trialUsers').textContent = trialCount;

        // Populate Table
        const tbody = document.getElementById('usersListTableBody');
        tbody.innerHTML = nonAdmins.map(u => {
            const status = this.getSubscriptionStatus(u);
            let badgeClass = status.active ? 'badge-success' : 'badge-danger';
            let statusText = status.type === 'trial' ? 'Trial' : (status.type === 'subscription' ? 'Premium' : 'Expired');
            
            return `
            <tr>
                <td><input type="checkbox" class="user-select-cb" value="${u.id}"></td>
                <td>
                    <div class="user-cell">
                        <strong>${u.firstName} ${u.lastName}</strong><br>
                        <small>${u.email}</small>
                    </div>
                </td>
                <td>${u.emailVerified ? '✅ Verified' : '❌ Pending'}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="app.resetUserPassword('${u.id}')">Reset Pass</button>
                </td>
            </tr>`;
        }).join('');

        // Load Configs
        document.getElementById('adminMonthlyFee').value = this.paymentConfig.monthlyFee || 29.99;
        document.getElementById('adminPaypalEmail').value = this.paymentConfig.paypalEmail || '';
        document.getElementById('adminStripeKey').value = this.paymentConfig.stripeKey || '';
        document.getElementById('adminSystemGeminiKey').value = this.paymentConfig.systemGeminiKey || '';
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${tab}Tab`).classList.remove('hidden');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`button[data-tab="${tab}"]`).classList.add('active');
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
    toggleSelectAll(checked) {
        document.querySelectorAll('.user-select-cb').forEach(cb => cb.checked = checked);
    }

    showBulkGrantModal() {
        const selected = document.querySelectorAll('.user-select-cb:checked');
        if (selected.length === 0) return this.showError('No users selected');
        
        document.getElementById('bulkCount').textContent = selected.length;
        document.getElementById('bulkGrantModal').classList.remove('hidden');
    }

    handleBulkGrant(e) {
        e.preventDefault();
        const duration = document.getElementById('grantDuration').value;
        const selectedIds = Array.from(document.querySelectorAll('.user-select-cb:checked')).map(cb => cb.value);
        
        let expiryDate;
        if (duration === 'forever') {
            expiryDate = new Date('2099-12-31').toISOString();
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() + parseInt(duration));
            expiryDate = d.toISOString();
        }

        let updatedCount = 0;
        this.users = this.users.map(u => {
            if (selectedIds.includes(u.id)) {
                u.subscriptionExpiry = expiryDate;
                updatedCount++;
            }
            return u;
        });

        this.saveUsers(this.users);
        document.getElementById('bulkGrantModal').classList.add('hidden');
        this.loadAdminDashboard();
        this.showSuccess(`Granted access to ${updatedCount} users.`);
    }

    // ==========================================
    // UTILITIES
    // ==========================================

    findUser(email) { return this.users.find(u => u.email === email); }
    
    updateUserRecord(user) {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            this.users[idx] = user;
            this.saveUsers(this.users);
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    }

    handleSettings(e) {
        e.preventDefault();
        
        // Get form values
        const selectedProvider = document.getElementById('aiProvider').value;
        const openaiKey = document.getElementById('openaiApiKey').value.trim();
        const geminiKey = document.getElementById('geminiApiKey').value.trim();
        const newPass = document.getElementById('newPassword').value;

        // Validate API keys if provided
        if (openaiKey && !openaiKey.startsWith('sk-')) {
            return this.showError('Invalid OpenAI API key format. Must start with "sk-"');
        }
        if (geminiKey && !geminiKey.startsWith('AIza')) {
            return this.showError('Invalid Gemini API key format. Must start with "AIza"');
        }

        // Auto-detect provider based on available keys
        let finalProvider = selectedProvider;
        if (selectedProvider !== 'demo') {
            if (openaiKey && openaiKey.startsWith('sk-')) {
                finalProvider = 'openai';
            } else if (geminiKey && geminiKey.startsWith('AIza')) {
                finalProvider = 'gemini';
            } else if (this.paymentConfig.systemGeminiKey) {
                finalProvider = 'gemini'; // Use system key
            } else {
                finalProvider = 'demo'; // Fallback to demo
            }
        }

        // Update user settings
        this.currentUser.aiProvider = finalProvider;
        this.currentUser.openaiApiKey = openaiKey;
        this.currentUser.geminiApiKey = geminiKey;
        
        if (newPass) this.currentUser.password = newPass;

        this.updateUserRecord(this.currentUser);
        
        // Show success message with provider info
        let providerMsg = '';
        if (finalProvider === 'openai') providerMsg = ' (OpenAI Active)';
        else if (finalProvider === 'gemini') providerMsg = ' (Gemini Active)';
        else if (finalProvider === 'demo') providerMsg = ' (Demo Mode)';
        
        this.showSuccess(`Settings Saved${providerMsg}`);
        this.hideSettings();
    }

    loadUsers() { 
        const u = localStorage.getItem('users'); 
        return u ? JSON.parse(u) : [{ id: '1', email: 'talk2char@gmail.com', password: 'Password@123', isAdmin: true, firstName:'Super', lastName:'Admin', emailVerified: true }]; 
    }
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
        toast.style.cssText = `position:fixed;top:20px;right:20px;padding:15px;background:${type==='error'?'#ef4444':'#10b981'};color:white;border-radius:8px;z-index:9999;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    clearOutput(tool) {
        document.getElementById(`${tool}Output`).textContent = '';
        document.getElementById(`${tool}Input`).value = '';
    }

    // Debug function for testing API connections
    async testGeminiAPI(testKey = null) {
        const apiKey = testKey || this.currentUser?.geminiApiKey || this.paymentConfig?.systemGeminiKey;
        if (!apiKey) {
            console.error('❌ No Gemini API key available for testing');
            return;
        }

        console.log('🧪 Testing Gemini API connection...');
        try {
            const response = await fetch('http://localhost:3001/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: apiKey,
                    prompt: 'Hello, please respond with "API test successful"',
                    systemPrompt: 'You are a helpful assistant.'
                })
            });

            const data = await response.json();
            if (response.ok && data.candidates) {
                console.log('✅ Gemini API test successful:', data.candidates[0].content.parts[0].text);
            } else {
                console.error('❌ Gemini API test failed:', data);
            }
        } catch (error) {
            console.error('❌ Gemini API test error:', error);
        }
    }
}

// Start
let app;
document.addEventListener('DOMContentLoaded', () => { app = new LeaveAssistantApp(); });