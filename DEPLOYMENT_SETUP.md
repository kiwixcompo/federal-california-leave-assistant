# 🚀 HR Leave Assistant - Deployment Setup Guide (Optimized)

This guide will help you set up automatic deployment from GitHub to your web hosting server with optimizations to prevent timeouts and improve reliability.

## 📋 Overview

The deployment system automatically updates your website whenever you push changes to the GitHub repository. It works by:

1. **GitHub Webhook** → Triggers deployment when code is pushed
2. **Deploy Script** → Downloads and extracts the latest code
3. **File Replacement** → Updates your website with new files

## 🛠 Prerequisites

- Web hosting with PHP 7.0+ support
- ZipArchive PHP extension enabled
- Write permissions on your hosting directory
- GitHub repository access

## 📁 Step 1: Upload Deployment Files

Upload these files to your web hosting root directory:

1. **`deploy.php`** - Main deployment script (optimized for shared hosting)
2. **`test-deploy.php`** - Environment testing script

## 🧪 Step 2: Test Your Environment

Before setting up deployment, test if your server can handle it:

1. Visit: `https://hrleaveassist.com/test-deploy.php`
2. Check that all tests pass (especially ZipArchive and write permissions)
3. If tests fail, contact your hosting provider

## ⚙️ Step 3: Configure GitHub Webhook

1. Go to your GitHub repository: `https://github.com/kiwixcompo/federal-california-leave-assistant`
2. Click **Settings** → **Webhooks** → **Add webhook**
3. Configure the webhook:
   - **Payload URL**: `https://hrleaveassist.com/deploy.php`
   - **Content type**: `application/json`
   - **Secret**: `HRLeaveAssist2026SecureKey!@#$%`
   - **Events**: Select "Just the push event"
   - **Active**: ✅ Checked

## 🔧 Step 4: Test Manual Deployment

Before relying on automatic deployment, test manually:

1. Visit: `https://hrleaveassist.com/deploy.php?manual=true`
2. Watch the deployment process in real-time
3. Check for any errors in the log
4. Verify your website updates correctly

## 🚨 Troubleshooting

### Timeout Issues
If deployment times out:
- The script is optimized with progress updates to prevent timeouts
- Shared hosting typically has 30-300 second limits
- Large repositories may need multiple attempts

### Common Issues

**"ZipArchive not available"**
- Contact your hosting provider to enable the ZIP extension
- This is required for extracting downloaded files

**"Cannot write to directory"**
- Check file permissions (should be 755 or 775)
- Ensure your hosting account has write access

**"Failed to download from GitHub"**
- Check internet connectivity from your server
- Verify the repository URL is correct
- GitHub API may have rate limits

**"Deployment successful but website not updated"**
- Wait 2-3 minutes for file system changes to propagate
- Clear any caching (browser, CDN, hosting)
- Check if files were actually copied

### Performance Optimizations

The deployment script includes several optimizations:

1. **Timeout Prevention**: Regular progress updates prevent server timeouts
2. **Memory Management**: Optimized file operations for shared hosting
3. **Selective File Copying**: Skips unnecessary files (node_modules, .git, etc.)
4. **Cleanup**: Automatic removal of temporary files
5. **Progress Feedback**: Real-time status updates during manual deployment

## 📊 Monitoring Deployments

### View Deployment Logs
- Check `deploy.log` file on your server
- Manual deployment page shows recent log entries
- Logs include timestamps, errors, and success messages

### Webhook Status
- GitHub webhook page shows delivery history
- Green checkmarks = successful deployments
- Red X marks = failed deployments (check logs)

## 🔒 Security Features

- **Webhook signature verification** prevents unauthorized deployments
- **IP filtering** (optional) restricts access to GitHub IPs
- **Branch filtering** only deploys from main branch
- **File exclusions** prevents overwriting sensitive files

## 🎯 Best Practices

1. **Test First**: Always test manual deployment before relying on webhooks
2. **Monitor Logs**: Check deployment logs regularly for issues
3. **Backup Strategy**: The script creates automatic backups before deployment
4. **Staging Environment**: Consider testing changes on a staging site first
5. **File Permissions**: Ensure proper permissions after deployment

## 📞 Support

If you encounter issues:

1. Check the test script results: `test-deploy.php`
2. Review deployment logs: `deploy.log`
3. Verify GitHub webhook delivery status
4. Contact your hosting provider for server-specific issues

## 🔄 Manual Deployment

You can always trigger deployment manually:
- Visit: `https://hrleaveassist.com/deploy.php?manual=true`
- Useful for testing or when webhooks fail
- Provides real-time progress feedback

---

**✅ Once setup is complete, your website will automatically update whenever you push changes to GitHub!**