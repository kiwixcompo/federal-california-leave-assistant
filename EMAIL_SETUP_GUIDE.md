# Email Setup Guide for HRLA Leave Assistant

## Quick Setup (5 minutes)

### Option 1: Gmail SMTP (Recommended - Free)

1. **Create a Gmail account** for your application:
   - Go to https://accounts.google.com/signup
   - Create account: `hrla.leaveassistant@gmail.com` (or your preferred name)

2. **Enable 2-Factor Authentication**:
   - Go to https://myaccount.google.com/security
   - Turn on 2-Step Verification

3. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (custom name)"
   - Enter "HRLA Leave Assistant"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

4. **Update server.js**:
   ```javascript
   // Find this line in server.js (around line 98):
   pass: process.env.EMAIL_PASS || 'your-16-char-app-password-here'
   
   // Replace with your actual App Password:
   pass: process.env.EMAIL_PASS || 'abcd efgh ijkl mnop'
   ```

5. **Restart the server**:
   ```bash
   # Stop the current server (Ctrl+C in the terminal)
   # Then restart:
   node server.js
   ```

6. **Look for success message**:
   ```
   ✅ Gmail SMTP connected successfully
   ✅ Ready to send real confirmation emails
   ```

### Option 2: Environment Variables (Production - Recommended)

Create a `.env` file in your project root:
```
EMAIL_USER=hrla.leaveassistant@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

Then install dotenv:
```bash
npm install dotenv
```

Add to the top of server.js:
```javascript
require('dotenv').config();
```

## Testing the Email System

1. **Start the server**: `node server.js`
2. **Look for**: `✅ Gmail SMTP connected successfully`
3. **Register a new user** on the website
4. **Check your email inbox** for the confirmation email
5. **If no email arrives**, check the server console for the verification link

## Current Status

The system is currently running in **development mode** which means:
- ✅ Email verification links are displayed in the server console
- ✅ Users can copy the verification link manually
- ⚠️ Real emails are not sent until you configure Gmail SMTP

## Troubleshooting

**"Gmail SMTP setup failed" or "Authentication failed"**:
- Make sure 2-factor authentication is enabled on your Gmail account
- Use the 16-character App Password, not your regular Gmail password
- Check that the email address matches the one that generated the App Password
- Ensure there are no extra spaces in the App Password

**"535 Authentication failed"**:
- Double-check the App Password (it should be 16 characters)
- Make sure you're using the Gmail account that generated the App Password
- Try generating a new App Password

**Still not working?**:
- The system will automatically fall back to console logging
- Check the server console for the verification link
- Copy the link manually to test user registration
- Users will see the verification link on the verification page

## Alternative Free Email Services

If Gmail doesn't work, you can use these alternatives:

1. **SendGrid** (100 emails/day free)
2. **Mailgun** (5,000 emails/month free)  
3. **AWS SES** (62,000 emails/month free)
4. **Resend** (3,000 emails/month free)

## Security Notes

- Never commit email credentials to Git
- Use environment variables in production
- Consider using a dedicated email service for high volume
- The App Password is specific to your application and can be revoked anytime