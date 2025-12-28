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

// Hugging Face API proxy (Free tier available)
app.post('/api/huggingface', async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt, model = 'microsoft/DialoGPT-medium' } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Hugging Face API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        console.log(`🤖 Attempting Hugging Face API call with ${model}...`);
        const url = `https://api-inference.huggingface.co/models/${model}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                inputs: `${systemPrompt}\n\nUser: ${prompt}\nAssistant:`,
                parameters: {
                    max_new_tokens: 512,
                    temperature: 0.3,
                    return_full_text: false
                }
            })
        });

        const data = await response.json();
        
        if (response.ok && data && data[0]?.generated_text) {
            console.log('✅ Hugging Face API success');
            return res.json({ 
                choices: [{ message: { content: data[0].generated_text.trim() } }] 
            });
        } else {
            console.error('❌ Hugging Face API error:', data);
            return res.status(response.status || 400).json({ 
                error: data.error || 'Hugging Face API request failed',
                details: data 
            });
        }

    } catch (error) {
        console.error('❌ Hugging Face Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Cohere API proxy (Free tier available)
app.post('/api/cohere', async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Cohere API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        console.log('🤖 Attempting Cohere API call...');
        const url = 'https://api.cohere.ai/v1/generate';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: 'command-light',
                prompt: `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`,
                max_tokens: 512,
                temperature: 0.3,
                stop_sequences: ['\n\nUser:', '\nUser:']
            })
        });

        const data = await response.json();
        
        if (response.ok && data.generations && data.generations[0]?.text) {
            console.log('✅ Cohere API success');
            return res.json({ 
                choices: [{ message: { content: data.generations[0].text.trim() } }] 
            });
        } else {
            console.error('❌ Cohere API error:', data);
            return res.status(response.status || 400).json({ 
                error: data.message || 'Cohere API request failed',
                details: data 
            });
        }

    } catch (error) {
        console.error('❌ Cohere Server Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Anthropic Claude API proxy (Has free tier)
app.post('/api/anthropic', async (req, res) => {
    try {
        const { apiKey, prompt, systemPrompt } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'Valid Anthropic API key required.' });
        }

        const fetch = (await import('node-fetch')).default;

        console.log('🤖 Attempting Anthropic Claude API call...');
        const url = 'https://api.anthropic.com/v1/messages';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 512,
                messages: [
                    { role: 'user', content: `${systemPrompt}\n\nUser Query: ${prompt}` }
                ]
            })
        });

        const data = await response.json();
        
        if (response.ok && data.content && data.content[0]?.text) {
            console.log('✅ Anthropic API success');
            return res.json({ 
                choices: [{ message: { content: data.content[0].text } }] 
            });
        } else {
            console.error('❌ Anthropic API error:', data);
            return res.status(response.status || 400).json({ 
                error: data.error?.message || 'Anthropic API request failed',
                details: data 
            });
        }

    } catch (error) {
        console.error('❌ Anthropic Server Error:', error);
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