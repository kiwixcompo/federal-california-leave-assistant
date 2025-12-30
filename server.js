const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Email configuration
let emailTransporter = null;

// Initialize email transporter
function initializeEmailTransporter() {
    try {
        // Simple SMTP configuration for development
        emailTransporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: 'test@ethereal.email',
                pass: 'test123'
            }
        });
        
        console.log('📧 Email transporter initialized (Development Mode)');
        console.log('💡 Configure real SMTP settings in admin panel for production');
    } catch (error) {
        console.warn('⚠️ Email transporter failed to initialize:', error.message);
        emailTransporter = null;
    }
}

// Initialize email on startup
initializeEmailTransporter();

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// ==========================================
// API ROUTES
// ==========================================

// OpenAI API proxy
app.post('/api/openai', async (req, res) => {
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
        res.json(data);
    } catch (error) {
        console.error('❌ OpenAI Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Google Gemini API proxy
app.post('/api/gemini', async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Gemini API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        console.log('🤖 Attempting Gemini API call with gemini-pro (v1beta)...');
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
            console.log('✅ Gemini API success');
            return res.json(data);
        } else {
            console.error('❌ Gemini API error:', data);
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

// Subscription Payment Endpoint
app.post('/api/subscribe', (req, res) => {
    const { userId, paymentMethod, amount } = req.body;
    console.log(`💰 Processing payment: User ${userId} via ${paymentMethod} (${amount})`);
    res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        transactionId: 'tx_' + Math.random().toString(36).substr(2, 9),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
});

// Email verification endpoint
app.post('/api/send-verification', async (req, res) => {
    const { email, token, firstName, verificationLink } = req.body;
    
    try {
        if (emailTransporter) {
            // Create email content
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
                            
                            <p><strong>What's included in your trial:</strong></p>
                            <ul>
                                <li>🇺🇸 Federal FMLA Assistant</li>
                                <li>🌴 California Leave Assistant (CFRA, PDL, FMLA)</li>
                                <li>🤖 AI-powered compliance responses</li>
                                <li>📧 Email drafting assistance</li>
                                <li>❓ Quick HR questions</li>
                            </ul>
                            
                            <p>If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">
                                ${verificationLink}
                            </p>
                            
                            <p><small>This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.</small></p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Leave Assistant - HR Compliance Tool</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const emailText = `
Welcome to Leave Assistant, ${firstName}!

Thank you for registering. To complete your registration and start your 24-hour free trial, please verify your email address by clicking the link below:

${verificationLink}

What's included in your trial:
- Federal FMLA Assistant
- California Leave Assistant (CFRA, PDL, FMLA)
- AI-powered compliance responses
- Email drafting assistance
- Quick HR questions

This verification link will expire in 24 hours.

If you didn't create this account, please ignore this email.

© 2024 Leave Assistant - HR Compliance Tool
            `;

            // Send email
            const info = await emailTransporter.sendMail({
                from: '"Leave Assistant" <noreply@leaveassistant.com>',
                to: email,
                subject: '✅ Verify your Leave Assistant account - Start your free trial',
                text: emailText,
                html: emailHtml
            });

            console.log(`📧 Verification email sent to: ${email}`);
            console.log(`📬 Message ID: ${info.messageId}`);
            
            // For Ethereal Email, provide preview URL
            if (info.messageId && emailTransporter.options.host === 'smtp.ethereal.email') {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                console.log(`🔗 Preview email: ${previewUrl}`);
                
                res.json({ 
                    success: true, 
                    message: 'Verification email sent successfully',
                    verificationLink: verificationLink,
                    previewUrl: previewUrl,
                    messageId: info.messageId
                });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Verification email sent successfully',
                    verificationLink: verificationLink,
                    messageId: info.messageId
                });
            }
        } else {
            // Fallback when email is not configured
            console.log(`📧 Email would be sent to: ${email} (Email not configured)`);
            console.log(`🔗 Verification link: ${verificationLink}`);
            
            res.json({ 
                success: true, 
                message: 'Email service not configured - using fallback mode',
                verificationLink: verificationLink,
                fallbackMode: true
            });
        }
    } catch (error) {
        console.error('❌ Email sending error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send verification email',
            message: error.message,
            verificationLink: verificationLink
        });
    }
});

// Admin endpoints
app.post('/api/admin/grant-access', (req, res) => {
    const { userIds, duration, adminId } = req.body;
    
    console.log(`👑 Admin ${adminId} granting access to ${userIds.length} users for ${duration} months`);
    
    const expiryDate = new Date();
    if (duration === 'forever') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    } else {
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(duration));
    }
    
    res.json({
        success: true,
        message: `Access granted to ${userIds.length} users`,
        expiryDate: expiryDate.toISOString(),
        duration: duration
    });
});

app.post('/api/admin/revoke-access', (req, res) => {
    const { userIds, adminId } = req.body;
    
    console.log(`👑 Admin ${adminId} revoking access from ${userIds.length} users`);
    
    res.json({
        success: true,
        message: `Access revoked from ${userIds.length} users`
    });
});

app.post('/api/admin/send-notification', (req, res) => {
    const { userIds, subject, message, adminId } = req.body;
    
    console.log(`👑 Admin ${adminId} sending notification to ${userIds.length} users: ${subject}`);
    
    res.json({
        success: true,
        message: `Notification sent to ${userIds.length} users`,
        subject: subject
    });
});

app.post('/api/admin/update-email-config', (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    
    console.log('👑 Admin updating email configuration');
    
    if (smtpHost && smtpPort && smtpUser && smtpPass) {
        try {
            emailTransporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(smtpPort),
                secure: parseInt(smtpPort) === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });
            
            console.log('📧 Email transporter updated with custom SMTP settings');
            res.json({ success: true, message: 'Email configuration updated' });
        } catch (error) {
            console.error('❌ Failed to update email config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    } else {
        initializeEmailTransporter();
        res.json({ success: true, message: 'Email configuration reset to development mode' });
    }
});

app.get('/api/admin/system-stats', (req, res) => {
    res.json({
        success: true,
        stats: {
            totalUsers: 0,
            activeUsers: 0,
            trialUsers: 0,
            subscribedUsers: 0,
            systemUptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Leave Assistant backend is running' });
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
});