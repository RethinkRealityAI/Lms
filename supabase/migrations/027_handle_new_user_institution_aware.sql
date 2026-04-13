-- Migration 027: Make handle_new_user institution-aware
-- The signup form passes institution_slug in user metadata.
-- This trigger now reads it and assigns the correct institution_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_institution_id uuid;
  v_slug text;
BEGIN
  -- Resolve institution from the signup metadata (institution_slug)
  v_slug := COALESCE(NEW.raw_user_meta_data->>'institution_slug', 'gansid');

  SELECT id INTO v_institution_id
  FROM public.institutions
  WHERE slug = v_slug;

  -- Fallback to GANSID if slug not found
  IF v_institution_id IS NULL THEN
    SELECT id INTO v_institution_id
    FROM public.institutions
    WHERE slug = 'gansid';
  END IF;

  INSERT INTO public.users (id, email, role, full_name, institution_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_institution_id,
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
$$;
