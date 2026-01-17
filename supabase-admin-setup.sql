-- ============================================
-- GANSID LMS - Admin User Creation Script
-- ============================================
-- This script helps you create an admin user in Supabase
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Create verification_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on verification_codes
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verification_codes
CREATE POLICY "Admins can read verification codes" ON verification_codes FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can create verification codes" ON verification_codes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Step 2: Create function to increment code usage
CREATE OR REPLACE FUNCTION increment_code_usage(p_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE verification_codes
  SET current_uses = current_uses + 1
  WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Function to create admin user
-- This function creates an admin user in the auth.users table and the users table
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Create user in auth.users using Supabase Auth Admin API
  -- Note: This requires using the Supabase Admin API or Dashboard
  -- For security reasons, we'll create a helper function that you can call
  
  -- Insert into users table (this will be done after auth user is created)
  -- The user_id will be returned from the auth.users table
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MANUAL ADMIN CREATION STEPS
-- ============================================
-- Since Supabase Auth requires admin privileges to create users programmatically,
-- follow these steps to create an admin user:
--
-- METHOD 1: Using Supabase Dashboard (Recommended)
-- ------------------------------------------------
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User" > "Create New User"
-- 4. Enter:
--    - Email: admin@gansid.org (or your preferred email)
--    - Password: [Choose a strong password]
--    - Auto Confirm User: YES (to skip email verification)
-- 5. Click "Create User"
-- 6. Copy the User ID (UUID)
-- 7. Run the SQL below with the User ID:
--
-- METHOD 2: Using Supabase CLI (Alternative)
-- ------------------------------------------
-- Use the Supabase CLI with admin privileges:
-- supabase auth admin create-user --email admin@gansid.org --password "YourSecurePassword123!" --email-confirm
--
-- ============================================

-- Step 4: After creating the auth user, run this SQL to create the user profile
-- Replace 'USER_ID_FROM_AUTH' with the actual UUID from auth.users
-- Replace 'admin@gansid.org' with your admin email
-- Replace 'Admin User' with the admin's full name

-- INSERT INTO users (id, email, role, full_name)
-- VALUES (
--   'USER_ID_FROM_AUTH',  -- Replace with actual UUID from auth.users
--   'admin@gansid.org',   -- Replace with your admin email
--   'admin',
--   'Admin User'          -- Replace with admin's full name
-- );

-- ============================================
-- QUICK SETUP SCRIPT (Run after creating auth user)
-- ============================================
-- Uncomment and modify the following to create your admin user profile:

/*
DO $$
DECLARE
  v_admin_email TEXT := 'admin@gansid.org';  -- Change to your admin email
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
*/

-- ============================================
-- CREATE ADMIN VERIFICATION CODE (Optional)
-- ============================================
-- If you want to use verification codes for admin signup:

/*
INSERT INTO verification_codes (code, role, max_uses, expires_at)
VALUES (
  'ADMIN-2024-CODE',  -- Change to your desired code
  'admin',
  10,                  -- Maximum number of uses
  NOW() + INTERVAL '365 days'  -- Expiration date
);
*/

-- ============================================
-- VERIFY ADMIN USER CREATION
-- ============================================
-- Run this query to verify your admin user was created correctly:

-- SELECT 
--   u.id,
--   u.email,
--   u.role,
--   u.full_name,
--   u.created_at,
--   au.email_confirmed_at,
--   au.last_sign_in_at
-- FROM users u
-- JOIN auth.users au ON u.id = au.id
-- WHERE u.role = 'admin';

-- ============================================
-- RESET ADMIN PASSWORD (If needed)
-- ============================================
-- If you need to reset an admin password, use the Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Find the admin user
-- 3. Click the three dots menu
-- 4. Select "Reset Password"
-- 5. Or use the Supabase CLI:
--    supabase auth admin update-user-by-id USER_ID --password "NewPassword123!"

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. Always use strong passwords (min 12 characters, mixed case, numbers, symbols)
-- 2. Enable 2FA for admin accounts in Supabase Dashboard
-- 3. Regularly rotate admin passwords
-- 4. Limit admin account access to trusted IPs if possible
-- 5. Monitor admin login activity in Supabase Dashboard
-- 6. Keep this script secure and don't commit passwords to version control
