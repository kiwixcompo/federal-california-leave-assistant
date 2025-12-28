# 🤖 Multi-LLM Provider Integration Guide

## ✅ **Supported AI Providers**

### 1. **OpenAI GPT** (Premium)
- **API Key Format**: `sk-...`
- **Models**: GPT-4o-mini (fast & cost-effective)
- **Get Key**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Cost**: Pay-per-use

### 2. **Google Gemini** (Free Tier Available)
- **API Key Format**: `AIza...`
- **Models**: gemini-pro (stable & reliable)
- **Get Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Free Tier**: 60 requests/minute

### 3. **Hugging Face** (Free Tier Available)
- **API Key Format**: `hf_...`
- **Models**: DialoGPT-medium (conversational AI)
- **Get Key**: [Hugging Face Hub](https://huggingface.co/settings/tokens)
- **Free Tier**: Rate-limited but generous

### 4. **Cohere** (Free Tier Available)
- **API Key Format**: Various formats
- **Models**: command-light (fast responses)
- **Get Key**: [Cohere Dashboard](https://dashboard.cohere.ai/api-keys)
- **Free Tier**: 100 calls/month

### 5. **Anthropic Claude** (Free Tier Available)
- **API Key Format**: `sk-ant-...`
- **Models**: claude-3-haiku (fast & efficient)
- **Get Key**: [Anthropic Console](https://console.anthropic.com/)
- **Free Tier**: Limited monthly usage

### 6. **Demo Mode**
- No API key required
- Returns mock responses for testing
- Perfect for development and demos

## 🚀 **How It Works**

1. **Auto-Detection**: The app automatically detects which provider to use based on your API keys
2. **Seamless Switching**: Add multiple keys and the app will use the best available option
3. **Fallback Support**: If one provider fails, you can easily switch to another
4. **Free Testing**: Use free-tier providers to test the app without costs

## 📝 **Setup Instructions**

1. Go to **Settings** in the app
2. Select your preferred **AI Provider**
3. Enter your **API Key** for that provider
4. The app will automatically use that provider for responses

## 💡 **Pro Tips**

- **For Testing**: Use Gemini (free 60 requests/minute)
- **For Production**: Use OpenAI GPT (best quality)
- **For Budget**: Use Hugging Face or Cohere (free tiers)
- **For Privacy**: Use Anthropic Claude (privacy-focused)

## 🔧 **Troubleshooting**

- **"No API key found"**: Add at least one valid API key in Settings
- **"Connection Error"**: Ensure the server is running (`node server.js`)
- **"Invalid key format"**: Check the key format matches the provider requirements
- **"Quota exceeded"**: Switch to a different provider or wait for quota reset

All providers are integrated seamlessly - just add your keys and start using!