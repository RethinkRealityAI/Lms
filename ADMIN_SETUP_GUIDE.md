# GANSID LMS - Admin Setup Guide

This guide will help you set up your first admin user in the GANSID Learning Management System.

## Prerequisites

- Access to your Supabase Dashboard
- Database tables created (run `schema.sql` first)
- **IMPORTANT**: Run `supabase-trigger-setup.sql` to enable automatic profile creation

## Quick Start (5 Minutes)

### Step 1: Install Database Trigger (CRITICAL)

Before creating any users, you MUST install the database trigger:

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase-trigger-setup.sql`
5. Click **Run**
6. Verify success (you should see "Success. No rows returned")

**Why is this needed?** The trigger automatically creates user profiles when accounts are created. Without it, users can sign up but won't be able to log in.

### Step 2: Create Admin Verification Code

Run this in Supabase SQL Editor:

```sql
INSERT INTO verification_codes (code, role, max_uses, expires_at)
VALUES (
  'ADMIN-2024-GANSID',  -- Change this to your desired code
  'admin',
  10,                    -- Maximum number of admin accounts
  NOW() + INTERVAL '365 days'
);
```

### Step 3: Create Your Admin Account

**Option A: Via Application (Recommended)**

1. Navigate to `/login` on your application
2. Click the "Sign Up" tab
3. Fill in the form:
   - **Full Name**: Your Name
   - **I am a**: Select "Instructor"
   - **Instructor Verification Code**: Enter the code from Step 2 (e.g., `ADMIN-2024-GANSID`)
   - **Email**: Your admin email
   - **Password**: Strong password (min 8 chars, uppercase, lowercase, number)
4. Click "Create Account"
5. If email confirmation is enabled, check your email and verify
6. Navigate to `/admin/login` and sign in

**Option B: Via Supabase Dashboard (Alternative)**

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter:
   - Email: `admin@yourdomain.com`
   - Password: `[Your secure password]`
   - Auto Confirm User: **YES** (important!)
4. Click **Create User**
5. The database trigger will automatically create the profile
6. Update the role to admin by running:
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'admin@yourdomain.com';
   ```
7. Navigate to `/admin/login` and sign in

### Step 4: Verify Admin Access

1. Go to `/admin/login`
2. Enter your admin credentials
3. You should be redirected to `/admin` (admin dashboard)
4. Verify you can see admin features

## Verification

Run this query to verify your admin account:

```sql
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.created_at,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.role = 'admin';
```

You should see your admin account with role = 'admin'.

## Troubleshooting

### Issue: "User profile not found" error when logging in

**Cause**: The database trigger wasn't installed before creating the account.

**Solution**:
1. Install the trigger (see Step 1 above)
2. Manually create the profile:
   ```sql
   INSERT INTO users (id, email, role, full_name)
   SELECT 
     id, 
     email, 
     'admin',
     COALESCE(raw_user_meta_data->>'full_name', 'Admin User')
   FROM auth.users 
   WHERE email = 'your-admin@email.com'
   ON CONFLICT (id) DO UPDATE 
   SET role = 'admin';
   ```

### Issue: Cannot access `/admin/login` - redirects to `/login`

**Cause**: Old browser cache or middleware not updated.

**Solution**:
1. Clear browser cache and cookies
2. Restart your Next.js development server
3. Try accessing `/admin/login` in an incognito window

### Issue: "Access Denied" when trying to log in as admin

**Cause**: User role is not set to 'admin' in the database.

**Solution**:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin@email.com';
```

### Issue: "Invalid verification code" during signup

**Cause**: Verification code doesn't exist or has expired.

**Solution**:
1. Check existing codes:
   ```sql
   SELECT * FROM verification_codes WHERE role = 'admin';
   ```
2. Create a new code (see Step 2 above)

## Creating Additional Admin Users

Once you have your first admin user, you can create additional admins:

### Method 1: Using Verification Codes (Recommended)

1. Create a new verification code (as admin in SQL Editor):
   ```sql
   INSERT INTO verification_codes (code, role, max_uses, expires_at)
   VALUES ('ADMIN-2024-NEW', 'admin', 5, NOW() + INTERVAL '90 days');
   ```
2. Share the code with the new admin
3. They sign up via `/login` → Sign Up tab → Select "Instructor"
4. They enter the verification code during signup

### Method 2: Manual Creation

1. Create the auth user in Supabase Dashboard
2. Run this SQL:
   ```sql
   INSERT INTO users (id, email, role, full_name)
   SELECT id, email, 'admin', 'New Admin Name'
   FROM auth.users 
   WHERE email = 'newadmin@email.com'
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

## Security Best Practices

1. **Strong Passwords**: Use passwords with:
   - Minimum 12 characters
   - Mix of uppercase and lowercase
   - Numbers and special characters

2. **Verification Codes**: 
   - Keep codes secret
   - Set reasonable expiration dates
   - Limit max uses
   - Rotate regularly

3. **Email Confirmation**:
   - Enable email confirmation in Supabase Auth settings
   - Verify admin email addresses

4. **Regular Audits**:
   - Review admin accounts regularly
   - Remove inactive admin accounts
   - Monitor admin activity in Supabase logs

5. **Two-Factor Authentication**:
   - Consider enabling 2FA in Supabase for admin accounts

## Important Files

- `supabase-trigger-setup.sql` - Database trigger (MUST RUN FIRST)
- `schema.sql` - Complete database schema
- `supabase-admin-setup.sql` - Legacy admin creation scripts
- `AUTHENTICATION_FIXES.md` - Detailed technical documentation

## Admin Portal Features

Once logged in as admin, you can:

- Create and manage courses
- Add lessons (video, PDF, iframe, 3D models)
- Create quizzes and questions
- Manage categories
- View student progress and analytics
- Issue certificates
- Manage enrollments

## Student Signup

Students can sign up without verification codes:

1. Go to `/login`
2. Click "Sign Up"
3. Select "Student" as role
4. Fill in details and create account
5. Log in at `/login`
6. Access student dashboard at `/student`

## Need Help?

- Check `AUTHENTICATION_FIXES.md` for detailed technical information
- Review Supabase logs for error messages
- Verify all tables exist: `users`, `verification_codes`, etc.
- Ensure database trigger is installed
- Check that RLS policies are enabled

## Quick Reference

### Admin Login
- URL: `/admin/login`
- Redirect: `/admin` (on success)

### Student Login  
- URL: `/login`
- Redirect: `/student` (on success)

### Create Verification Code
```sql
INSERT INTO verification_codes (code, role, max_uses, expires_at)
VALUES ('YOUR-CODE', 'admin', 10, NOW() + INTERVAL '365 days');
```

### Check Admin Users
```sql
SELECT email, role, full_name, created_at 
FROM users 
WHERE role = 'admin';
```

### Make User an Admin
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@email.com';
```

---

**Last Updated**: January 2026
**Version**: 2.0 (With Database Triggers)
