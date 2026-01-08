# GitHub Auto-Deployment Setup Guide

This guide will help you set up automatic deployment from your GitHub repository to your hrleaveassist.com website using webhooks and PHP.

## ✅ System Status

The GitHub auto-deployment system has been successfully implemented with the following features:

- ✅ PHP-based deployment script (`deploy.php`)
- ✅ GitHub webhook integration
- ✅ Manual deployment interface
- ✅ Signature verification support
- ✅ Branch filtering (only main/master)
- ✅ GitHub API-based file download
- ✅ Automatic backup system
- ✅ Comprehensive error handling
- ✅ Deployment logging

## Prerequisites

1. Your project is on GitHub: `https://github.com/kiwixcompo/federal-california-leave-assistant`
2. Your website is hosted on hrleaveassist.com (Namecheap hosting)
3. PHP is available on your hosting (shared hosting compatible)
4. You have FTP/cPanel access to upload files

## Step 1: Upload Deployment Script

1. **Upload the `deploy.php` file** to your website's root directory (public_html or www)
2. **Set proper permissions**: Make sure the file is readable (644 or 755)
3. **Test manual deployment**: Visit `https://hrleaveassist.com/deploy.php?manual=true`

## Step 2: Configure GitHub Webhook

1. Go to your GitHub repository: `https://github.com/kiwixcompo/federal-california-leave-assistant`
2. Click on **Settings** tab
3. Click on **Webhooks** in the left sidebar
4. Click **Add webhook** button
5. Fill in the webhook form:
   - **Payload URL**: `https://hrleaveassist.com/deploy.php`
   - **Content type**: `application/json`
   - **Secret**: `HRLeaveAssist2026SecureKey!@#$%` (matches the secret in deploy.php)
   - **Which events**: Select "Just the push event"
   - **Active**: Make sure it's checked
6. Click **Add webhook**

## Step 3: Test the Setup

### Manual Testing:
1. Visit `https://hrleaveassist.com/deploy.php?manual=true`
2. You should see a deployment interface
3. The script will download and extract the latest code from GitHub
4. Check the deployment log for any errors

### Webhook Testing:
1. Make a small change to your repository (like updating README.txt)
2. Commit and push to the main branch
3. Check GitHub webhook deliveries in repository settings
4. Visit your website to see if changes are applied

## How It Works

### PHP Deployment Process:
1. **Webhook Trigger**: GitHub sends POST request to `deploy.php`
2. **Security Check**: Verifies webhook signature using secret key
3. **Branch Filter**: Only processes pushes to main branch
4. **Backup Creation**: Creates backup of current files
5. **Download**: Downloads latest code as ZIP from GitHub API
6. **Extract**: Extracts ZIP to temporary directory
7. **Copy Files**: Copies new files to website directory
8. **Cleanup**: Removes temporary files
9. **Logging**: Records all activities in `deploy.log`

### File Structure After Deployment:
```
hrleaveassist.com/
├── deploy.php          (deployment script)
├── deploy.log          (deployment logs)
├── backups/            (automatic backups)
├── index.html          (your app)
├── app.js              (your app)
├── server.js           (your app)
├── styles.css          (your app)
├── data/               (user data - preserved)
└── ... (other app files)
```

## Email Configuration

Since you want emails to come from `noreply@hrleaveassist.com`, you'll need to:

1. **Create the email account** in your Namecheap cPanel
2. **Update server.js** with your email credentials:
   ```javascript
   // In server.js, update the email configuration
   emailTransporter = nodemailer.createTransporter({
       host: 'mail.hrleaveassist.com', // Your domain's mail server
       port: 587,
       secure: false,
       auth: {
           user: 'noreply@hrleaveassist.com',
           pass: 'your-email-password'
       }
   });
   ```

## Security Features

- **Webhook Signature Verification**: Uses HMAC-SHA256 to verify requests from GitHub
- **Branch Filtering**: Only deploys from main branch
- **IP Filtering**: Can be configured to only accept requests from GitHub IPs
- **Backup System**: Automatically creates backups before deployment
- **Error Logging**: All activities are logged for debugging

## Monitoring and Maintenance

### Check Deployment Status:
- **Manual Interface**: `https://hrleaveassist.com/deploy.php?manual=true`
- **Log File**: Check `deploy.log` for detailed information
- **GitHub Webhooks**: Check delivery status in repository settings

### Backup Management:
- Backups are stored in `/backups/` directory
- Only last 10 backups are kept automatically
- Each backup includes timestamp and file count

### Troubleshooting:

#### Webhook Not Triggering:
1. Check GitHub webhook delivery logs
2. Verify webhook URL is correct: `https://hrleaveassist.com/deploy.php`
3. Ensure webhook secret matches: `HRLeaveAssist2026SecureKey!@#$%`
4. Check server logs for PHP errors

#### Deployment Fails:
1. Visit manual deployment page for detailed error messages
2. Check `deploy.log` file
3. Verify file permissions (deploy.php should be executable)
4. Ensure ZipArchive PHP extension is available

#### Files Not Updating:
1. Check if deployment completed successfully
2. Clear browser cache
3. Verify file permissions on uploaded files
4. Check if .htaccess rules are blocking access

## Advanced Configuration

### Custom Secret Key:
Edit `deploy.php` and change the secret key:
```php
'secret_key' => 'YourCustomSecretKey123!@#',
```
Then update the GitHub webhook with the same secret.

### Email Notifications:
Add email notifications to the deployment script by integrating with your email system.

### Multiple Environments:
Create separate deployment scripts for different environments:
- `deploy-staging.php` for staging branch
- `deploy-production.php` for main branch

## Production Checklist

- [ ] `deploy.php` uploaded to website root
- [ ] GitHub webhook configured with correct URL
- [ ] Webhook secret matches between GitHub and deploy.php
- [ ] Manual deployment tested successfully
- [ ] Webhook deployment tested with real commit
- [ ] Email account `noreply@hrleaveassist.com` created
- [ ] Server.js updated with correct email credentials
- [ ] File permissions set correctly
- [ ] Backup directory is writable
- [ ] SSL certificate is active (HTTPS)

## Support Commands

### Test Manual Deployment:
```
https://hrleaveassist.com/deploy.php?manual=true
```

### Check Deployment Logs:
Access via FTP or cPanel file manager: `/deploy.log`

### GitHub Webhook URL:
```
https://hrleaveassist.com/deploy.php
```

---

**Repository**: https://github.com/kiwixcompo/federal-california-leave-assistant.git  
**Domain**: https://hrleaveassist.com  
**Email**: noreply@hrleaveassist.com