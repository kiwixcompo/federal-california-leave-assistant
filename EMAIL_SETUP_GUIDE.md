# Email Setup Guide for HRLA Leave Assistant

## For Netlify Deployment (Client-Side Email)

### Option 1: EmailJS Setup (Recommended for Netlify)

1. **Create EmailJS Account**:
   - Go to https://www.emailjs.com/
   - Sign up for a free account (200 emails/month free)

2. **Create Email Service**:
   - Go to Email Services → Add New Service
   - Choose Gmail, Outlook, or your preferred email provider
   - Follow the setup instructions

3. **Create Email Template**:
   - Go to Email Templates → Create New Template
   - Use this template content:
   ```
   Subject: Verify your HRLA Leave Assistant account
   
   Hi {{to_name}},
   
   Thank you for registering with HRLA Leave Assistant!
   
   Please click the link below to verify your email address:
   {{verification_link}}
   
   If you didn't create this account, please ignore this email.
   
   Best regards,
   HRLA Leave Assistant Team
   ```

4. **Get Your Credentials**:
   - Public Key: Account → API Keys → Public Key
   - Service ID: Email Services → Your Service → Service ID
   - Template ID: Email Templates → Your Template → Template ID

5. **Update index.html**:
   ```javascript
   const EMAILJS_CONFIG = {
       publicKey: 'your_public_key_here',
       serviceId: 'your_service_id_here', 
       templateId: 'your_template_id_here'
   };
   ```

### Option 2: Server Deployment (Full Email Support)

For full email functionality, deploy the Node.js server to:
- **Heroku** (free tier available)
- **Railway** (free tier available)
- **Render** (free tier available)
- **Vercel** (serverless functions)

Then update the API base URL in app.js to point to your deployed server.

## Current Status

**Netlify Deployment**: 
- ✅ Client-side registration and verification
- ✅ Verification links displayed directly to users
- ✅ Admin dashboard works with localStorage
- ⚠️ Email sending requires EmailJS setup

**Server Deployment**:
- ✅ Full email functionality with SMTP
- ✅ Real-time database storage
- ✅ Complete admin features

## Testing on Netlify

1. Register a new user
2. Verification link will be shown on the verification page
3. Click the verification link to verify the account
4. Login with the verified account
5. Admin can see users in the admin dashboard

## Production Recommendations

For production use:
1. Deploy the Node.js server to a hosting service
2. Set up proper SMTP email service
3. Use environment variables for sensitive data
4. Enable HTTPS for security