class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Standalone Mode)...');
            this.currentUser = null;
            this.users = this.loadUsers();
            
            this.init();
        } catch (error) {
            console.error('❌ Constructor error:', error);
            // Try to continue with basic functionality
            this.currentUser = null;
            this.users = [];
            this.showPage('loginPage');
        }
    }

    async init() {
        console.log('📱 App initialization started');
        
        // Hide all pages initially
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
            page.style.display = 'none';
        });
        
        this.bindEvents();
        
        // Check for existing session
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            console.log('🔑 Found existing session:', this.currentUser.email);
            console.log('🔑 User API key:', this.currentUser.openaiApiKey);
            this.showDashboard();
        } else {
            console.log('👤 No session found, showing login page');
            this.showPage('loginPage');
        }
        
        this.hideLoading();
        console.log('✅ App initialization complete');
    }

    bindEvents() {
        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        
        // Navigation
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('registerPage');
        });
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('loginPage');
        });
        
        // Logout buttons
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        
        // Tool selection
        document.getElementById('federalTool').addEventListener('click', () => this.showPage('federalPage'));
        document.getElementById('californiaTool').addEventListener('click', () => this.showPage('californiaPage'));
        
        // Back to dashboard
        document.getElementById('backToDashboard1').addEventListener('click', () => this.showDashboard());
        document.getElementById('backToDashboard2').addEventListener('click', () => this.showDashboard());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());
        document.getElementById('settingsBtn2').addEventListener('click', () => this.showSettings());
        document.getElementById('settingsBtn3').addEventListener('click', () => this.showSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.hideSettings());
        document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSettings(e));
        
        // Federal tool
        document.getElementById('federalEmailMode').addEventListener('click', () => this.setFederalMode('email'));
        document.getElementById('federalQuestionMode').addEventListener('click', () => this.setFederalMode('question'));
        document.getElementById('federalSubmit').addEventListener('click', () => this.handleFederalSubmit());
        document.getElementById('federalCopy').addEventListener('click', () => this.copyToClipboard('federalOutput'));
        document.getElementById('federalClear').addEventListener('click', () => this.clearOutput('federal'));
        
        // California tool
        document.getElementById('californiaEmailMode').addEventListener('click', () => this.setCaliforniaMode('email'));
        document.getElementById('californiaQuestionMode').addEventListener('click', () => this.setCaliforniaMode('question'));
        document.getElementById('californiaSubmit').addEventListener('click', () => this.handleCaliforniaSubmit());
        document.getElementById('californiaCopy').addEventListener('click', () => this.copyToClipboard('californiaOutput'));
        document.getElementById('californiaClear').addEventListener('click', () => this.clearOutput('california'));
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showPage(pageId) {
        console.log('🔄 Switching to page:', pageId);
        
        // Hide all pages first
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
            page.style.display = 'none';
        });
        
        // Show the target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.style.display = 'block';
            
            // Scroll to top
            window.scrollTo(0, 0);
        } else {
            console.error('❌ Page not found:', pageId);
        }
    }

    loadUsers() {
        const users = localStorage.getItem('users');
        if (users) {
            const parsedUsers = JSON.parse(users);
            
            // Migrate existing admin user to have demo API key
            const adminUser = parsedUsers.find(u => u.email === 'talk2char@gmail.com');
            if (adminUser && (!adminUser.openaiApiKey || adminUser.openaiApiKey === '')) {
                console.log('🔄 Migrating admin user to demo mode...');
                adminUser.openaiApiKey = 'demo';
                this.saveUsers(parsedUsers);
                
                // Update current session if it's the admin
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    const currentUserObj = JSON.parse(currentUser);
                    if (currentUserObj.email === 'talk2char@gmail.com') {
                        currentUserObj.openaiApiKey = 'demo';
                        localStorage.setItem('currentUser', JSON.stringify(currentUserObj));
                        console.log('🔄 Updated current session with demo API key');
                    }
                }
            }
            
            return parsedUsers;
        }
        
        // Default users including admin
        const defaultUsers = [
            {
                id: '1',
                firstName: 'Super',
                lastName: 'Admin',
                email: 'talk2char@gmail.com',
                password: 'Password@123',
                isAdmin: true,
                emailVerified: true,
                hasAccess: true,
                openaiApiKey: 'demo' // Default to demo mode
            }
        ];
        
        this.saveUsers(defaultUsers);
        return defaultUsers;
    }

    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    }

    findUser(email, password = null) {
        return this.users.find(user => {
            if (password) {
                return user.email === email && user.password === password;
            }
            return user.email === email;
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = this.findUser(email, password);
        
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('✅ Login successful, user data:', user);
            console.log('🔑 User API key:', user.openaiApiKey);
            this.showSuccess('Login successful!');
            this.showDashboard();
        } else {
            this.showError('Invalid email or password');
        }

        this.hideLoading();
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const termsAccepted = document.getElementById('termsAccepted').checked;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if user already exists
        if (this.findUser(email)) {
            this.showError('User with this email already exists');
            this.hideLoading();
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            password,
            isAdmin: false,
            emailVerified: true, // Auto-verify for demo
            hasAccess: true, // Auto-grant access for demo
            openaiApiKey: ''
        };

        this.users.push(newUser);
        this.saveUsers(this.users);

        this.showSuccess('Registration successful! You can now log in.');
        this.showPage('loginPage');
        this.hideLoading();
    }

    showDashboard() {
        if (this.currentUser.isAdmin) {
            this.showPage('adminDashboard');
        } else {
            this.showPage('dashboard');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showPage('loginPage');
    }

    showSettings() {
        // Pre-fill current API key status
        const apiKeyInput = document.getElementById('openaiApiKey');
        if (this.currentUser.openaiApiKey && this.currentUser.openaiApiKey !== 'demo') {
            apiKeyInput.placeholder = 'API key is set (hidden for security)';
        } else {
            apiKeyInput.placeholder = 'Enter your OpenAI API key or type "demo" for mock responses';
        }
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    async handleSettings(e) {
        e.preventDefault();
        this.showLoading();

        const openaiApiKey = document.getElementById('openaiApiKey').value;
        const newPassword = document.getElementById('newPassword').value;

        // Update user data
        if (openaiApiKey) {
            this.currentUser.openaiApiKey = openaiApiKey;
        }
        
        if (newPassword) {
            this.currentUser.password = newPassword;
        }

        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers(this.users);
        }

        // Update current session
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        this.showSuccess('Settings updated successfully');
        this.hideSettings();
        document.getElementById('settingsForm').reset();
        this.hideLoading();
    }

    setFederalMode(mode) {
        document.getElementById('federalEmailMode').classList.toggle('active', mode === 'email');
        document.getElementById('federalQuestionMode').classList.toggle('active', mode === 'question');
        
        const label = document.getElementById('federalInputLabel');
        const input = document.getElementById('federalInput');
        
        if (mode === 'email') {
            label.textContent = 'Paste employee email:';
            input.placeholder = 'Paste the employee\'s email here...';
        } else {
            label.textContent = 'Ask your question:';
            input.placeholder = 'Enter your FMLA question here...';
        }
    }

    setCaliforniaMode(mode) {
        document.getElementById('californiaEmailMode').classList.toggle('active', mode === 'email');
        document.getElementById('californiaQuestionMode').classList.toggle('active', mode === 'question');
        
        const label = document.getElementById('californiaInputLabel');
        const input = document.getElementById('californiaInput');
        
        if (mode === 'email') {
            label.textContent = 'Paste employee email:';
            input.placeholder = 'Paste the employee\'s email here...';
        } else {
            label.textContent = 'Ask your question:';
            input.placeholder = 'Enter your California leave question here...';
        }
    }

    async handleFederalSubmit() {
        const input = document.getElementById('federalInput').value.trim();
        if (!input) {
            this.showError('Please enter some text');
            return;
        }

        // Check API key status
        const apiKey = this.currentUser.openaiApiKey || '';
        console.log('🔑 Current API key for Federal:', apiKey);
        
        if (!apiKey) {
            this.showError('Please add your OpenAI API key in Settings first, or use "demo" for mock responses');
            this.showSettings();
            return;
        }

        const mode = document.getElementById('federalEmailMode').classList.contains('active') ? 'email' : 'question';
        
        this.showLoading();
        document.getElementById('federalSubmit').disabled = true;

        try {
            const isDemo = apiKey === 'demo';
            if (isDemo) {
                console.log('🎭 Using demo mode for Federal tool');
                this.showSuccess('Using demo mode - generating mock response...');
            }
            
            const response = await this.callOpenAI(input, mode, 'federal');
            document.getElementById('federalOutput').textContent = response;
            
            if (isDemo) {
                this.showSuccess('Demo response generated! Add a real OpenAI API key for actual AI responses.');
            }
        } catch (error) {
            console.error('Federal AI error:', error);
            this.showError('Failed to generate response: ' + error.message);
        }

        this.hideLoading();
        document.getElementById('federalSubmit').disabled = false;
    }

    async handleCaliforniaSubmit() {
        const input = document.getElementById('californiaInput').value.trim();
        if (!input) {
            this.showError('Please enter some text');
            return;
        }

        // Check API key status
        const apiKey = this.currentUser.openaiApiKey || '';
        console.log('🔑 Current API key for California:', apiKey);

        if (!apiKey) {
            this.showError('Please add your OpenAI API key in Settings first, or use "demo" for mock responses');
            this.showSettings();
            return;
        }

        const mode = document.getElementById('californiaEmailMode').classList.contains('active') ? 'email' : 'question';
        
        this.showLoading();
        document.getElementById('californiaSubmit').disabled = true;

        try {
            const isDemo = apiKey === 'demo';
            if (isDemo) {
                console.log('🎭 Using demo mode for California tool');
                this.showSuccess('Using demo mode - generating mock response...');
            }
            
            const response = await this.callOpenAI(input, mode, 'california');
            document.getElementById('californiaOutput').textContent = response;
            
            if (isDemo) {
                this.showSuccess('Demo response generated! Add a real OpenAI API key for actual AI responses.');
            }
        } catch (error) {
            console.error('California AI error:', error);
            this.showError('Failed to generate response: ' + error.message);
        }

        this.hideLoading();
        document.getElementById('californiaSubmit').disabled = false;
    }

    async callOpenAI(input, mode, tool) {
        // Check if we should use mock responses or real API
        const useMockResponses = !this.currentUser.openaiApiKey || 
                                this.currentUser.openaiApiKey === 'demo' || 
                                this.currentUser.openaiApiKey === '';
        
        console.log('🤖 API Key status:', this.currentUser.openaiApiKey);
        console.log('🎭 Using mock responses:', useMockResponses);
        
        if (useMockResponses) {
            console.log('📝 Generating mock response...');
            return this.getMockResponse(input, mode, tool);
        }
        
        console.log('🌐 Attempting real OpenAI API call...');
        // Try real OpenAI API with CORS proxy
        return this.callRealOpenAI(input, mode, tool);
    }

    getMockResponse(input, mode, tool) {
        // Simulate API delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResponses = {
                    federal: {
                        email: `Dear [Employee Name],

Thank you for your inquiry regarding leave under the Family and Medical Leave Act (FMLA).

Based on your request, I want to provide you with some general information about FMLA. Please note that this is informational only, and final determinations regarding leave eligibility and approval are made by our HR department in consultation with management.

FMLA may provide eligible employees with up to 12 weeks of unpaid, job-protected leave for qualifying reasons. Key points to understand:

• Job Protection: FMLA provides job protection, meaning you would be restored to the same or equivalent position upon return
• Pay: FMLA leave is unpaid, though you may be able to use accrued paid time off
• Benefits: Health insurance coverage typically continues during FMLA leave
• Eligibility: Specific eligibility requirements must be met

Next Steps:
Please contact our HR department to discuss your specific situation and begin the formal FMLA process if applicable. They will provide you with the necessary forms and guide you through the requirements.

If you have additional questions, please don't hesitate to reach out to HR directly.

Best regards,
[Your Name]
HR Department

Note: This communication is for informational purposes only and does not constitute legal advice or a determination of FMLA eligibility.`,
                        question: `FMLA (Family and Medical Leave Act) provides eligible employees with up to 12 weeks of unpaid, job-protected leave per 12-month period for qualifying reasons.

Key Administrative Points:
• Eligibility: Employee must work for covered employer, meet tenure and hours requirements
• Job Protection: Restoration to same or equivalent position upon return
• Benefits: Continuation of health insurance during leave
• Documentation: Medical certification typically required
• Notice: 30-day advance notice when foreseeable

Important: Always defer specific eligibility determinations and leave approvals to management. This is general information only and does not constitute legal advice.

For specific cases, direct employees to complete formal FMLA paperwork and consult with HR leadership for final determinations.`
                    },
                    california: {
                        email: `Dear [Employee Name],

Thank you for your inquiry regarding leave options available to you in California.

California employees may be covered under multiple leave laws, and I want to provide you with general information about the applicable protections. Please note that this is informational only, and final determinations regarding leave eligibility and approval are made by our HR department.

Potential Leave Protections (in order of analysis):

1. FMLA (Federal): Up to 12 weeks unpaid, job-protected leave for qualifying reasons
2. CFRA (California): Similar to FMLA but with some California-specific provisions
3. PDL (Pregnancy Disability Leave): Available when disabled by pregnancy, childbirth, or related conditions

Key Points:
• Job Protection: These laws provide job protection with restoration rights
• Pay: Leave is typically unpaid, though you may use accrued paid time off
• Benefits: Health insurance continuation during leave periods
• Coordination: Laws may run concurrently or provide additional protections

Next Steps:
Please contact our HR department immediately to discuss your specific situation. They will:
- Determine which laws may apply to your situation
- Provide necessary forms and documentation requirements
- Guide you through the formal leave process

Important: Each situation is unique, and eligibility depends on specific circumstances that must be evaluated by HR.

Best regards,
[Your Name]
HR Department

Note: This communication is for informational purposes only and does not constitute legal advice or a determination of leave eligibility.`,
                        question: `California employees may be covered under multiple leave laws that must be analyzed in this order:

1. FMLA (Federal Family and Medical Leave Act)
   - 12 weeks unpaid, job-protected leave
   - Covers serious health conditions, family care, bonding

2. CFRA (California Family Rights Act)  
   - Similar to FMLA with California-specific provisions
   - May provide additional protections beyond federal law

3. PDL (Pregnancy Disability Leave)
   - Available ONLY when employee is disabled by pregnancy
   - Note: Pregnancy alone does not trigger PDL - disability is required
   - Separate from and in addition to other leave rights

Administrative Guidelines:
• Always analyze in the order: FMLA → CFRA → PDL
• Laws may run concurrently or provide sequential protections
• Each has specific eligibility requirements and procedures
• Never approve/deny leave - defer to management for final determinations

Exclusions: This does not cover PFL wage replacement, Workers' Comp, SDI, or local ordinances.

For specific cases, direct employees to HR for formal evaluation and determination.`
                    }
                };

                const response = mockResponses[tool][mode];
                resolve(response);
            }, 1000); // 1 second delay to simulate API call
        });
    }

    async callRealOpenAI(input, mode, tool) {
        const systemPrompts = {
            federal: `You are a Federal Leave Assistant for HR professionals. You provide informational support ONLY for FMLA (Family and Medical Leave Act) compliance.

STRICT SCOPE:
- ONLY Federal FMLA law
- EXCLUDE: CFRA, PDL, state laws, local ordinances, collective bargaining agreements

CRITICAL CONSTRAINTS:
- NEVER approve or deny leave requests
- NEVER confirm eligibility 
- NEVER provide legal advice
- NEVER diagnose medical conditions
- Always defer decisions to the employer

RESPONSE MODES:
1. Employee Email Mode: Draft professional, neutral responses for external communication explaining job protection vs. pay, referencing documentation
2. Quick Question Mode: Provide concise administrative explanations without email formatting

TONE: Professional, neutral, plain English. Always redirect out-of-scope requests to the employer.`,

            california: `You are a California Leave Assistant for HR professionals. You provide informational support for Federal FMLA, California CFRA, and PDL (Pregnancy Disability Leave).

STRICT SCOPE:
- Federal FMLA
- California CFRA  
- PDL (Pregnancy Disability Leave)
- EXCLUDE: Paid Family Leave (PFL) wage replacement, Workers' Comp, SDI, local ordinances

ANALYSIS ORDER (when multiple laws apply):
1. FMLA first
2. CFRA second  
3. PDL third (ONLY when employee is disabled by pregnancy - pregnancy alone does NOT trigger PDL)

CRITICAL CONSTRAINTS:
- NEVER approve or deny leave requests
- NEVER confirm eligibility
- NEVER provide legal advice  
- NEVER diagnose medical conditions
- Always defer decisions to the employer

RESPONSE MODES:
1. Employee Email Mode: Draft professional, neutral responses for external communication
2. Quick Question Mode: Provide concise administrative explanations without email formatting

TONE: Professional, neutral, plain English. Always redirect out-of-scope requests to the employer.`
        };

        const messages = [
            { role: 'system', content: systemPrompts[tool] },
            { 
                role: 'user', 
                content: mode === 'email' 
                    ? `Please draft a response to this employee email: ${input}`
                    : `Please answer this question: ${input}`
            }
        ];

        // Try using a CORS proxy
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(proxyUrl + targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.currentUser.openaiApiKey}`,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages,
                max_tokens: 1000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        const text = element.textContent;
        
        if (!text.trim()) {
            this.showError('No content to copy');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.showSuccess('Copied to clipboard');
        }).catch(() => {
            this.showError('Failed to copy to clipboard');
        });
    }

    clearOutput(tool) {
        document.getElementById(`${tool}Output`).textContent = '';
        document.getElementById(`${tool}Input`).value = '';
    }

    showError(message) {
        // Create a simple toast notification
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        // Create a simple toast notification
        this.showToast(message, 'success');
    }

    showToast(message, type) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            ${type === 'error' ? 'background-color: #ef4444;' : 'background-color: #10b981;'}
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app
console.log('🎯 Starting Leave Assistant Application (Standalone)...');
console.log('📍 Current URL:', window.location.href);

// Add a global function to reset demo mode (for debugging)
window.resetToDemo = function() {
    console.log('🔄 Resetting to demo mode...');
    localStorage.clear();
    location.reload();
};

// Add a global function to set demo mode without clearing everything
window.setDemoMode = function() {
    console.log('🎭 Setting demo mode...');
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        user.openaiApiKey = 'demo';
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log('✅ Demo mode set for current user');
    }
    
    const users = localStorage.getItem('users');
    if (users) {
        const userList = JSON.parse(users);
        const adminUser = userList.find(u => u.email === 'talk2char@gmail.com');
        if (adminUser) {
            adminUser.openaiApiKey = 'demo';
            localStorage.setItem('users', JSON.stringify(userList));
            console.log('✅ Demo mode set for admin user');
        }
    }
    
    location.reload();
};

console.log('💡 Available functions:');
console.log('  - resetToDemo() - Clear all data and reset');
console.log('  - setDemoMode() - Set demo mode for current user');

let app;
try {
    app = new LeaveAssistantApp();
} catch (error) {
    console.error('❌ Error initializing app:', error);
}

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
});