-- 074_guard_user_institution_id
--
-- Follow-up to 073 (flagged by security review). guard_user_privileged_columns()
-- now also pins institution_id for non-admin callers ONCE IT IS SET. A student could
-- otherwise repoint their primary institution at another tenant via the unrestricted
-- "Users can update their own data" policy. Access to a second institution goes
-- through join_institution() (institution_memberships), never through this column.
--
-- The only legitimate self-service writers fill a NULL and nothing else, so they keep
-- working: the student dashboard self-heal (only when institution_id IS NULL) and
-- claim_legacy_profile() (coalesce(institution_id, ...)). Admins and service-role are
-- unaffected, as in 073.

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
    IF OLD.institution_id IS NOT NULL THEN
      NEW.institution_id := OLD.institution_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_user_privileged_columns() FROM PUBLIC, anon, authenticated;
