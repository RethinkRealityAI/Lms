# Legacy User Auto-Claim Design

**Date:** 2026-04-09
**Status:** Approved

## Problem

When a legacy user (imported from the old EdApp system) signs up with their email, nothing connects them to their existing legacy profile. Their occupation, affiliation, country, and group memberships are orphaned in the `legacy_users` table. The admin dashboard shows them as "Invited" but never "Joined."

## Goal

When a user signs up with an email that matches a `legacy_users` row, automatically:
1. Pre-fill their profile with demographic data (occupation, affiliation, country)
2. Link the legacy record (`linked_user_id`, `accepted_at`)
3. Migrate group memberships from `legacy_user_id` to `user_id`
4. Mark any pending invitations as accepted

No "migrated from legacy" indicators. No legacy stats carried over. The user just has a pre-populated profile.

## Design

### Migration 021: `add_user_demographics_and_legacy_claim`

#### 1. Add demographic columns to `users`

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS country text;
```

Nullable, no defaults. Available to all users via the profile page.

#### 2. Create `claim_legacy_profile()` function

```sql
CREATE OR REPLACE FUNCTION public.claim_legacy_profile(p_user_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_legacy legacy_users%ROWTYPE;
BEGIN
  -- Find unclaimed legacy user by email (case-insensitive)
  SELECT * INTO v_legacy
  FROM public.legacy_users
  WHERE lower(email) = lower(p_email)
    AND linked_user_id IS NULL
  LIMIT 1;

  -- No match: nothing to do
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Copy demographic fields to users row
  UPDATE public.users
  SET
    occupation  = COALESCE(v_legacy.occupation, occupation),
    affiliation = COALESCE(v_legacy.affiliation, affiliation),
    country     = COALESCE(v_legacy.country, country),
    institution_id = COALESCE(institution_id, v_legacy.institution_id),
    updated_at  = now()
  WHERE id = p_user_id;

  -- Mark legacy record as claimed
  UPDATE public.legacy_users
  SET linked_user_id = p_user_id, accepted_at = now()
  WHERE id = v_legacy.id;

  -- Migrate group memberships from legacy_user_id to user_id
  UPDATE public.user_group_members
  SET user_id = p_user_id, legacy_user_id = NULL
  WHERE legacy_user_id = v_legacy.id;

  -- Mark any pending invitations as accepted
  UPDATE public.user_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE legacy_user_id = v_legacy.id
    AND status = 'pending';
END;
$$;
```

Key decisions:
- `COALESCE` on demographic fields: only overwrite if the legacy value is non-null (don't blank out data the user already has, though in practice the `users` row was just created so these will be null)
- `COALESCE` on `institution_id`: sets the institution if the user row doesn't have one yet
- `LIMIT 1`: handles the (unlikely) case of duplicate legacy emails
- `SECURITY DEFINER`: runs with elevated privileges since the trigger context may not have RLS access to all tables

#### 3. Update `handle_new_user()` trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );

  -- Attempt to claim a matching legacy profile
  PERFORM public.claim_legacy_profile(NEW.id, NEW.email);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

The `PERFORM` call is inside the existing try/catch. If claiming fails, the user is still created — they just won't have pre-filled data. The warning is logged for debugging.

### TypeScript Type Update

In `src/types/index.ts`, add to the `User` interface:

```typescript
export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  occupation?: string;
  affiliation?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}
```

### Profile Page Updates

In `src/app/student/profile/page.tsx`:

1. **Add to `formData` state**: `occupation`, `affiliation`, `country` fields
2. **Add form fields**: A new row below the name/email grid with three text inputs:
   - Occupation (e.g., "Healthcare Professional")
   - Affiliation (e.g., "Sickle Cell Foundation of Nigeria")
   - Country (e.g., "Nigeria")
3. **Include in save handler**: Add the three fields to the `update()` call
4. **No special legacy treatment**: These are standard profile fields for every user

### What Doesn't Change

- No "migrated from legacy" indicators anywhere in the UI
- No legacy aggregate stats (avg_progress, avg_score, etc.) carried over
- Admin user management dashboard already tracks legacy status — no changes needed
- The invitation flow continues working; claiming + invitation acceptance happen atomically
- Auth callback route (`src/app/auth/callback/route.ts`) — no changes needed, trigger handles everything

## Edge Cases

| Scenario | Behavior |
|---|---|
| Signup email has no legacy match | `claim_legacy_profile` returns immediately, user created normally |
| Legacy user already claimed (`linked_user_id` set) | `WHERE linked_user_id IS NULL` filter skips it |
| Multiple legacy rows with same email | `LIMIT 1` picks one; unlikely in practice |
| Claim fails mid-transaction | Caught by `EXCEPTION` block; user still created, warning logged |
| User signs up, then admin later imports legacy data | No auto-claim; admin can manually set `linked_user_id` |
| Legacy user was invited but signs up organically | Both `linked_user_id` and invitation status are updated |

## Testing

1. Sign up with an email that exists in `legacy_users` — verify profile has occupation/affiliation/country pre-filled
2. Sign up with a new email — verify normal signup, empty demographic fields
3. Sign up with an already-claimed legacy email — verify no double-claim
4. Check that group memberships migrate: `user_group_members.user_id` is set, `legacy_user_id` is cleared
5. Verify profile page shows and saves all three new fields for any user
