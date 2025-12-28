const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost', 'http://localhost:80', 'http://localhost:3000', 'http://127.0.0.1'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// ==========================================
// API ROUTES (Must be defined BEFORE static files)
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

// Google Gemini API proxy (Fixes the 404 Error)
app.post('/api/gemini', async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Gemini API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        // Try different Gemini models in order of preference
        const models = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-pro',
            'gemini-1.0-pro'
        ];

        let lastError = null;
        
        for (const model of models) {
            try {
                // Gemini API URL format
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `${systemPrompt}\n\nUser Query: ${prompt}` }]
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024,
                        }
                    })
                });

                const data = await response.json();
                
                if (response.ok && data.candidates && data.candidates.length > 0) {
                    console.log(`✅ Gemini API success with model: ${model}`);
                    return res.json(data);
                } else if (data.error && data.error.message.includes('not found')) {
                    console.log(`⚠️ Model ${model} not available, trying next...`);
                    lastError = data.error;
                    continue;
                } else {
                    console.error(`❌ Gemini Error with ${model}:`, data);
                    return res.status(response.status).json(data);
                }
            } catch (modelError) {
                console.log(`⚠️ Error with model ${model}:`, modelError.message);
                lastError = modelError;
                continue;
            }
        }

        // If all models failed
        console.error('❌ All Gemini models failed:', lastError);
        return res.status(400).json({ 
            error: 'No available Gemini models found. Please check your API key or try again later.',
            details: lastError?.message || 'All models unavailable'
        });

    } catch (error) {
        console.error('❌ Gemini Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Subscription Payment Endpoint
app.post('/api/subscribe', (req, res) => {
    const { userId, paymentMethod, amount } = req.body;
    console.log(`💰 Processing payment: User ${userId} via ${paymentMethod} ($${amount})`);
    
    // Simulate payment success
    res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        transactionId: 'tx_' + Math.random().toString(36).substr(2, 9),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// ==========================================
// STATIC FILES (Defined LAST)
// ==========================================
app.use(express.static('.'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Leave Assistant Server running on http://localhost:${PORT}`);
});