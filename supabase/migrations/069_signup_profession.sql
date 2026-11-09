-- Migration 069: capture profession at signup
--
-- WHY: the ambassador outreach report (068) has a "who is signing up"
-- breakdown, but it read `users.occupation` — an OPTIONAL profile field that
-- only ~3% of learners had ever filled in. The breakdown was therefore empty
-- for practically every referral code, which is the one figure that answers
-- "did this outreach actually reach healthcare providers".
--
-- The signup form now asks "I am a…" as a REQUIRED field (Physician / Nurse /
-- Allied health professional / Other + free text) and passes it as
-- `profession` in the signup metadata. This trigger writes it to
-- `users.occupation` — the existing column, kept under its original name so
-- no existing data, export, admin tool or query has to move.
--
-- The signup form also no longer offers a role choice: everyone who signs up
-- is a student, and instructors/admins are provisioned separately. The trigger
-- still honours an explicit `role` in the metadata so the admin invite path
-- and any existing tooling keep working — it simply defaults to 'student'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_institution_id uuid;
  v_slug text;
  v_referral_code text;
  v_referral_id uuid;
  v_profession text;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'institution_slug', 'gansid');

  SELECT id INTO v_institution_id FROM public.institutions WHERE slug = v_slug;

  IF v_institution_id IS NULL THEN
    SELECT id INTO v_institution_id FROM public.institutions WHERE slug = 'gansid';
  END IF;

  -- Referral attribution (068). Resolved WITHIN the signup institution and
  -- only for live codes, so a stale or cross-tenant code silently attributes
  -- to nobody rather than failing the signup.
  v_referral_code := lower(btrim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  IF v_referral_code <> '' THEN
    SELECT id INTO v_referral_id
    FROM public.referral_codes
    WHERE institution_id = v_institution_id
      AND code = v_referral_code
      AND is_active
      AND archived_at IS NULL;
  END IF;

  -- Profession. Trimmed and length-capped here as well as in the form: this
  -- trigger is the last gate before the value reaches a public report.
  v_profession := NULLIF(left(btrim(COALESCE(NEW.raw_user_meta_data->>'profession', '')), 80), '');

  INSERT INTO public.users (
    id, email, role, full_name, institution_id, occupation,
    referral_code_id, referral_attributed_at, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_institution_id,
    v_profession,
    v_referral_id,
    CASE WHEN v_referral_id IS NOT NULL THEN NOW() END,
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
$$;

-- ---------------------------------------------------------------------------
-- claim_legacy_profile: stop the EdApp import from overwriting the answer the
-- learner just gave.
-- ---------------------------------------------------------------------------
-- It did `occupation = coalesce(v_legacy.occupation, occupation)`, i.e. the
-- imported value WINS over whatever is already on the row. Now that profession
-- is collected at signup, a returning EdApp learner who picks "Physician"
-- would immediately have it replaced by their old free-text EdApp occupation
-- ("RN", "physician - hematology", …) — silently fragmenting the breakdown
-- this migration exists to make usable.
--
-- Flipped to `coalesce(occupation, v_legacy.occupation)`: keep what the person
-- actually told us, fall back to the import only when we have nothing. This
-- also makes occupation consistent with `country`, which already worked this
-- way in the same statement. `affiliation` is deliberately left as-is — it is
-- not collected at signup, so the import remains its best source.
CREATE OR REPLACE FUNCTION public.claim_legacy_profile(p_user_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_legacy legacy_users%rowtype;
begin
  select * into v_legacy from public.legacy_users
  where lower(email) = lower(p_email) and linked_user_id is null limit 1;
  if not found then return; end if;

  update public.users set
    occupation     = coalesce(occupation, v_legacy.occupation),
    affiliation    = coalesce(v_legacy.affiliation, affiliation),
    country        = coalesce(country, v_legacy.country),
    institution_id = coalesce(institution_id, v_legacy.institution_id),
    updated_at     = now()
  where id = p_user_id;

  update public.legacy_users set linked_user_id = p_user_id, accepted_at = now()
  where id = v_legacy.id;
  update public.user_group_members set user_id = p_user_id, legacy_user_id = null
  where legacy_user_id = v_legacy.id;
  update public.user_invitations set status = 'accepted', accepted_at = now()
  where legacy_user_id = v_legacy.id and status = 'pending';

  -- resume where they left off: progress, enrollments, certificates
  perform public.materialize_legacy_completions(p_user_id, v_legacy.id);
end;
$$;
