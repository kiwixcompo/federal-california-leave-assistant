HRLA Leave Assistant - Payment Settings Fix

STATUS: ✅ PAYMENT SETTINGS ERROR FIXED!

ISSUE RESOLVED:
❌ **Previous Error**: "Cannot read properties of null (reading 'value')" when saving payment settings
✅ **Root Cause**: Function was trying to access form elements that didn't exist in HTML
✅ **Solution**: Updated handlePaymentConfig function to match actual form elements

FIXES APPLIED:

1. ✅ **Updated handlePaymentConfig Function**
   - Added null checking for all form elements
   - Updated to use correct element IDs from HTML
   - Removed references to non-existent email configuration fields
   - Added proper error handling

2. ✅ **Fixed Form Element Mapping**
   - adminMonthlyFee ✅ (exists)
   - adminPaypalClientId ✅ (exists) 
   - adminPaypalClientSecret ✅ (exists)
   - adminStripeSecretKey ✅ (exists)
   - adminStripeWebhookSecret ✅ (exists)
   - adminSystemGeminiKey ✅ (exists)
   - Removed: adminPaypalEmail, adminStripeKey, adminSmtp* (don't exist)

3. ✅ **Enhanced Configuration Loading**
   - Updated loadAdminConfig to populate all payment form fields
   - Added null checking for all form elements
   - Proper default values for empty fields

4. ✅ **Server Integration**
   - Updated updateServerPaymentConfig function
   - Uses correct /api/config PUT endpoint
   - Proper authentication with session token
   - Error handling for server communication

PAYMENT FORM ELEMENTS NOW WORKING:
✅ Monthly Subscription Fee
✅ PayPal Client ID  
✅ PayPal Client Secret
✅ Stripe Secret Key
✅ Stripe Webhook Secret
✅ System Gemini API Key

TESTING:
1. Go to Admin Dashboard → Payment Settings tab
2. Fill in payment configuration fields
3. Click "Save Payment Settings"
4. Should show "Payment settings saved successfully" message
5. No more console errors

The payment settings form now works correctly without any null reference errors!