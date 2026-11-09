-- 073_lock_user_role_self_escalation
--
-- Closes two privilege-escalation paths to admin/platform_admin:
--
-- 1. handle_new_user() copied `role` from raw_user_meta_data, which the CLIENT
--    controls (supabase.auth.signUp({ options: { data: { role: 'platform_admin' } } })
--    with the public anon key). Present since migration 021. New accounts are now
--    ALWAYS 'student'; elevated roles go through admin_set_user_role() only.
--
-- 2. RLS "Users can update their own data" (auth.uid() = id, no column limits) let
--    any signed-in user run `update users set role = 'platform_admin'` on their own
--    row. A BEFORE UPDATE guard now pins role + is_active for non-admin callers.
--    Service-role / SQL (auth.uid() IS NULL) and admins (admin_set_user_role,
--    admin_set_user_active) are unaffected. institution_id is deliberately NOT
--    guarded: the student dashboard self-heals it, and it confers no privilege.
--
-- Verified before applying: no account had a non-student metadata role; the only
-- elevated accounts were set intentionally.

/* 1. handle_new_user v7 — role is never taken from client metadata */
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_institution_id uuid;
  v_slug text;
  v_referral_code text;
  v_referral_id uuid;
  v_profession text;
  v_source text;
  v_campaign text;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'institution_slug', 'gansid');

  SELECT id INTO v_institution_id FROM public.institutions WHERE slug = v_slug;

  IF v_institution_id IS NULL THEN
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'gansid';
  END IF;

  v_referral_code := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF v_referral_code <> '' THEN
    SELECT id INTO v_referral_id
    FROM public.referral_codes
    WHERE institution_id = v_institution_id
      AND code = v_referral_code
      AND is_active
      AND archived_at IS NULL;
  END IF;

  IF v_referral_id IS NOT NULL THEN
    v_source := public.normalize_referral_source(NEW.raw_user_meta_data->>'referral_source');
    v_campaign := public.normalize_referral_campaign(NEW.raw_user_meta_data->>'referral_campaign');
  END IF;

  v_profession := NULLIF(left(btrim(COALESCE(NEW.raw_user_meta_data->>'profession', '')), 80), '');

  INSERT INTO public.users (
    id, email, role, full_name, institution_id, occupation,
    referral_code_id, referral_attributed_at,
    referral_source_category, referral_campaign,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'student',  -- never from client-controlled metadata
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_institution_id,
    v_profession,
    v_referral_id,
    CASE WHEN v_referral_id IS NOT NULL THEN NOW() END,
    v_source,
    v_campaign,
    NOW(),
    NOW()
  );

  PERFORM public.claim_legacy_profile(NEW.id, NEW.email);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$function$;

/* 2. Pin role + is_active against self-service updates */
CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_user_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_user_privileged_columns ON public.users;
CREATE TRIGGER trg_guard_user_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_privileged_columns();
