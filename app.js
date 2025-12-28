class LeaveAssistantApp {
    constructor() {
        try {
            console.log('🚀 Initializing Leave Assistant App (Standalone Mode)...');
            this.currentUser = null;
            this.users = [];
            this.pendingVerifications = [];
            
            // Initialize data with error handling
            try {
                this.users = this.loadUsers();
                console.log('✅ Users loaded:', this.users.length);
            } catch (error) {
                console.error('❌ Error loading users:', error);
                this.users = [];
            }
            
            try {
                this.pendingVerifications = this.loadPendingVerificationsData();
                console.log('✅ Pending verifications loaded:', this.pendingVerifications.length);
            } catch (error) {
                console.error('❌ Error loading pending verifications:', error);
                this.pendingVerifications = [];
            }
            
            // Popular email providers list
            this.allowedEmailDomains = [
                'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
                'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com',
                'zoho.com', 'yandex.com', 'mail.com', 'gmx.com', 'fastmail.com',
                // Business domains
                'company.com', 'business.com', 'corp.com', 'org.com', 'edu',
                // Common business patterns
                'co.uk', 'com.au', 'ca', 'de', 'fr', 'it', 'es', 'nl', 'se', 'no'
            ];
            
            console.log('🔧 Starting app initialization...');
            this.init();
        } catch (error) {
            console.error('❌ Constructor error:', error);
            // Initialize with defaults
            this.currentUser = null;
            this.users = [];
            this.pendingVerifications = [];
            this.allowedEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com'];
            
            // Try to continue with basic functionality
            setTimeout(() => {
                try {
                    this.showPage('loginPage');
                } catch (e) {
                    console.error('❌ Failed to show login page:', e);
                }
            }, 100);
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
        
        // Check for email verification token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const verifyToken = urlParams.get('verify');
        
        if (verifyToken) {
            console.log('🔍 Found verification token in URL');
            this.verifyEmailToken(verifyToken);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Check for existing session
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            console.log('🔑 Found existing session:', this.currentUser.email);
            console.log('🔑 User API key:', this.currentUser.openaiApiKey);
            console.log('👑 Is Admin:', this.currentUser.isAdmin);
            
            // Check if email is verified
            if (!this.currentUser.emailVerified) {
                console.log('⚠️ User email not verified, showing verification page');
                this.showPage('verificationPage');
            } else {
                this.showDashboard();
            }
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
        document.getElementById('backToLogin').addEventListener('click', () => this.showPage('loginPage'));
        document.getElementById('resendVerification').addEventListener('click', () => this.handleResendVerification());
        
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

        // Admin settings
        document.getElementById('adminSettingsBtn').addEventListener('click', () => this.showAdminSettings());
        document.getElementById('closeAdminSettings').addEventListener('click', () => this.hideAdminSettings());
        document.getElementById('adminPasswordForm').addEventListener('submit', (e) => this.handleAdminPasswordChange(e));
        document.getElementById('adminProfileForm').addEventListener('submit', (e) => this.handleAdminProfileUpdate(e));
        
        // Admin dashboard actions
        document.getElementById('refreshUsers').addEventListener('click', () => this.refreshUsersList());
        document.getElementById('exportUsers').addEventListener('click', () => this.exportUserData());
        document.getElementById('cleanupExpired').addEventListener('click', () => this.cleanupExpiredTokens());
        document.getElementById('userFilter').addEventListener('change', (e) => this.filterUsers(e.target.value));
        document.getElementById('userSearch').addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // System settings
        document.getElementById('allowRegistration').addEventListener('change', (e) => this.updateSystemSetting('allowRegistration', e.target.checked));
        document.getElementById('requireEmailVerification').addEventListener('change', (e) => this.updateSystemSetting('requireEmailVerification', e.target.checked));
        document.getElementById('autoGrantAccess').addEventListener('change', (e) => this.updateSystemSetting('autoGrantAccess', e.target.checked));
        
        // System actions
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());
        document.getElementById('downloadBackup').addEventListener('click', () => this.downloadBackup());
        
        // User edit modal
        document.getElementById('closeUserEdit').addEventListener('click', () => this.hideUserEditModal());
        document.getElementById('userEditForm').addEventListener('submit', (e) => this.handleUserEdit(e));
        document.getElementById('deleteUser').addEventListener('click', () => this.handleDeleteUser());
        document.getElementById('editUserConferenceAccess').addEventListener('change', (e) => this.toggleConferenceDateRange(e.target.checked));
        
        // Admin settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });
        
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
        try {
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
        } catch (error) {
            console.error('❌ Error loading users from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem('users');
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
        
        console.log('🔧 Creating default admin user...');
        this.saveUsers(defaultUsers);
        return defaultUsers;
    }

    saveUsers(users) {
        try {
            localStorage.setItem('users', JSON.stringify(users));
            console.log('💾 Users saved successfully');
        } catch (error) {
            console.error('❌ Error saving users:', error);
        }
    }

    loadPendingVerificationsData() {
        try {
            const pending = localStorage.getItem('pendingVerifications');
            return pending ? JSON.parse(pending) : [];
        } catch (error) {
            console.error('❌ Error loading pending verifications:', error);
            return [];
        }
    }

    savePendingVerifications(verifications) {
        localStorage.setItem('pendingVerifications', JSON.stringify(verifications));
    }

    isValidEmailDomain(email) {
        const domain = email.toLowerCase().split('@')[1];
        if (!domain) return false;
        
        // Check exact matches
        if (this.allowedEmailDomains.includes(domain)) {
            return true;
        }
        
        // Check for common business patterns
        const businessPatterns = [
            /^[a-zA-Z0-9-]+\.(com|org|net|edu|gov)$/,
            /^[a-zA-Z0-9-]+\.co\.[a-z]{2}$/,
            /^[a-zA-Z0-9-]+\.(edu|ac)\.[a-z]{2}$/
        ];
        
        return businessPatterns.some(pattern => pattern.test(domain));
    }

    generateVerificationToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    async sendVerificationEmail(email, token) {
        // Simulate sending email (in real app, this would call an email service)
        console.log('📧 Sending verification email to:', email);
        console.log('🔑 Verification token:', token);
        
        // For demo purposes, we'll show the verification link in console and alert
        const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${token}`;
        
        console.log('🔗 Verification URL:', verificationUrl);
        
        // Show user the verification link (in real app, this would be sent via email)
        setTimeout(() => {
            alert(`DEMO MODE: Email verification required!\n\nIn a real application, this would be sent to your email.\n\nFor demo purposes, click OK and the verification will be completed automatically.`);
            
            // Auto-verify for demo
            this.verifyEmailToken(token);
        }, 1000);
        
        return true;
    }

    verifyEmailToken(token) {
        const verification = this.pendingVerifications.find(v => v.token === token);
        if (!verification) {
            this.showError('Invalid or expired verification token');
            return false;
        }
        
        // Check if token is expired (24 hours)
        const now = new Date().getTime();
        const tokenAge = now - verification.createdAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (tokenAge > maxAge) {
            this.showError('Verification token has expired. Please register again.');
            // Remove expired token
            this.pendingVerifications = this.pendingVerifications.filter(v => v.token !== token);
            this.savePendingVerifications(this.pendingVerifications);
            return false;
        }
        
        // Create the user account
        const userData = verification.userData;
        userData.emailVerified = true;
        userData.id = Date.now().toString();
        
        this.users.push(userData);
        this.saveUsers(this.users);
        
        // Remove from pending verifications
        this.pendingVerifications = this.pendingVerifications.filter(v => v.token !== token);
        this.savePendingVerifications(this.pendingVerifications);
        
        this.showSuccess('Email verified successfully! You can now log in.');
        this.showPage('loginPage');
        
        return true;
    }

    refreshUsersList() {
        console.log('🔄 Refreshing users list...');
        this.users = this.loadUsers();
        this.pendingVerifications = this.loadPendingVerificationsData();
        this.loadAdminDashboard();
        this.showSuccess('User list refreshed');
    }

    exportUserData() {
        const users = this.users.filter(u => !u.isAdmin);
        
        // Create CSV headers
        const headers = [
            'First Name',
            'Last Name', 
            'Email',
            'Email Verified',
            'Comped Access',
            'Conference Access',
            'Conference Start Date',
            'Conference End Date',
            'Subscription Active',
            'Join Date',
            'Has API Key'
        ];
        
        // Create CSV rows
        const rows = users.map(u => [
            u.firstName || '',
            u.lastName || '',
            u.email || '',
            u.emailVerified ? 'Yes' : 'No',
            u.comped ? 'Yes' : 'No',
            u.conferenceAccess ? 'Yes' : 'No',
            u.conferenceDateRange?.start || '',
            u.conferenceDateRange?.end || '',
            u.subscriptionActive ? 'Yes' : 'No',
            new Date(parseInt(u.id)).toLocaleDateString(),
            u.openaiApiKey ? 'Yes' : 'No'
        ]);
        
        // Combine headers and rows
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const escaped = String(field).replace(/"/g, '""');
                return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
            }).join(','))
            .join('\n');
        
        // Add summary information at the top
        const summary = [
            `# Leave Assistant User Export`,
            `# Export Date: ${new Date().toISOString()}`,
            `# Total Users: ${users.length}`,
            `# Verified Users: ${users.filter(u => u.emailVerified).length}`,
            `# Pending Verifications: ${this.pendingVerifications.length}`,
            ``,
            ``
        ].join('\n');
        
        const finalCsv = summary + csvContent;
        
        // Create and download file
        const dataBlob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `leave-assistant-users-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showSuccess(`User data exported successfully (${users.length} users)`);
    }

    cleanupExpiredTokens() {
        const now = new Date().getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const initialCount = this.pendingVerifications.length;
        
        this.pendingVerifications = this.pendingVerifications.filter(v => {
            const age = now - v.createdAt;
            return age <= maxAge;
        });
        
        this.savePendingVerifications(this.pendingVerifications);
        const removedCount = initialCount - this.pendingVerifications.length;
        
        this.loadPendingVerifications();
        this.showSuccess(`Cleaned up ${removedCount} expired verification tokens`);
    }

    filterUsers(filter) {
        const search = document.getElementById('userSearch').value;
        this.loadUsersList(filter, search);
    }

    searchUsers(search) {
        const filter = document.getElementById('userFilter').value;
        this.loadUsersList(filter, search);
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // Populate edit form
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserFirstName').value = user.firstName;
        document.getElementById('editUserLastName').value = user.lastName;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserComped').checked = user.comped || false;
        document.getElementById('editUserConferenceAccess').checked = user.conferenceAccess || false;
        document.getElementById('editUserSubscriptionActive').checked = user.subscriptionActive || false;
        document.getElementById('editUserEmailVerified').checked = user.emailVerified || false;

        // Handle conference date range
        if (user.conferenceDateRange) {
            document.getElementById('conferenceStartDate').value = user.conferenceDateRange.start;
            document.getElementById('conferenceEndDate').value = user.conferenceDateRange.end;
            document.getElementById('conferenceDateRange').classList.remove('hidden');
        } else {
            document.getElementById('conferenceDateRange').classList.add('hidden');
        }

        this.showUserEditModal();
    }

    toggleUserAccess(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const hasAccess = this.hasUserAccess(user);
        
        if (hasAccess) {
            // Revoke access
            user.comped = false;
            user.conferenceAccess = false;
            user.subscriptionActive = false;
            user.conferenceDateRange = null;
        } else {
            // Grant access (comp them)
            user.comped = true;
        }

        this.saveUsers(this.users);
        this.loadAdminDashboard();
        this.showSuccess(`Access ${hasAccess ? 'revoked' : 'granted'} for ${user.firstName} ${user.lastName}`);
    }

    deletePendingVerification(token) {
        if (confirm('Are you sure you want to delete this pending verification?')) {
            this.pendingVerifications = this.pendingVerifications.filter(v => v.token !== token);
            this.savePendingVerifications(this.pendingVerifications);
            this.loadPendingVerifications();
            this.showSuccess('Pending verification deleted');
        }
    }

    clearAllData() {
        if (confirm('⚠️ WARNING: This will delete ALL user data and cannot be undone!\n\nType "DELETE ALL" to confirm:') === false) {
            return;
        }
        
        const confirmation = prompt('Type "DELETE ALL" to confirm:');
        if (confirmation !== 'DELETE ALL') {
            this.showError('Confirmation text did not match. Data not deleted.');
            return;
        }

        // Clear all data except admin user
        const adminUser = this.users.find(u => u.isAdmin);
        this.users = adminUser ? [adminUser] : [];
        this.pendingVerifications = [];
        
        this.saveUsers(this.users);
        this.savePendingVerifications(this.pendingVerifications);
        
        // Clear other data
        localStorage.removeItem('systemSettings');
        
        this.loadAdminDashboard();
        this.showSuccess('All user data has been cleared');
    }

    showAdminSettings() {
        // Pre-fill admin profile data
        document.getElementById('adminFirstName').value = this.currentUser.firstName;
        document.getElementById('adminLastName').value = this.currentUser.lastName;
        document.getElementById('adminEmail').value = this.currentUser.email;
        
        document.getElementById('adminSettingsModal').classList.remove('hidden');
    }

    hideAdminSettings() {
        document.getElementById('adminSettingsModal').classList.add('hidden');
    }

    switchAdminTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(tabName + 'Tab').classList.remove('hidden');
    }

    async handleAdminPasswordChange(e) {
        e.preventDefault();
        this.showLoading();

        const currentPassword = document.getElementById('adminCurrentPassword').value;
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showError('New passwords do not match');
            this.hideLoading();
            return;
        }

        if (this.currentUser.password !== currentPassword) {
            this.showError('Current password is incorrect');
            this.hideLoading();
            return;
        }

        // Update password
        this.currentUser.password = newPassword;
        
        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers(this.users);
        }

        // Update current session
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        this.showSuccess('Admin password updated successfully');
        this.hideAdminSettings();
        document.getElementById('adminPasswordForm').reset();
        this.hideLoading();
    }

    async handleAdminProfileUpdate(e) {
        e.preventDefault();
        this.showLoading();

        const firstName = document.getElementById('adminFirstName').value.trim();
        const lastName = document.getElementById('adminLastName').value.trim();

        // Update profile
        this.currentUser.firstName = firstName;
        this.currentUser.lastName = lastName;
        
        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers(this.users);
        }

        // Update current session
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        this.showSuccess('Admin profile updated successfully');
        this.hideLoading();
    }

    showUserEditModal() {
        document.getElementById('userEditModal').classList.remove('hidden');
    }

    hideUserEditModal() {
        document.getElementById('userEditModal').classList.add('hidden');
    }

    toggleConferenceDateRange(show) {
        const dateRange = document.getElementById('conferenceDateRange');
        if (show) {
            dateRange.classList.remove('hidden');
        } else {
            dateRange.classList.add('hidden');
        }
    }

    async handleUserEdit(e) {
        e.preventDefault();
        this.showLoading();

        const userId = document.getElementById('editUserId').value;
        const user = this.users.find(u => u.id === userId);
        
        if (!user) {
            this.showError('User not found');
            this.hideLoading();
            return;
        }

        // Update user data
        user.firstName = document.getElementById('editUserFirstName').value.trim();
        user.lastName = document.getElementById('editUserLastName').value.trim();
        user.comped = document.getElementById('editUserComped').checked;
        user.conferenceAccess = document.getElementById('editUserConferenceAccess').checked;
        user.subscriptionActive = document.getElementById('editUserSubscriptionActive').checked;
        user.emailVerified = document.getElementById('editUserEmailVerified').checked;

        // Handle conference date range
        if (user.conferenceAccess) {
            const startDate = document.getElementById('conferenceStartDate').value;
            const endDate = document.getElementById('conferenceEndDate').value;
            
            if (startDate && endDate) {
                user.conferenceDateRange = {
                    start: startDate,
                    end: endDate
                };
            }
        } else {
            user.conferenceDateRange = null;
        }

        this.saveUsers(this.users);
        this.loadAdminDashboard();
        this.hideUserEditModal();
        this.showSuccess(`User ${user.firstName} ${user.lastName} updated successfully`);
        this.hideLoading();
    }

    async handleDeleteUser() {
        const userId = document.getElementById('editUserId').value;
        const user = this.users.find(u => u.id === userId);
        
        if (!user) {
            this.showError('User not found');
            return;
        }

        if (confirm(`⚠️ Are you sure you want to delete user "${user.firstName} ${user.lastName}" (${user.email})?\n\nThis action cannot be undone.`)) {
            this.users = this.users.filter(u => u.id !== userId);
            this.saveUsers(this.users);
            this.loadAdminDashboard();
            this.hideUserEditModal();
            this.showSuccess(`User ${user.firstName} ${user.lastName} deleted successfully`);
        }
    }

    async handleResendVerification() {
        // For demo purposes, just show a message
        this.showSuccess('In a real application, this would resend the verification email. For demo purposes, verification is automatic.');
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

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = this.findUser(email, password);
        
        if (user) {
            if (!user.emailVerified) {
                this.showError('Please verify your email address before logging in. Check your email for verification instructions.');
                this.hideLoading();
                return;
            }
            
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

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value;
        const termsAccepted = document.getElementById('termsAccepted').checked;

        // Validate email domain
        if (!this.isValidEmailDomain(email)) {
            this.showError('Please use an email from a recognized email provider (Gmail, Yahoo, Outlook, etc.) or your company domain.');
            this.hideLoading();
            return;
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if user already exists
        if (this.findUser(email)) {
            this.showError('User with this email already exists');
            this.hideLoading();
            return;
        }

        // Check if email is already pending verification
        const existingPending = this.pendingVerifications.find(v => v.userData.email === email);
        if (existingPending) {
            this.showError('A verification email has already been sent to this address. Please check your email or wait before trying again.');
            this.hideLoading();
            return;
        }

        // Generate verification token
        const verificationToken = this.generateVerificationToken();

        // Create pending verification
        const pendingVerification = {
            token: verificationToken,
            createdAt: new Date().getTime(),
            userData: {
                firstName,
                lastName,
                email,
                password,
                isAdmin: false,
                emailVerified: false,
                hasAccess: true, // Auto-grant access for demo
                openaiApiKey: 'demo'
            }
        };

        // Save pending verification
        this.pendingVerifications.push(pendingVerification);
        this.savePendingVerifications(this.pendingVerifications);

        // Send verification email
        try {
            await this.sendVerificationEmail(email, verificationToken);
            this.showSuccess('Registration initiated! Please check your email for verification instructions.');
            this.showPage('verificationPage');
        } catch (error) {
            console.error('Email sending error:', error);
            this.showError('Failed to send verification email. Please try again.');
        }

        this.hideLoading();
    }

    showDashboard() {
        if (this.currentUser.isAdmin) {
            console.log('👑 Loading admin dashboard...');
            this.showPage('adminDashboard');
            // Add a small delay to ensure DOM is ready
            setTimeout(() => {
                this.loadAdminDashboard();
            }, 100);
        } else {
            console.log('👤 Loading user dashboard...');
            this.showPage('dashboard');
        }
    }

    async loadAdminDashboard() {
        try {
            console.log('📊 Loading admin dashboard...');
            console.log('👥 Total users in system:', this.users.length);
            console.log('📧 Pending verifications:', this.pendingVerifications.length);
            
            // Ensure we have the admin dashboard elements
            const adminDashboard = document.getElementById('adminDashboard');
            if (!adminDashboard) {
                console.error('❌ Admin dashboard element not found');
                this.showError('Admin dashboard not found in DOM');
                return;
            }
            
            // Check if admin dashboard is visible
            if (adminDashboard.classList.contains('hidden')) {
                console.log('⚠️ Admin dashboard is hidden, showing it...');
                this.showPage('adminDashboard');
            }
            
            this.updateAdminStats();
            this.loadUsersList();
            this.loadPendingVerifications();
            this.loadSystemSettings();
            this.calculateStorageUsage();
            
            console.log('✅ Admin dashboard loaded successfully');
        } catch (error) {
            console.error('❌ Error loading admin dashboard:', error);
            this.showError('Failed to load admin dashboard: ' + error.message);
        }
    }

    updateAdminStats() {
        try {
            const allUsers = this.users || [];
            const nonAdminUsers = allUsers.filter(u => !u.isAdmin);
            
            const totalUsers = nonAdminUsers.length;
            const verifiedUsers = nonAdminUsers.filter(u => u.emailVerified).length;
            const activeAccess = nonAdminUsers.filter(u => this.hasUserAccess(u)).length;
            const compedUsers = nonAdminUsers.filter(u => u.comped).length;

            console.log('📊 Admin Stats:', {
                totalUsers,
                verifiedUsers,
                activeAccess,
                compedUsers
            });

            // Update DOM elements
            const totalUsersEl = document.getElementById('totalUsers');
            const verifiedUsersEl = document.getElementById('verifiedUsers');
            const activeSubscriptionsEl = document.getElementById('activeSubscriptions');
            const compedUsersEl = document.getElementById('compedUsers');

            if (totalUsersEl) totalUsersEl.textContent = totalUsers;
            if (verifiedUsersEl) verifiedUsersEl.textContent = verifiedUsers;
            if (activeSubscriptionsEl) activeSubscriptionsEl.textContent = activeAccess;
            if (compedUsersEl) compedUsersEl.textContent = compedUsers;
            
        } catch (error) {
            console.error('❌ Error updating admin stats:', error);
        }
    }

    hasUserAccess(user) {
        if (user.comped) return true;
        
        if (user.conferenceAccess && user.conferenceDateRange) {
            const now = new Date();
            const start = new Date(user.conferenceDateRange.start);
            const end = new Date(user.conferenceDateRange.end);
            if (now >= start && now <= end) return true;
        }
        
        return user.subscriptionActive;
    }

    loadUsersList(filter = 'all', search = '') {
        let filteredUsers = this.users.filter(u => !u.isAdmin);

        // Apply filter
        switch (filter) {
            case 'verified':
                filteredUsers = filteredUsers.filter(u => u.emailVerified);
                break;
            case 'unverified':
                filteredUsers = filteredUsers.filter(u => !u.emailVerified);
                break;
            case 'comped':
                filteredUsers = filteredUsers.filter(u => u.comped);
                break;
            case 'conference':
                filteredUsers = filteredUsers.filter(u => u.conferenceAccess);
                break;
            case 'subscribed':
                filteredUsers = filteredUsers.filter(u => u.subscriptionActive);
                break;
        }

        // Apply search
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(u => 
                u.firstName.toLowerCase().includes(searchLower) ||
                u.lastName.toLowerCase().includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower)
            );
        }

        this.renderUsersList(filteredUsers);
    }

    renderUsersList(users) {
        const usersList = document.getElementById('usersList');
        
        if (!usersList) {
            console.error('❌ Users list element not found');
            return;
        }
        
        console.log('👥 Rendering users list:', users.length, 'users');
        
        if (users.length === 0) {
            usersList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666666;">No users found</div>';
            return;
        }

        usersList.innerHTML = users.map(user => {
            const hasAccess = this.hasUserAccess(user);
            const joinDate = new Date(parseInt(user.id)).toLocaleDateString();
            
            let accessBadges = [];
            if (user.comped) accessBadges.push('<span class="status-badge active">Comped</span>');
            if (user.conferenceAccess) accessBadges.push('<span class="status-badge active">Conference</span>');
            if (user.subscriptionActive) accessBadges.push('<span class="status-badge active">Subscribed</span>');
            if (!user.emailVerified) accessBadges.push('<span class="status-badge pending">Unverified</span>');
            if (!hasAccess) accessBadges.push('<span class="status-badge inactive">No Access</span>');

            return `
                <div class="user-card">
                    <div class="user-info">
                        <h4>${user.firstName} ${user.lastName}</h4>
                        <p>${user.email}</p>
                        <p>Joined: ${joinDate}</p>
                        <p>API Key: ${user.openaiApiKey ? (user.openaiApiKey === 'demo' ? 'Demo' : 'Set') : 'None'}</p>
                    </div>
                    <div class="user-status">
                        ${accessBadges.join('')}
                        <div class="user-actions">
                            <button class="btn btn-secondary" onclick="app.editUser('${user.id}')">Edit</button>
                            <button class="btn btn-secondary" onclick="app.toggleUserAccess('${user.id}')">
                                ${hasAccess ? 'Revoke' : 'Grant'} Access
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Users list rendered successfully');
    }

    loadPendingVerifications() {
        const pendingList = document.getElementById('pendingList');
        
        if (this.pendingVerifications.length === 0) {
            pendingList.innerHTML = '<div style="padding: 15px; text-align: center; color: #666666;">No pending verifications</div>';
            return;
        }

        pendingList.innerHTML = this.pendingVerifications.map(pending => {
            const createdDate = new Date(pending.createdAt).toLocaleString();
            const userData = pending.userData;
            
            return `
                <div class="pending-item">
                    <div class="pending-info">
                        <h5>${userData.firstName} ${userData.lastName}</h5>
                        <p>${userData.email} - Created: ${createdDate}</p>
                    </div>
                    <div class="pending-actions">
                        <button class="btn btn-secondary" onclick="app.verifyEmailToken('${pending.token}')">Verify</button>
                        <button class="btn btn-danger" onclick="app.deletePendingVerification('${pending.token}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadSystemSettings() {
        const settings = this.getSystemSettings();
        document.getElementById('allowRegistration').checked = settings.allowRegistration;
        document.getElementById('requireEmailVerification').checked = settings.requireEmailVerification;
        document.getElementById('autoGrantAccess').checked = settings.autoGrantAccess;
    }

    getSystemSettings() {
        const settings = localStorage.getItem('systemSettings');
        return settings ? JSON.parse(settings) : {
            allowRegistration: true,
            requireEmailVerification: true,
            autoGrantAccess: true
        };
    }

    updateSystemSetting(key, value) {
        const settings = this.getSystemSettings();
        settings[key] = value;
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        console.log(`⚙️ System setting updated: ${key} = ${value}`);
    }

    calculateStorageUsage() {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
            }
        }
        
        const sizeInKB = (totalSize / 1024).toFixed(2);
        document.getElementById('storageUsed').textContent = `${sizeInKB} KB`;
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
            label.textContent = 'Paste Employee Email:';
            input.placeholder = 'Paste the employee\'s email here for professional response drafting...';
        } else {
            label.textContent = 'Ask Your HR Question:';
            input.placeholder = 'Enter your FMLA compliance question here...';
        }
    }

    setCaliforniaMode(mode) {
        document.getElementById('californiaEmailMode').classList.toggle('active', mode === 'email');
        document.getElementById('californiaQuestionMode').classList.toggle('active', mode === 'question');
        
        const label = document.getElementById('californiaInputLabel');
        const input = document.getElementById('californiaInput');
        
        if (mode === 'email') {
            label.textContent = 'Paste Employee Email:';
            input.placeholder = 'Paste the employee\'s email here for professional response drafting...';
        } else {
            label.textContent = 'Ask Your HR Question:';
            input.placeholder = 'Enter your California leave compliance question here...';
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

// Add a global function to force create admin user
window.createAdminUser = function() {
    console.log('👑 Creating admin user...');
    const adminUser = {
        id: '1',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'talk2char@gmail.com',
        password: 'Password@123',
        isAdmin: true,
        emailVerified: true,
        hasAccess: true,
        openaiApiKey: 'demo'
    };
    
    localStorage.setItem('users', JSON.stringify([adminUser]));
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    console.log('✅ Admin user created and logged in');
    location.reload();
};

// Add a global function to debug admin dashboard
window.debugAdmin = function() {
    console.log('🔍 Debug Admin Dashboard:');
    console.log('Current user:', app.currentUser);
    console.log('All users:', app.users);
    console.log('Pending verifications:', app.pendingVerifications);
    console.log('Is admin?', app.currentUser?.isAdmin);
    
    if (app.currentUser?.isAdmin) {
        console.log('🔄 Forcing admin dashboard reload...');
        app.loadAdminDashboard();
    }
};

console.log('💡 Available debug functions:');
console.log('  - resetToDemo() - Clear all data and reset');
console.log('  - setDemoMode() - Set demo mode for current user');
console.log('  - createAdminUser() - Force create admin user');
console.log('  - debugAdmin() - Debug admin dashboard');

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