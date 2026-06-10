-- ============================================================
-- 040: Admin profile updates (institution-scoped)
-- Applied via Supabase MCP; this file is the version-controlled source.
--   admin_update_user_profile() — guarded demographic edits for admins
-- ============================================================

create or replace function public.admin_update_user_profile(
  p_user_id uuid,
  p_full_name text default null,
  p_occupation text default null,
  p_affiliation text default null,
  p_country text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_can_manage_user(p_user_id) then
    raise exception 'Not allowed to manage this user';
  end if;

  update public.users
  set
    full_name = case
      when p_full_name is not null then nullif(trim(p_full_name), '')
      else full_name
    end,
    occupation = case
      when p_occupation is not null then nullif(trim(p_occupation), '')
      else occupation
    end,
    affiliation = case
      when p_affiliation is not null then nullif(trim(p_affiliation), '')
      else affiliation
    end,
    country = case
      when p_country is not null then nullif(trim(p_country), '')
      else country
    end,
    updated_at = now()
  where id = p_user_id;
end; $$;

revoke execute on function public.admin_update_user_profile(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_update_user_profile(uuid, text, text, text, text) to authenticated;
