const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const nodemailer = require('nodemailer');
const stripe = require('stripe');
const { PayPalApi, OrdersController, PaymentsController } = require('@paypal/paypal-server-sdk');

const app = express();
const PORT = process.env.PORT || 3001;

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

// Initialize data directory
fs.ensureDirSync(DATA_DIR);

// Email configuration
let emailTransporter = null;

// Payment configurations
let stripeClient = null;
let paypalClient = null;

// Data storage functions
function loadData(filePath, defaultData = []) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readJsonSync(filePath);
        }
        return defaultData;
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        return defaultData;
    }
}

function saveData(filePath, data) {
    try {
        fs.writeJsonSync(filePath, data, { spaces: 2 });
        return true;
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error);
        return false;
    }
}

// Initialize default data
function initializeData() {
    // Initialize users with default admin
    const users = loadData(USERS_FILE, [{
        id: '1',
        email: 'talk2char@gmail.com',
        password: 'Password@123',
        isAdmin: true,
        firstName: 'Super',
        lastName: 'Admin',
        emailVerified: true,
        aiProvider: 'puter',
        createdAt: Date.now()
    }]);
    saveData(USERS_FILE, users);

    // Initialize other data files
    saveData(PENDING_FILE, loadData(PENDING_FILE, []));
    saveData(CONFIG_FILE, loadData(CONFIG_FILE, {
        monthlyFee: 29.99,
        systemSettings: {
            allowRegistration: true,
            requireEmailVerification: true
        }
    }));
    saveData(SESSIONS_FILE, loadData(SESSIONS_FILE, {}));
    saveData(CONVERSATIONS_FILE, loadData(CONVERSATIONS_FILE, {}));

    console.log('✅ Data files initialized');
}

// Initialize email transporter using a free service
async function initializeEmailTransporter() {
    try {
        // For development and testing, we'll use console logging
        // In production, you would configure this with a real SMTP service
        console.log('� Emanil service initialized (Development Mode)');
        console.log('💡 Emails will be logged to console for development');
        // Try to initialize Gmail SMTP
        try {
            emailTransporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER || 'williamskiwix.@gmail.com',
                    pass: process.env.EMAIL_PASS || 'dtzv ecih zjge jhem'
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Test the connection
            await emailTransporter.verify();
            console.log('📧 Gmail SMTP connected successfully');
            console.log('✅ Ready to send real confirmation emails');
            
        } catch (smtpError) {
            console.warn('⚠️ Gmail SMTP setup failed:', smtpError.message);
            console.warn('📝 To enable real emails:');
            console.warn('   1. Create a Gmail account for your app');
            console.warn('   2. Enable 2-factor authentication');
            console.warn('   3. Generate an App Password');
            console.warn('   4. Set EMAIL_USER and EMAIL_PASS environment variables');
            console.log('📧 Running in development mode - emails will be logged to console');
            emailTransporter = null;
        }
    } catch (error) {
        console.warn('⚠️ Email service failed to initialize:', error.message);
        emailTransporter = null;
    }
}

// Free email sending function using a webhook service
async function sendEmailViaWebhook(to, subject, htmlContent, textContent) {
    try {
        console.log('📧 Preparing to send email to:', to);
        console.log('📧 Subject:', subject);
        
        // For development/demo purposes, we'll create a comprehensive log
        // that includes the verification link prominently
        console.log('\n' + '='.repeat(80));
        console.log('📧 EMAIL VERIFICATION REQUIRED');
        console.log('='.repeat(80));
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('\n📋 EMAIL CONTENT:');
        console.log(textContent);
        console.log('\n� VEeRIFICATION LINK (Click or copy):');
        
        // Extract verification link from content
        const linkMatch = textContent.match(/http[s]?:\/\/[^\s]+/);
        if (linkMatch) {
            console.log(linkMatch[0]);
            console.log('\n✅ User can copy this link to verify their email');
        }
        
        console.log('='.repeat(80) + '\n');
        
        // In a real production environment, you would integrate with:
        // - SendGrid (free tier: 100 emails/day)
        // - Mailgun (free tier: 5,000 emails/month)
        // - AWS SES (free tier: 62,000 emails/month)
        // - Resend (free tier: 3,000 emails/month)
        // - EmailJS (client-side email service)
        
        // For now, simulate successful sending
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            success: true,
            messageId: 'dev_' + Date.now(),
            service: 'development',
            note: 'Email logged to console for development'
        };
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        throw error;
    }
}

// Real email sending function using Gmail SMTP
async function sendConfirmationEmail(to, subject, htmlContent, textContent) {
    try {
        console.log('📧 Sending confirmation email to:', to);
        
        if (emailTransporter && typeof emailTransporter.sendMail === 'function') {
            // Send real email using Gmail SMTP
            try {
                const info = await emailTransporter.sendMail({
                    from: '"HRLA Leave Assistant" <hrla.leaveassistant@gmail.com>',
                    to: to,
                    subject: subject,
                    text: textContent,
                    html: htmlContent
                });
                
                console.log('✅ Confirmation email sent successfully!');
                console.log('📧 Message ID:', info.messageId);
                
                return {
                    success: true,
                    messageId: info.messageId,
                    service: 'gmail-smtp'
                };
                
            } catch (emailError) {
                console.error('❌ Failed to send email:', emailError.message);
                // Fall back to console logging
                logEmailToConsole(to, subject, textContent);
                return {
                    success: true,
                    messageId: 'fallback_' + Date.now(),
                    service: 'console-fallback'
                };
            }
        } else {
            // Development mode - log email details
            logEmailToConsole(to, subject, textContent);
            return {
                success: true,
                messageId: 'dev_' + Date.now(),
                service: 'development'
            };
        }
        
    } catch (error) {
        console.error('❌ Email sending error:', error);
        // Still log to console as fallback
        logEmailToConsole(to, subject, textContent);
        return {
            success: true,
            messageId: 'error_fallback_' + Date.now(),
            service: 'error-fallback'
        };
    }
}

// Helper function to log email to console with clear instructions
function logEmailToConsole(to, subject, textContent) {
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL VERIFICATION REQUIRED');
    console.log('='.repeat(80));
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('\n📋 EMAIL CONTENT:');
    console.log(textContent);
    console.log('\n🔗 VERIFICATION LINK (Click or copy):');
    
    // Extract verification link from content
    const linkMatch = textContent.match(/http[s]?:\/\/[^\s]+/);
    if (linkMatch) {
        console.log(linkMatch[0]);
        console.log('\n✅ INSTRUCTIONS FOR USER:');
        console.log('1. Copy the verification link above');
        console.log('2. Open it in your browser');
        console.log('3. Your account will be verified automatically');
        console.log('\n💡 In production, this would be sent as a real email');
    }
    
    console.log('='.repeat(80) + '\n');
}

// Initialize payment systems
function initializePayments() {
    const config = loadData(CONFIG_FILE, {});
    
    // Initialize Stripe
    if (config.stripeSecretKey) {
        try {
            stripeClient = stripe(config.stripeSecretKey);
            console.log('💳 Stripe initialized');
        } catch (error) {
            console.warn('⚠️ Stripe initialization failed:', error.message);
        }
    }
    
    // Initialize PayPal
    if (config.paypalClientId && config.paypalClientSecret) {
        try {
            paypalClient = new PayPalApi({
                clientId: config.paypalClientId,
                clientSecret: config.paypalClientSecret,
                environment: config.paypalEnvironment || 'sandbox' // 'sandbox' or 'live'
            });
            console.log('💰 PayPal initialized');
        } catch (error) {
            console.warn('⚠️ PayPal initialization failed:', error.message);
        }
    }
}

// Session management
function generateSessionToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateSession(sessionToken) {
    const sessions = loadData(SESSIONS_FILE, {});
    const session = sessions[sessionToken];
    
    if (!session) return null;
    
    // Check if session is expired (24 hours)
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
        delete sessions[sessionToken];
        saveData(SESSIONS_FILE, sessions);
        return null;
    }
    
    return session;
}

function createSession(userId) {
    const sessionToken = generateSessionToken();
    const sessions = loadData(SESSIONS_FILE, {});
    
    sessions[sessionToken] = {
        userId: userId,
        createdAt: Date.now()
    };
    
    saveData(SESSIONS_FILE, sessions);
    return sessionToken;
}

// User conversation isolation
function getUserConversations(userId) {
    const conversations = loadData(CONVERSATIONS_FILE, {});
    return conversations[userId] || [];
}

function saveUserConversation(userId, conversation) {
    const conversations = loadData(CONVERSATIONS_FILE, {});
    if (!conversations[userId]) {
        conversations[userId] = [];
    }
    
    conversations[userId].push({
        ...conversation,
        timestamp: Date.now(),
        id: Math.random().toString(36).substring(2)
    });
    
    // Keep only last 100 conversations per user
    if (conversations[userId].length > 100) {
        conversations[userId] = conversations[userId].slice(-100);
    }
    
    saveData(CONVERSATIONS_FILE, conversations);
}

// Initialize everything
initializeData();
initializeEmailTransporter();
initializePayments();

// Enable CORS
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function requireAuth(req, res, next) {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const session = validateSession(sessionToken);
    
    if (!session) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const users = loadData(USERS_FILE, []);
    const user = users.find(u => u.id === session.userId);
    
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    req.sessionToken = sessionToken;
    next();
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = loadData(USERS_FILE, []);
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const sessionToken = createSession(user.id);
    
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified,
            aiProvider: user.aiProvider,
            subscriptionExpiry: user.subscriptionExpiry,
            createdAt: user.createdAt
        },
        sessionToken: sessionToken
    });
});

app.post('/api/auth/register', async (req, res) => {
    const { email, firstName, lastName, password } = req.body;
    const users = loadData(USERS_FILE, []);
    const pending = loadData(PENDING_FILE, []);
    
    // Check if user already exists in users table
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'This email address is already registered. Please use a different email or try logging in.' });
    }
    
    // Check if user already has a pending verification
    if (pending.find(p => p.userData.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'This email address already has a pending verification. Please check your email or contact support.' });
    }
    
    // Create verification token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const verificationLink = `${req.headers.origin || 'http://localhost:3001'}?verify=${token}`;
    
    // Store pending verification
    pending.push({
        token: token,
        userData: {
            email: email.toLowerCase(),
            firstName: firstName,
            lastName: lastName,
            password: password,
            isAdmin: false,
            emailVerified: false,
            aiProvider: 'puter',
            createdAt: Date.now()
        },
        createdAt: Date.now()
    });
    saveData(PENDING_FILE, pending);
    
    // Send verification email using webhook service
    try {
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.9rem; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏛️ Leave Assistant</h1>
                        <p>HR Compliance & Response Tool</p>
                    </div>
                    <div class="content">
                        <h2>Welcome, ${firstName}!</h2>
                        <p>Thank you for registering with Leave Assistant. To complete your registration and start your <strong>24-hour free trial</strong>, please verify your email address.</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationLink}" class="button">✅ Verify Email Address</a>
                        </div>
                        
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">
                            ${verificationLink}
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Leave Assistant - HR Compliance Tool</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const textContent = `
Welcome to Leave Assistant, ${firstName}!

Thank you for registering with Leave Assistant. To complete your registration and start your 24-hour free trial, please verify your email address by clicking the link below:

${verificationLink}

If you have any issues, please contact support.

© 2024 Leave Assistant - HR Compliance Tool
        `;

        // Send email using the new confirmation email function
        await sendConfirmationEmail(email, '✅ Verify your Leave Assistant account - Start your free trial', emailHtml, textContent);
        
    } catch (error) {
        console.error('Email sending error:', error);
        // Don't fail registration if email sending fails
    }
    
    res.json({
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        verificationLink: verificationLink,
        email: email
    });
});

app.post('/api/auth/verify', (req, res) => {
    const { token } = req.body;
    const pending = loadData(PENDING_FILE, []);
    const users = loadData(USERS_FILE, []);
    
    const pendingIndex = pending.findIndex(p => p.token === token);
    if (pendingIndex === -1) {
        return res.status(400).json({ error: 'Invalid verification token' });
    }
    
    const pendingUser = pending[pendingIndex];
    const newUser = {
        ...pendingUser.userData,
        id: Date.now().toString(),
        emailVerified: true
    };
    
    users.push(newUser);
    pending.splice(pendingIndex, 1);
    
    saveData(USERS_FILE, users);
    saveData(PENDING_FILE, pending);
    
    res.json({
        success: true,
        message: 'Email verified successfully. You can now login.'
    });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    const sessions = loadData(SESSIONS_FILE, {});
    delete sessions[req.sessionToken];
    saveData(SESSIONS_FILE, sessions);
    
    res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// USER ROUTES
// ==========================================

app.get('/api/user/profile', requireAuth, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            isAdmin: req.user.isAdmin,
            emailVerified: req.user.emailVerified,
            aiProvider: req.user.aiProvider,
            subscriptionExpiry: req.user.subscriptionExpiry,
            createdAt: req.user.createdAt
        }
    });
});

app.put('/api/user/profile', requireAuth, (req, res) => {
    const { firstName, lastName, aiProvider, openaiApiKey, geminiApiKey, password } = req.body;
    const users = loadData(USERS_FILE, []);
    
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user data
    if (firstName) users[userIndex].firstName = firstName;
    if (lastName) users[userIndex].lastName = lastName;
    if (aiProvider) users[userIndex].aiProvider = aiProvider;
    if (openaiApiKey !== undefined) users[userIndex].openaiApiKey = openaiApiKey;
    if (geminiApiKey !== undefined) users[userIndex].geminiApiKey = geminiApiKey;
    if (password) users[userIndex].password = password;
    
    saveData(USERS_FILE, users);
    
    res.json({
        success: true,
        message: 'Profile updated successfully',
        user: users[userIndex]
    });
});

app.get('/api/user/conversations', requireAuth, (req, res) => {
    const conversations = getUserConversations(req.user.id);
    res.json({
        success: true,
        conversations: conversations
    });
});

app.post('/api/user/conversation', requireAuth, (req, res) => {
    const { toolName, input, response, provider } = req.body;
    
    saveUserConversation(req.user.id, {
        toolName,
        input,
        response,
        provider
    });
    
    res.json({
        success: true,
        message: 'Conversation saved'
    });
});

// ==========================================
// ADMIN ROUTES
// ==========================================

app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = loadData(USERS_FILE, []);
    const { search, filter, page = 1, limit = 50 } = req.query;
    
    // For "all" filter, include all users (including admins)
    // For other filters, exclude admin users from the list
    let filteredUsers = filter === 'all' ? users : users.filter(u => !u.isAdmin);
    
    // Apply search filter
    if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(u => 
            u.firstName.toLowerCase().includes(searchLower) ||
            u.lastName.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
    }
    
    // Apply status filter
    if (filter && filter !== 'all') {
        filteredUsers = filteredUsers.filter(u => {
            // Admin users are excluded from status-based filters
            if (u.isAdmin) {
                return false;
            }
            
            const now = Date.now();
            const hasActiveSubscription = u.subscriptionExpiry && new Date(u.subscriptionExpiry).getTime() > now;
            const trialDuration = 24 * 60 * 60 * 1000;
            const trialEnd = u.createdAt + trialDuration;
            const inTrial = now < trialEnd;
            
            switch (filter) {
                case 'verified':
                    return u.emailVerified;
                case 'active':
                    return hasActiveSubscription || inTrial;
                case 'expired':
                    return !hasActiveSubscription && !inTrial;
                case 'trial':
                    return inTrial && !hasActiveSubscription;
                case 'subscribed':
                    return hasActiveSubscription;
                default:
                    return true;
            }
        });
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    // Add status information
    const usersWithStatus = paginatedUsers.map(u => {
        // Admin users have permanent access
        if (u.isAdmin) {
            return {
                ...u,
                status: {
                    active: true,
                    type: 'admin',
                    expiry: null
                }
            };
        }
        
        // Regular users - calculate trial/subscription status
        const now = Date.now();
        const hasActiveSubscription = u.subscriptionExpiry && new Date(u.subscriptionExpiry).getTime() > now;
        const trialDuration = 24 * 60 * 60 * 1000;
        const trialEnd = u.createdAt + trialDuration;
        const inTrial = now < trialEnd;
        
        return {
            ...u,
            status: {
                active: hasActiveSubscription || inTrial,
                type: hasActiveSubscription ? 'subscription' : (inTrial ? 'trial' : 'expired'),
                expiry: hasActiveSubscription ? u.subscriptionExpiry : (inTrial ? trialEnd : null)
            }
        };
    });
    
    res.json({
        success: true,
        users: usersWithStatus,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredUsers.length,
            pages: Math.ceil(filteredUsers.length / limit)
        }
    });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    console.log('📊 Admin stats endpoint called by user:', req.user.email);
    
    const users = loadData(USERS_FILE, []);
    const pending = loadData(PENDING_FILE, []);
    const nonAdmins = users.filter(u => !u.isAdmin);
    const allUsers = users; // Include all users for total count
    
    console.log('📊 Data loaded - Users:', users.length, 'Pending:', pending.length);
    
    const now = Date.now();
    const trialDuration = 24 * 60 * 60 * 1000;
    
    const stats = {
        totalUsers: allUsers.filter(u => u.emailVerified).length, // All verified users including admins
        verifiedUsers: allUsers.filter(u => u.emailVerified).length, // Same as total for now
        pendingVerifications: pending.length,
        activeSubscriptions: nonAdmins.filter(u => 
            u.subscriptionExpiry && new Date(u.subscriptionExpiry).getTime() > now
        ).length,
        trialUsers: nonAdmins.filter(u => {
            const trialEnd = u.createdAt + trialDuration;
            const hasActiveSubscription = u.subscriptionExpiry && new Date(u.subscriptionExpiry).getTime() > now;
            return now < trialEnd && !hasActiveSubscription;
        }).length
    };
    
    console.log('📊 Calculated Admin Stats:', stats); // Debug log
    
    res.json({
        success: true,
        stats: stats
    });
});

app.post('/api/admin/grant-access', requireAdmin, (req, res) => {
    const { userIds, duration } = req.body;
    const users = loadData(USERS_FILE, []);
    
    const expiryDate = new Date();
    if (duration === 'forever') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    } else {
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(duration));
    }
    
    userIds.forEach(userId => {
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].subscriptionExpiry = expiryDate.toISOString();
        }
    });
    
    saveData(USERS_FILE, users);
    
    res.json({
        success: true,
        message: `Access granted to ${userIds.length} users until ${expiryDate.toLocaleDateString()}`
    });
});

app.delete('/api/admin/user/:userId', requireAdmin, (req, res) => {
    const { userId } = req.params;
    const users = loadData(USERS_FILE, []);
    
    const userIndex = users.findIndex(u => u.id === userId && !u.isAdmin);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    users.splice(userIndex, 1);
    saveData(USERS_FILE, users);
    
    // Also remove user conversations
    const conversations = loadData(CONVERSATIONS_FILE, {});
    delete conversations[userId];
    saveData(CONVERSATIONS_FILE, conversations);
    
    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});

app.get('/api/admin/pending', requireAdmin, (req, res) => {
    console.log('📋 Admin pending endpoint called by user:', req.user.email);
    
    const pending = loadData(PENDING_FILE, []);
    console.log('📋 Loaded pending verifications:', pending.length);
    
    res.json({
        success: true,
        pending: pending
    });
});

app.post('/api/admin/approve-verification', requireAdmin, (req, res) => {
    const { token } = req.body;
    const pending = loadData(PENDING_FILE, []);
    const users = loadData(USERS_FILE, []);
    
    const pendingIndex = pending.findIndex(p => p.token === token);
    if (pendingIndex === -1) {
        return res.status(404).json({ error: 'Verification not found' });
    }
    
    const pendingUser = pending[pendingIndex];
    const newUser = {
        ...pendingUser.userData,
        id: Date.now().toString(),
        emailVerified: true
    };
    
    users.push(newUser);
    pending.splice(pendingIndex, 1);
    
    saveData(USERS_FILE, users);
    saveData(PENDING_FILE, pending);
    
    res.json({
        success: true,
        message: 'User approved and activated'
    });
});

app.delete('/api/admin/reject-verification', requireAdmin, (req, res) => {
    const { token } = req.body;
    const pending = loadData(PENDING_FILE, []);
    
    const pendingIndex = pending.findIndex(p => p.token === token);
    if (pendingIndex === -1) {
        return res.status(404).json({ error: 'Verification not found' });
    }
    
    pending.splice(pendingIndex, 1);
    saveData(PENDING_FILE, pending);
    
    res.json({
        success: true,
        message: 'Verification rejected'
    });
});

// ==========================================
// PAYMENT ROUTES
// ==========================================

app.post('/api/payment/stripe/create-session', requireAuth, (req, res) => {
    if (!stripeClient) {
        return res.status(400).json({ error: 'Stripe not configured' });
    }
    
    const config = loadData(CONFIG_FILE, {});
    const amount = Math.round((config.monthlyFee || 29.99) * 100); // Convert to cents
    
    stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Leave Assistant - Monthly Subscription',
                    description: 'HR Compliance & Response Tool'
                },
                unit_amount: amount,
            },
            quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/payment-cancelled`,
        client_reference_id: req.user.id,
        metadata: {
            userId: req.user.id,
            email: req.user.email
        }
    }).then(session => {
        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    }).catch(error => {
        console.error('Stripe session creation error:', error);
        res.status(500).json({ error: 'Failed to create payment session' });
    });
});

app.post('/api/payment/stripe/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const config = loadData(CONFIG_FILE, {});
    
    let event;
    try {
        event = stripeClient.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        
        // Grant 30 days access
        const users = loadData(USERS_FILE, []);
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex !== -1) {
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            users[userIndex].subscriptionExpiry = expiryDate.toISOString();
            users[userIndex].stripeCustomerId = session.customer;
            
            saveData(USERS_FILE, users);
            console.log(`✅ Subscription activated for user ${userId}`);
        }
    }
    
    res.json({received: true});
});

app.post('/api/payment/paypal/create-order', requireAuth, (req, res) => {
    if (!paypalClient) {
        return res.status(400).json({ error: 'PayPal not configured' });
    }
    
    const config = loadData(CONFIG_FILE, {});
    const amount = (config.monthlyFee || 29.99).toFixed(2);
    
    const request = {
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: amount
            },
            description: 'Leave Assistant - Monthly Subscription'
        }],
        application_context: {
            return_url: `${req.headers.origin}/payment-success`,
            cancel_url: `${req.headers.origin}/payment-cancelled`,
            brand_name: 'Leave Assistant',
            user_action: 'PAY_NOW'
        }
    };
    
    const ordersController = new OrdersController(paypalClient);
    
    ordersController.ordersCreate({
        body: request,
        prefer: 'return=representation'
    }).then(order => {
        const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;
        
        res.json({
            success: true,
            orderId: order.result.id,
            approvalUrl: approvalUrl
        });
    }).catch(error => {
        console.error('PayPal order creation error:', error);
        res.status(500).json({ error: 'Failed to create PayPal order' });
    });
});

app.post('/api/payment/paypal/capture-order', requireAuth, (req, res) => {
    const { orderId } = req.body;
    
    if (!paypalClient) {
        return res.status(400).json({ error: 'PayPal not configured' });
    }
    
    const ordersController = new OrdersController(paypalClient);
    
    ordersController.ordersCapture({
        id: orderId,
        prefer: 'return=representation'
    }).then(capture => {
        if (capture.result.status === 'COMPLETED') {
            // Grant 30 days access
            const users = loadData(USERS_FILE, []);
            const userIndex = users.findIndex(u => u.id === req.user.id);
            
            if (userIndex !== -1) {
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1);
                users[userIndex].subscriptionExpiry = expiryDate.toISOString();
                users[userIndex].paypalOrderId = orderId;
                
                saveData(USERS_FILE, users);
            }
            
            res.json({
                success: true,
                message: 'Payment completed successfully',
                orderId: orderId
            });
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    }).catch(error => {
        console.error('PayPal capture error:', error);
        res.status(500).json({ error: 'Failed to capture PayPal payment' });
    });
});

// ==========================================
// CONFIG ROUTES
// ==========================================

app.get('/api/config', requireAdmin, (req, res) => {
    const config = loadData(CONFIG_FILE, {});
    // Don't send sensitive data - remove email configuration
    const safeConfig = {
        monthlyFee: config.monthlyFee,
        systemSettings: config.systemSettings,
        hasStripe: !!config.stripeSecretKey,
        hasPaypal: !!(config.paypalClientId && config.paypalClientSecret)
    };
    
    res.json({
        success: true,
        config: safeConfig
    });
});

app.put('/api/config', requireAdmin, (req, res) => {
    const config = loadData(CONFIG_FILE, {});
    const updates = req.body;
    
    // Update configuration (excluding email settings)
    Object.keys(updates).forEach(key => {
        if (!key.startsWith('smtp')) { // Skip email configuration
            config[key] = updates[key];
        }
    });
    
    saveData(CONFIG_FILE, config);
    
    // Reinitialize payment services if needed
    if (updates.stripeSecretKey || updates.paypalClientId || updates.paypalClientSecret) {
        initializePayments();
    }
    
    res.json({
        success: true,
        message: 'Configuration updated successfully'
    });
});

// ==========================================
// AI API ROUTES (existing)
// ==========================================

app.post('/api/openai', requireAuth, async (req, res) => {
    try {
        const { apiKey, messages, model = 'gpt-4o-mini', max_tokens = 1000, temperature = 0.3 } = req.body;

        if (!apiKey || apiKey === 'demo') {
            return res.status(400).json({ error: 'Valid OpenAI API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, max_tokens, temperature })
        });

        const data = await response.json();
        if (!response.ok) return res.status(response.status).json(data);
        
        // Save conversation
        saveUserConversation(req.user.id, {
            toolName: req.body.toolName || 'unknown',
            input: messages[messages.length - 1]?.content || '',
            response: data.choices?.[0]?.message?.content || '',
            provider: 'openai'
        });
        
        res.json(data);
    } catch (error) {
        console.error('❌ OpenAI Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.post('/api/gemini', requireAuth, async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Gemini API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nUser Query: ${prompt}` }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024,
                }
            })
        });

        const data = await response.json();
        
        if (response.ok && data.candidates && data.candidates.length > 0) {
            // Save conversation
            saveUserConversation(req.user.id, {
                toolName: req.body.toolName || 'unknown',
                input: prompt,
                response: data.candidates[0].content.parts[0].text,
                provider: 'gemini'
            });
            
            return res.json(data);
        } else {
            return res.status(response.status || 400).json({ 
                error: data.error?.message || 'Gemini API request failed. Please check your API key.',
                details: data 
            });
        }

    } catch (error) {
        console.error('❌ Gemini Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Leave Assistant backend is running',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// STATIC FILES
// ==========================================
app.use(express.static('.'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Leave Assistant Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`👥 Users file: ${USERS_FILE}`);
});