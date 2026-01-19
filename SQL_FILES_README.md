# Database Setup Files - Quick Reference

This directory contains SQL files for setting up and managing your GANSID LMS database.

## 🚀 Quick Start Guide

### First Time Setup (Run in this order)

1. **`schema.sql`** - Main database schema
   - Creates all tables (users, courses, lessons, etc.)
   - Sets up RLS policies
   - Creates indexes
   - **Run this FIRST**

2. **`supabase-trigger-setup.sql`** - Automatic profile creation trigger ⚠️ CRITICAL
   - Creates trigger to auto-create user profiles on signup
   - **MUST RUN THIS** or users won't be able to log in after signup
   - Run immediately after schema.sql

3. **`supabase-admin-setup.sql`** - Admin user creation (optional)
   - Legacy script for manual admin creation
   - Contains helper queries
   - Can be used as reference

## 📋 File Descriptions

### `schema.sql`
**Purpose**: Complete database schema with all tables and policies

**What it creates**:
- Users table (profiles)
- Categories table
- Courses and lessons tables
- Quizzes and questions
- Enrollments and progress tracking
- Reviews and comments
- Certificates
- All RLS policies
- All indexes
- Database triggers (NEW in v2.0)

**When to run**: 
- First time setup
- After database reset
- For new environments

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste entire file
3. Click "Run"

---

### `supabase-trigger-setup.sql` ⚠️ CRITICAL
**Purpose**: Enable automatic user profile creation

**What it creates**:
- `handle_new_user()` function
- `on_auth_user_created` trigger on `auth.users`
- Necessary permissions

**When to run**: 
- **ALWAYS** - Required for authentication to work
- After `schema.sql`
- If users can't log in after signing up

**How to run**:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste entire file
3. Click "Run"
4. Verify with:
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

**Why it's critical**:
Without this trigger, user profiles won't be created automatically when users sign up. They'll be able to create an account but won't be able to log in because their profile won't exist in the `users` table.

---

### `supabase-admin-setup.sql`
**Purpose**: Legacy manual admin user creation script

**What it contains**:
- Manual admin creation SQL
- Verification code setup examples
- Helper queries for admin management
- Verification queries

**When to use**: 
- Reference for manual admin creation
- If you prefer manual setup over automated signup
- For one-off admin account creation

**Note**: The new recommended way to create admin accounts is via the signup flow with verification codes. See `ADMIN_SETUP_GUIDE.md`.

---

## 🎯 Common Tasks

### Create Admin Verification Code
```sql
INSERT INTO verification_codes (code, role, max_uses, expires_at)
VALUES ('ADMIN-2024-CODE', 'admin', 10, NOW() + INTERVAL '365 days');
```

### Check if Trigger is Installed
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Manually Create User Profile (if trigger fails)
```sql
INSERT INTO users (id, email, role, full_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'role', 'student'),
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users 
WHERE email = 'user@example.com'
ON CONFLICT (id) DO NOTHING;
```

### Make Existing User an Admin
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### View All Admin Users
```sql
SELECT 
  u.email,
  u.full_name,
  u.created_at,
  au.last_sign_in_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.role = 'admin'
ORDER BY u.created_at DESC;
```

### Check Active Verification Codes
```sql
SELECT 
  code, 
  role, 
  current_uses, 
  max_uses, 
  expires_at,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN current_uses >= max_uses THEN 'DEPLETED'
    ELSE 'ACTIVE'
  END as status
FROM verification_codes
WHERE role = 'admin'
ORDER BY created_at DESC;
```

---

## 🔧 Troubleshooting

### Issue: Users can't log in after signing up

**Diagnosis**: Profile wasn't created in `users` table

**Solution**:
1. Run `supabase-trigger-setup.sql`
2. For existing users without profiles, run:
   ```sql
   INSERT INTO users (id, email, role, full_name)
   SELECT 
     id, 
     email, 
     COALESCE(raw_user_meta_data->>'role', 'student'),
     COALESCE(raw_user_meta_data->>'full_name', '')
   FROM auth.users 
   WHERE id NOT IN (SELECT id FROM users)
   ON CONFLICT (id) DO NOTHING;
   ```

### Issue: RLS policy errors

**Diagnosis**: Policies not set up correctly

**Solution**: Re-run `schema.sql` to recreate policies

### Issue: Trigger not firing

**Diagnosis**: Trigger not installed or permissions missing

**Solution**: 
1. Re-run `supabase-trigger-setup.sql`
2. Check logs in Supabase Dashboard
3. Verify permissions were granted

---

## 📚 Related Documentation

- `ADMIN_SETUP_GUIDE.md` - Step-by-step admin account setup
- `AUTHENTICATION_FIXES.md` - Technical documentation for auth system
- `FIXES_SUMMARY.md` - Overview of recent fixes and changes

---

## 🔄 Migration Guide

### From Old Setup (Without Triggers)

If you have an existing database without the trigger:

1. **Backup your data** (important!)
2. Run `supabase-trigger-setup.sql` to add the trigger
3. Create profiles for existing auth users:
   ```sql
   INSERT INTO users (id, email, role, full_name)
   SELECT 
     au.id, 
     au.email, 
     COALESCE(au.raw_user_meta_data->>'role', 'student'),
     COALESCE(au.raw_user_meta_data->>'full_name', '')
   FROM auth.users au
   LEFT JOIN users u ON au.id = u.id
   WHERE u.id IS NULL
   ON CONFLICT (id) DO NOTHING;
   ```
4. Test by creating a new user and verifying profile is created

---

## ⚠️ Important Notes

1. **Always run `supabase-trigger-setup.sql`** - This is not optional
2. **Order matters** - Run `schema.sql` before `supabase-trigger-setup.sql`
3. **Backup before changes** - Always backup your database before running SQL scripts
4. **Test in development** - Test all scripts in a development environment first
5. **Read the comments** - Each SQL file has detailed comments explaining what it does

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review `AUTHENTICATION_FIXES.md` for detailed technical info
3. Check Supabase logs for specific error messages
4. Verify environment variables are set correctly
5. Ensure you're using the correct Supabase project

---

**Last Updated**: January 17, 2026
**Schema Version**: 2.0 (With Triggers)
