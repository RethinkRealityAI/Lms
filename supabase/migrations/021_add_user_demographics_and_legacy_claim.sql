-- Migration 021: Add user demographics and legacy profile auto-claim
-- Adds occupation, affiliation, country to users table.
-- Creates claim_legacy_profile() function called by handle_new_user() trigger.

-- 1. Add demographic columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS country text;

-- 2. Create claim_legacy_profile() function
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

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Copy demographic fields to users row
  UPDATE public.users
  SET
    occupation     = COALESCE(v_legacy.occupation, occupation),
    affiliation    = COALESCE(v_legacy.affiliation, affiliation),
    country        = COALESCE(v_legacy.country, country),
    institution_id = COALESCE(institution_id, v_legacy.institution_id),
    updated_at     = now()
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

-- 3. Update handle_new_user() trigger to call claim_legacy_profile()
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
