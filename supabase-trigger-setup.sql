-- ============================================
-- GANSID LMS - Database Trigger Setup
-- ============================================
-- This script creates a trigger to automatically create user profiles
-- when new users sign up via Supabase Auth
-- Run this in your Supabase SQL Editor
-- ============================================

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row into the users table
  -- using the metadata from auth.users
  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Grant necessary permissions
-- ============================================
-- The trigger function needs to be able to insert into users table
-- even when called from the auth schema

-- Ensure the function has proper security context
ALTER FUNCTION public.handle_new_user() SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================
-- Verify the setup
-- ============================================
-- Run this query to verify the trigger is created:
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- ============================================
-- Test the trigger (Optional)
-- ============================================
-- You can test by creating a user through the Supabase Dashboard
-- Then verify the user profile was created:
-- SELECT * FROM public.users WHERE email = 'test@example.com';
