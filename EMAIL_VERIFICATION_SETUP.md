# Email Verification Setup Guide

This guide explains how to configure email verification for the GANSID LMS to work correctly in both development and production environments.

## 🎯 Overview

The authentication system now includes:
- ✅ Email verification for new signups
- ✅ Password reset via email
- ✅ Proper redirect URLs for production (https://gansid-lms.netlify.app)
- ✅ Auth callback route for handling email confirmations
- ✅ Improved user experience with clear messaging

---

## 🚀 Quick Setup

### 1. Configure Environment Variables

Add the site URL to your environment variables:

**Local Development** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Production** (Netlify Environment Variables):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://gansid-lms.netlify.app
```

### 2. Configure Supabase Email Settings

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set the **Site URL** to: `https://gansid-lms.netlify.app`
4. Add to **Redirect URLs**:
   - `https://gansid-lms.netlify.app/auth/callback`
   - `https://gansid-lms.netlify.app/reset-password`
   - `http://localhost:3000/auth/callback` (for development)
   - `http://localhost:3000/reset-password` (for development)

### 3. Customize Email Templates (Optional but Recommended)

Go to **Authentication** → **Email Templates** and customize:

**We've created beautiful, modern templates for you!** Check the `email-templates/` folder for:
- `confirm-signup.html` - Email verification
- `reset-password.html` - Password reset
- `invite-user.html` - User invitations

See `email-templates/EMAIL_TEMPLATES_GUIDE.md` for detailed instructions.

#### Quick Setup:

1. Open the HTML file for the template you want to use
2. Copy the entire HTML code
3. Go to Supabase Dashboard → Authentication → Email Templates
4. Select the template type (Confirm signup / Reset password)
5. Paste the HTML into the editor
6. Click Save
7. Send yourself a test email

The templates feature:
- ✅ Modern gradient design matching GANSID theme
- ✅ Responsive (works on all devices)
- ✅ Professional layout with clear CTAs
- ✅ Security notices and helpful tips
- ✅ Tested on all major email clients

---

## 📋 How It Works

### Email Verification Flow

```
1. User signs up on /login
   ↓
2. Account created in auth.users
   ↓
3. Database trigger creates profile in users table
   ↓
4. Supabase sends verification email
   ↓
5. User clicks link in email
   ↓
6. Redirected to /auth/callback with code
   ↓
7. Code exchanged for session
   ↓
8. User profile verified
   ↓
9. Redirected to /login with success message
   ↓
10. User can now sign in
```

### Password Reset Flow

```
1. User clicks "Forgot Password?" on /login
   ↓
2. Enters email and submits
   ↓
3. Supabase sends password reset email
   ↓
4. User clicks link in email
   ↓
5. Redirected to /reset-password page
   ↓
6. User enters new password
   ↓
7. Password updated
   ↓
8. Redirected to /login
```

---

## 🔧 Configuration Details

### Auth Callback Route

**File**: `src/app/auth/callback/route.ts`

This route handles:
- Email verification confirmations
- Password reset redirects
- Error handling
- Profile verification
- Role-based redirects

**Features**:
- Exchanges verification code for session
- Verifies user profile exists
- Handles errors gracefully
- Provides clear error messages
- Redirects to appropriate pages

### Environment Variables

**`NEXT_PUBLIC_SITE_URL`**
- **Purpose**: Base URL for email redirect links
- **Development**: `http://localhost:3000`
- **Production**: `https://gansid-lms.netlify.app`
- **Used in**: 
  - Email verification redirects
  - Password reset redirects
  - OAuth callbacks (if added later)

---

## 🎨 User Experience Improvements

### 1. Clear Success Messages
After signup, users see:
- ✅ "Account created successfully!"
- 📧 "Please check your email and click the verification link to activate your account."
- 💡 Reminder to check spam folder (shown after 2 seconds)

### 2. Verification Success
After clicking email link:
- ✅ "Email verified successfully!"
- ↪️ Automatically redirected to login page
- 📝 Can immediately sign in

### 3. Error Handling
If verification fails:
- ❌ Clear error message shown
- 📞 Instructions to contact support if needed
- 🔄 Can request new verification email

---

## 🧪 Testing

### Test Email Verification (Development)

1. Start local server: `npm run dev`
2. Navigate to: `http://localhost:3000/login`
3. Sign up with a test email
4. Check email inbox for verification link
5. Click the link (should redirect to localhost callback)
6. Verify you're redirected back to login with success message
7. Sign in with your credentials

### Test Email Verification (Production)

1. Deploy to Netlify
2. Navigate to: `https://gansid-lms.netlify.app/login`
3. Sign up with a real email address
4. Check email inbox
5. Click verification link
6. Should redirect to: `https://gansid-lms.netlify.app/login?verified=true`
7. See success message
8. Sign in

### Test Password Reset

1. Click "Forgot Password?" on login page
2. Enter email address
3. Check email for reset link
4. Click link
5. Enter new password
6. Submit
7. Verify redirect to login
8. Sign in with new password

---

## ⚙️ Netlify Configuration

### Environment Variables Setup

1. Go to Netlify Dashboard
2. Select your site
3. Navigate to: **Site configuration** → **Environment variables**
4. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = `[your supabase url]`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `[your anon key]`
   - `NEXT_PUBLIC_SITE_URL` = `https://gansid-lms.netlify.app`

### Verify Deployment

After deployment:
1. Check build logs for any errors
2. Test signup flow end-to-end
3. Verify email links use correct domain
4. Test password reset
5. Check error handling

---

## 🐛 Troubleshooting

### Issue: Email links still point to localhost

**Cause**: Environment variable not set or not deployed

**Fix**:
1. Verify `NEXT_PUBLIC_SITE_URL` is set in Netlify
2. Redeploy the site
3. Clear browser cache
4. Test signup again

---

### Issue: "Invalid redirect URL" error

**Cause**: Redirect URL not whitelisted in Supabase

**Fix**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to Redirect URLs:
   - `https://gansid-lms.netlify.app/auth/callback`
3. Save changes
4. Try verification again

---

### Issue: Email verification fails with error

**Cause**: Multiple possible reasons

**Diagnose**:
1. Check Supabase logs: Dashboard → Logs → Auth
2. Check browser console for errors
3. Verify callback route exists: `/src/app/auth/callback/route.ts`
4. Check if profile was created in users table

**Fix**:
- If profile missing, run trigger setup: `supabase-trigger-setup.sql`
- If code expired, request new verification email
- If persistent, check Supabase auth settings

---

### Issue: Users not receiving emails

**Cause**: Email configuration or spam filters

**Fix**:
1. Check Supabase email settings
2. Verify email templates are enabled
3. Check spam/junk folders
4. Consider custom SMTP (see below)

---

## 📧 Custom SMTP Configuration (Optional)

For better email deliverability, configure custom SMTP:

### 1. Choose Email Provider
Options:
- SendGrid (recommended)
- Amazon SES
- Mailgun
- Postmark
- Gmail (not recommended for production)

### 2. Configure in Supabase

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enable custom SMTP
3. Enter credentials:
   - Host
   - Port
   - Username
   - Password
   - Sender email
   - Sender name: "GANSID LMS"
4. Test configuration

### 3. Benefits
- Better deliverability
- Custom sender email (e.g., noreply@gansid.org)
- Professional appearance
- Detailed analytics
- Higher sending limits

---

## 🔐 Security Best Practices

### Email Security

1. **Enable Email Confirmation** (Already enabled)
   - Prevents unauthorized signups
   - Verifies email ownership

2. **Rate Limiting**
   - Supabase has built-in rate limits
   - Prevents email spam

3. **Token Expiration**
   - Verification tokens expire after 24 hours
   - Password reset tokens expire after 1 hour

4. **HTTPS Only**
   - All redirect URLs use HTTPS in production
   - Secure token exchange

### Monitoring

Monitor for:
- Failed verification attempts
- Unusual signup patterns
- High bounce rates
- Spam complaints

Check: Supabase Dashboard → Auth → Logs

---

## 📊 Email Template Variables

Available in email templates:

- `{{ .FullName }}` - User's full name
- `{{ .Email }}` - User's email address
- `{{ .ConfirmationURL }}` - Verification/reset link
- `{{ .Token }}` - Raw token (rarely needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

---

## ✅ Checklist

Before going live, verify:

- [ ] `NEXT_PUBLIC_SITE_URL` set in Netlify environment variables
- [ ] Supabase Site URL configured correctly
- [ ] Redirect URLs whitelisted in Supabase
- [ ] Email templates customized
- [ ] Email verification tested end-to-end
- [ ] Password reset tested
- [ ] Error messages are clear
- [ ] Emails delivered to inbox (not spam)
- [ ] Database trigger installed (`supabase-trigger-setup.sql`)
- [ ] Callback route deployed (`/auth/callback`)
- [ ] HTTPS enforced on all redirect URLs
- [ ] Custom SMTP configured (optional but recommended)

---

## 📚 Related Documentation

- `AUTHENTICATION_FIXES.md` - Technical auth system documentation
- `ADMIN_SETUP_GUIDE.md` - Admin account setup
- `IMPLEMENTATION_CHECKLIST.md` - Complete setup checklist
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## 🆘 Support

If you need help:

1. Check troubleshooting section above
2. Review Supabase auth logs
3. Check browser console for errors
4. Verify environment variables
5. Test in development first
6. Review email template syntax

---

## 🎯 Summary

**What's Configured**:
- ✅ Auth callback route at `/auth/callback`
- ✅ Environment variable for site URL
- ✅ Production URL in email redirects
- ✅ Email verification flow
- ✅ Password reset flow
- ✅ Error handling
- ✅ User feedback and messaging

**What You Need to Do**:
1. Set `NEXT_PUBLIC_SITE_URL` in Netlify env vars
2. Configure redirect URLs in Supabase
3. Test email verification flow
4. Optionally customize email templates
5. Optionally setup custom SMTP

---

**Last Updated**: January 17, 2026
**Version**: 2.1 (With Email Verification)
