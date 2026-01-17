# GANSID LMS - Admin Setup Guide

This guide will help you create an admin user account for the GANSID Learning Management System.

## Quick Start

### Step 1: Create Admin User in Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add User"** > **"Create New User"**
4. Enter the following:
   - **Email**: `admin@gansid.org` (or your preferred admin email)
   - **Password**: Choose a strong password (min 12 characters, mixed case, numbers, symbols)
   - **Auto Confirm User**: ✅ **YES** (to skip email verification)
5. Click **"Create User"**
6. **Copy the User ID** (UUID) - you'll need this for the next step

### Step 2: Create Admin Profile in Database

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the `supabase-admin-setup.sql` file from this repository
4. Find the section labeled **"QUICK SETUP SCRIPT"**
5. Uncomment and modify the following SQL:

```sql
DO $$
DECLARE
  v_admin_email TEXT := 'dapo@rethinkreality.ai';  -- Change to your admin email
  v_admin_name TEXT := 'GANSID Administrator';  -- Change to admin name
  v_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_admin_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users. Please create the user in Authentication first.', v_admin_email;
  END IF;

  -- Insert or update user profile
  INSERT INTO users (id, email, role, full_name)
  VALUES (v_user_id, v_admin_email, 'admin', v_admin_name)
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'admin',
    email = v_admin_email,
    full_name = v_admin_name,
    updated_at = NOW();

  RAISE NOTICE 'Admin user profile created successfully for %', v_admin_email;
END $$;
```

6. Replace `admin@gansid.org` with your admin email
7. Replace `GANSID Administrator` with the admin's full name
8. Click **"Run"** to execute the script

### Step 3: Verify Admin User

Run this query to verify your admin user was created:

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

### Step 4: Access Admin Portal

1. Navigate to `/admin/login` in your application
2. Sign in with your admin credentials
3. You should be redirected to the admin dashboard

## Alternative: Using Supabase CLI

If you prefer using the command line:

```bash
# Create admin user
supabase auth admin create-user \
  --email admin@gansid.org \
  --password "YourSecurePassword123!" \
  --email-confirm

# Then run the SQL script from Step 2 above
```

## Security Best Practices

1. **Strong Passwords**: Use passwords with:
   - Minimum 12 characters
   - Mix of uppercase and lowercase letters
   - Numbers and special characters
   - Not used elsewhere

2. **Enable 2FA**: 
   - Go to Supabase Dashboard > Authentication > Users
   - Select your admin user
   - Enable two-factor authentication

3. **Regular Password Rotation**: Change admin passwords regularly (every 90 days recommended)

4. **Monitor Access**: 
   - Check login activity in Supabase Dashboard
   - Set up alerts for suspicious activity

5. **Limit Access**: 
   - Only grant admin access to trusted personnel
   - Use IP restrictions if possible

## Troubleshooting

### "User not found" Error
- Make sure you created the user in Authentication first
- Verify the email address matches exactly (case-sensitive)

### "Access Denied" on Admin Login
- Verify the user's role is set to 'admin' in the users table
- Check that the user profile exists in the users table
- Ensure the user is confirmed in auth.users

### Password Reset
- Use the "Forgot Password?" link on the login page
- Or reset via Supabase Dashboard > Authentication > Users

## Support

If you encounter issues:
1. Check the Supabase logs in the Dashboard
2. Verify all environment variables are set correctly
3. Ensure the database schema is up to date
4. Check the browser console for client-side errors

## Files Reference

- **`supabase-admin-setup.sql`**: Complete SQL script with setup instructions
- **`src/app/admin/login/page.tsx`**: Admin login page
- **`src/middleware.ts`**: Route protection middleware
