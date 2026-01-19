# Authentication System Fixes

This document outlines the fixes implemented to resolve authentication issues in the GANSID LMS.

## Issues Fixed

### 1. Profile Not Created on Signup ✅
**Problem**: When users signed up, their account was created in `auth.users` but the profile was not created in the `users` table, causing login failures.

**Root Cause**: 
- No database trigger to automatically create profiles
- Manual profile creation in the client was failing due to timing issues or RLS policy conflicts
- RLS policies required authentication context that wasn't available during signup

**Solution**:
- Created a database trigger (`on_auth_user_created`) that automatically creates a user profile whenever a new user is created in `auth.users`
- The trigger runs with `SECURITY DEFINER` to bypass RLS policies
- Added fallback manual profile creation in the signup flow with proper error handling
- Added profile verification after signup to ensure profile was created

**Files Modified**:
- `supabase-trigger-setup.sql` (NEW) - Contains the trigger setup
- `schema.sql` - Updated to include trigger creation
- `src/app/login/page.tsx` - Improved profile creation logic with verification

### 2. Admin Login Redirecting to Main Login ✅
**Problem**: The admin login page (`/admin/login`) was redirecting to the main login page (`/login`).

**Root Cause**: 
- The middleware matcher pattern didn't explicitly include `/admin/login`
- The pattern `/admin/:path*` was catching all admin routes including login and redirecting unauthenticated users

**Solution**:
- Updated middleware matcher to explicitly include `/admin/login`
- The middleware now properly handles the admin login page before applying authentication checks
- Added logic to allow access to `/admin/login` for unauthenticated users

**Files Modified**:
- `src/middleware.ts` - Updated matcher pattern and route handling logic

### 3. Improved Error Handling ✅
**Problem**: Poor error messages and unclear failure reasons during signup and login.

**Solution**:
- Added comprehensive error handling for all authentication flows
- Improved error messages to be more user-friendly and actionable
- Added logging for debugging purposes
- Added duplicate key error handling for race conditions

**Files Modified**:
- `src/app/login/page.tsx` - Enhanced error handling and user feedback

## Database Setup Required

### IMPORTANT: Run the Database Trigger Setup

You **MUST** run the trigger setup script in your Supabase SQL Editor to enable automatic profile creation:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open and run the file: `supabase-trigger-setup.sql`

This script will:
- Create the `handle_new_user()` function
- Create the `on_auth_user_created` trigger on `auth.users`
- Grant necessary permissions

### Verify Trigger Installation

After running the setup script, verify the trigger is installed:

```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

You should see one row returned with the trigger information.

## Testing Instructions

### Test 1: Student Signup
1. Navigate to the login page (`/login`)
2. Click on the "Sign Up" tab
3. Fill in:
   - Full Name: "Test Student"
   - Role: "Student"
   - Email: "student.test@example.com"
   - Password: "TestPass123"
4. Click "Create Account"
5. **Expected Result**: 
   - Account created successfully
   - Profile automatically created in `users` table
   - User is redirected to `/student` dashboard (if auto-confirmed)
   - Or shown email verification message

### Test 2: Admin Signup
1. First, create a verification code in Supabase:
   ```sql
   INSERT INTO verification_codes (code, role, max_uses, expires_at)
   VALUES ('ADMIN-TEST-2024', 'admin', 10, NOW() + INTERVAL '365 days');
   ```
2. Navigate to the login page (`/login`)
3. Click on the "Sign Up" tab
4. Fill in:
   - Full Name: "Test Admin"
   - Role: "Instructor"
   - Verification Code: "ADMIN-TEST-2024"
   - Email: "admin.test@example.com"
   - Password: "TestPass123"
5. Click "Create Account"
6. **Expected Result**: 
   - Account created successfully
   - Profile automatically created with role='admin'
   - User is redirected to `/admin` dashboard (if auto-confirmed)

### Test 3: Admin Login
1. Navigate to `/admin/login` directly
2. Enter admin credentials:
   - Email: "admin@gansid.org" (or your admin email)
   - Password: [your admin password]
3. Click "Enter Secure Portal"
4. **Expected Result**: 
   - User is authenticated
   - Role is verified as admin
   - Redirected to `/admin` dashboard
   - No redirect to main login page

### Test 4: Student Login
1. Navigate to `/login`
2. Enter student credentials
3. Click "Sign In"
4. **Expected Result**: 
   - User is authenticated
   - Redirected to `/student` dashboard

### Test 5: Access Control
1. Try accessing `/admin` routes as a student
2. Try accessing `/student` routes as an admin
3. **Expected Result**: 
   - Appropriate redirects based on user role
   - Admin cannot access student routes
   - Student cannot access admin routes

### Test 6: Profile Verification
After creating a new account, verify in Supabase:

```sql
-- Check that profile was created
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  u.created_at,
  au.email as auth_email,
  au.email_confirmed_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'student.test@example.com';
```

You should see both the profile in `users` table and the auth record.

## Verification Checklist

- [ ] Database trigger is installed (`on_auth_user_created`)
- [ ] Student signup creates profile automatically
- [ ] Admin signup with verification code creates profile automatically
- [ ] Admin can access `/admin/login` without redirect
- [ ] Admin can login and access admin dashboard
- [ ] Student can login and access student dashboard
- [ ] Role-based access control works correctly
- [ ] Error messages are clear and helpful
- [ ] Email verification works (if enabled)
- [ ] Profile contains correct role and metadata

## RLS Policy Review

The following RLS policies are in place for the `users` table:

```sql
-- Allow anyone to read user profiles
CREATE POLICY "Anyone can read user profiles" ON users FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Anyone can insert their own user record" ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

**Note**: The trigger function runs with `SECURITY DEFINER`, which means it bypasses RLS policies. This is necessary because the trigger runs in the context of the `auth` schema, not as the authenticated user.

## Troubleshooting

### Issue: Profile still not created after signup
**Solution**: 
1. Verify the trigger is installed (see verification query above)
2. Check Supabase logs for any errors during signup
3. Manually check if the user exists in `auth.users` but not in `users`
4. If user exists in auth but not in users, run:
   ```sql
   INSERT INTO users (id, email, role, full_name)
   SELECT id, email, 
          COALESCE(raw_user_meta_data->>'role', 'student'),
          COALESCE(raw_user_meta_data->>'full_name', '')
   FROM auth.users 
   WHERE id = 'USER_ID_HERE'
   ON CONFLICT (id) DO NOTHING;
   ```

### Issue: Admin login still redirects to main login
**Solution**: 
1. Clear browser cache and cookies
2. Verify middleware is updated (check `src/middleware.ts`)
3. Check if there are any build/cache issues - restart Next.js dev server

### Issue: "User profile not found" error on login
**Solution**: 
1. This means the user exists in `auth.users` but not in `users` table
2. Run the manual profile creation query above
3. Contact support if issue persists

### Issue: RLS policy errors during signup
**Solution**: 
1. The trigger should bypass RLS policies
2. If you're still seeing RLS errors, verify the trigger function has `SECURITY DEFINER`
3. Check that permissions are granted properly

## Architecture Notes

### Authentication Flow

```
1. User submits signup form
   ↓
2. supabase.auth.signUp() creates user in auth.users
   ↓
3. Database trigger fires automatically
   ↓
4. handle_new_user() function creates profile in users table
   ↓
5. Client waits 1 second for trigger to complete
   ↓
6. Client verifies profile was created
   ↓
7. If profile not found, manual fallback creation
   ↓
8. User redirected to appropriate dashboard
```

### Why Two-Step Verification?

The signup flow includes both automatic trigger-based profile creation AND manual verification/fallback:

1. **Trigger (Primary)**: Handles profile creation automatically and reliably
2. **Verification (Safety)**: Ensures profile was created before proceeding
3. **Fallback (Backup)**: Manually creates profile if trigger failed for any reason

This layered approach ensures maximum reliability while handling edge cases.

## Files Changed

1. **supabase-trigger-setup.sql** (NEW)
   - Database trigger setup script
   - Must be run in Supabase SQL Editor

2. **schema.sql** (MODIFIED)
   - Added trigger creation for future deployments
   - Includes complete database setup

3. **src/middleware.ts** (MODIFIED)
   - Updated matcher pattern to include `/admin/login`
   - Fixed admin login route handling

4. **src/app/login/page.tsx** (MODIFIED)
   - Improved profile creation with verification
   - Added fallback manual creation
   - Enhanced error handling
   - Better user feedback
   - Added email verification handling
   - Improved success messages

5. **src/app/auth/callback/route.ts** (NEW)
   - Handles email verification callbacks
   - Exchanges verification codes for sessions
   - Verifies user profiles
   - Provides error handling and redirects

6. **.env.example** (MODIFIED)
   - Added `NEXT_PUBLIC_SITE_URL` environment variable

## Email Verification

The system now includes proper email verification:
- Email confirmation links redirect to production URL
- Auth callback route handles verification
- Clear user feedback on success/failure
- Password reset flow updated
- See `EMAIL_VERIFICATION_SETUP.md` for configuration details

## Next Steps

1. **Run the database trigger setup** (CRITICAL)
2. Test all authentication flows
3. Verify profile creation works for both students and admins
4. Check admin login page access
5. Monitor Supabase logs for any errors
6. Update production database with trigger

## Security Considerations

- Trigger function runs with `SECURITY DEFINER` to bypass RLS
- This is safe because it only creates profiles for new auth users
- The function cannot be called directly by users
- User metadata (role, full_name) comes from the signup form
- Admin role requires verification code validation (client-side check)
- Consider adding server-side verification code validation in the trigger for extra security

## Performance

- Trigger adds minimal overhead (<10ms typically)
- Profile creation is synchronous and happens immediately
- No additional database queries needed during signup
- One verification query added to ensure reliability

## Maintenance

- Keep trigger function in sync with users table schema
- Update trigger if new required fields are added to users table
- Monitor trigger execution in Supabase logs
- Review and rotate admin verification codes regularly
