-- Migration 024: SCAGO institution and admin users
-- Ensure SCAGO institution exists
INSERT INTO public.institutions (name, slug, description, is_active)
VALUES ('SCAGO', 'scago', 'Sickle Cell Awareness Group of Ontario', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Update is_admin() to recognize platform_admin and institution_admin roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'platform_admin', 'institution_admin')
  );
$$;

-- Upgrade tech@sicklecellanemia.ca to platform_admin so they can admin both tenants
UPDATE public.users SET role = 'platform_admin' WHERE email = 'tech@sicklecellanemia.ca';
