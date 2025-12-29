const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes (Allows requests from Port 80)
app.use(cors({
    origin: '*', // Allow all for development convenience
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

        // Use v1beta with gemini-pro (most stable combination)
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
    console.log(`💰 Processing payment: User ${userId} via ${paymentMethod} ($${amount})`);
    res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        transactionId: 'tx_' + Math.random().toString(36).substr(2, 9),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Leave Assistant backend is running' });
});

// Email verification endpoint (simulated)
app.post('/api/send-verification', (req, res) => {
    const { email, token, firstName, verificationLink } = req.body;
    
    // In a real app, you would integrate with an email service like:
    // - SendGrid, Mailgun, AWS SES, etc.
    // For now, we'll simulate the email sending
    
    console.log(`📧 Verification Email Sent to: ${email}`);
    console.log(`🔗 Verification Link: ${verificationLink || `${req.headers.origin || 'http://localhost'}?verify=${token}`}`);
    console.log(`👤 User: ${firstName}`);
    
    // Simulate email content
    const emailContent = `
    Hi ${firstName},
    
    Thank you for registering with Leave Assistant!
    
    Please click the link below to verify your email address:
    ${verificationLink || `${req.headers.origin || 'http://localhost'}?verify=${token}`}
    
    This link will expire in 24 hours.
    
    If you didn't create this account, please ignore this email.
    
    Best regards,
    Leave Assistant Team
    `;
    
    console.log('📄 Email Content:', emailContent);
    
    // Simulate email sending delay
    setTimeout(() => {
        res.json({ 
            success: true, 
            message: 'Verification email sent successfully',
            verificationLink: verificationLink || `${req.headers.origin || 'http://localhost'}?verify=${token}`,
            emailContent: emailContent
        });
    }, 500);
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