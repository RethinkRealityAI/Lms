-- ============================================================
-- 038: Admin user + enrollment controls
-- Applied via Supabase MCP; this file is the version-controlled source.
--   1. users.is_active flag (soft suspend; auth-level ban is done via the
--      service-role API route)
--   2. admin_can_manage_user() helper — institution-scoped admin check
--   3. admin_get_user_auth_activity() — surfaces auth.users.last_sign_in_at
--   4. admin_set_user_role() — guarded role changes, logged
--   5. admin_set_user_active() — suspend/reactivate, logged
--   6. admin_reset_course_progress() — undo a user's course completion,
--      optionally revoking the certificate, logged
--   7. admin_enroll_users() / admin_unenroll_user() — admin-driven
--      enrollment (events logged by the 037 enrollment trigger)
-- ============================================================

-- ── 1. Soft-suspend flag ─────────────────────────────────────────────────────
alter table public.users add column if not exists is_active boolean not null default true;

-- ── 2. Scoped admin helper ───────────────────────────────────────────────────
create or replace function public.admin_can_manage_user(p_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() and (
    (select role from public.users where id = auth.uid()) = 'platform_admin'
    or (select institution_id from public.users where id = p_target)
       = (select institution_id from public.users where id = auth.uid())
  );
$$;
revoke execute on function public.admin_can_manage_user(uuid) from public, anon;
grant execute on function public.admin_can_manage_user(uuid) to authenticated;

-- ── 3. Last sign-in (from auth.users) for the admin's institution ────────────
create or replace function public.admin_get_user_auth_activity()
returns table (user_id uuid, last_sign_in_at timestamptz, email_confirmed_at timestamptz, auth_created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, au.last_sign_in_at, au.email_confirmed_at, au.created_at
  from public.users u
  join auth.users au on au.id = u.id
  where public.is_admin()
    and (
      (select role from public.users where id = auth.uid()) = 'platform_admin'
      or u.institution_id = (select institution_id from public.users where id = auth.uid())
    );
$$;
revoke execute on function public.admin_get_user_auth_activity() from public, anon;
grant execute on function public.admin_get_user_auth_activity() to authenticated;

-- ── 4. Role changes ──────────────────────────────────────────────────────────
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text := (select role from public.users where id = auth.uid());
  v_old_role text;
  v_inst uuid;
begin
  if not public.admin_can_manage_user(p_user_id) then
    raise exception 'Not allowed to manage this user';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  if p_role not in ('student', 'admin', 'institution_admin', 'platform_admin') then
    raise exception 'Invalid role %', p_role;
  end if;

  select role, institution_id into v_old_role, v_inst from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;

  if (p_role = 'platform_admin' or v_old_role = 'platform_admin') and v_caller_role <> 'platform_admin' then
    raise exception 'Only a platform admin can grant or change the platform_admin role';
  end if;
  if v_old_role = p_role then return; end if;

  update public.users set role = p_role, updated_at = now() where id = p_user_id;
  perform public.log_analytics_event(v_inst, p_user_id, 'role_changed', 'user', p_user_id,
    jsonb_build_object('from', v_old_role, 'to', p_role, 'changed_by', auth.uid()));
end; $$;
revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ── 5. Suspend / reactivate ──────────────────────────────────────────────────
create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text := (select role from public.users where id = auth.uid());
  v_target_role text;
  v_inst uuid;
begin
  if not public.admin_can_manage_user(p_user_id) then
    raise exception 'Not allowed to manage this user';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot suspend your own account';
  end if;
  select role, institution_id into v_target_role, v_inst from public.users where id = p_user_id;
  if not found then raise exception 'User not found'; end if;
  if v_target_role = 'platform_admin' and v_caller_role <> 'platform_admin' then
    raise exception 'Only a platform admin can suspend a platform admin';
  end if;

  update public.users set is_active = p_active, updated_at = now() where id = p_user_id;
  perform public.log_analytics_event(v_inst, p_user_id,
    case when p_active then 'user_reactivated' else 'user_deactivated' end,
    'user', p_user_id, jsonb_build_object('changed_by', auth.uid()));
end; $$;
revoke execute on function public.admin_set_user_active(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;

-- ── 6. Reset course progress (undo completion) ───────────────────────────────
create or replace function public.admin_reset_course_progress(
  p_user_id uuid, p_course_id uuid, p_revoke_certificate boolean default true
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid;
  v_deleted int;
  v_revoked boolean := false;
begin
  if not public.admin_can_manage_user(p_user_id) then
    raise exception 'Not allowed to manage this user';
  end if;
  select institution_id into v_inst from public.courses where id = p_course_id;
  if not found then raise exception 'Course not found'; end if;

  delete from public.progress
    where user_id = p_user_id
      and lesson_id in (select id from public.lessons where course_id = p_course_id);
  get diagnostics v_deleted = row_count;

  if p_revoke_certificate then
    update public.certificates
      set revoked_at = now(), revoked_by = auth.uid(),
          revoke_reason = 'Progress reset by administrator'
      where user_id = p_user_id and course_id = p_course_id and revoked_at is null;
    v_revoked := found;
  end if;

  perform public.log_analytics_event(v_inst, p_user_id, 'progress_reset', 'course', p_course_id,
    jsonb_build_object('reset_by', auth.uid(), 'lessons_cleared', v_deleted, 'certificate_revoked', v_revoked));

  return jsonb_build_object('lessons_cleared', v_deleted, 'certificate_revoked', v_revoked);
end; $$;
revoke execute on function public.admin_reset_course_progress(uuid, uuid, boolean) from public, anon;
grant execute on function public.admin_reset_course_progress(uuid, uuid, boolean) to authenticated;

-- ── 7. Admin enrollment ──────────────────────────────────────────────────────
create or replace function public.admin_enroll_users(p_course_id uuid, p_user_ids uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_course_inst uuid;
  v_caller_role text := (select role from public.users where id = auth.uid());
  v_caller_inst uuid := (select institution_id from public.users where id = auth.uid());
  v_count int := 0;
  v_user uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select institution_id into v_course_inst from public.courses where id = p_course_id and deleted_at is null;
  if not found then raise exception 'Course not found'; end if;
  if v_caller_role <> 'platform_admin' and v_course_inst is distinct from v_caller_inst then
    raise exception 'Course belongs to another institution';
  end if;

  foreach v_user in array p_user_ids loop
    -- target user must belong to the course's institution
    if exists (select 1 from public.users where id = v_user and institution_id = v_course_inst)
       and not exists (select 1 from public.course_enrollments where user_id = v_user and course_id = p_course_id) then
      insert into public.course_enrollments (user_id, course_id) values (v_user, p_course_id);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end; $$;
revoke execute on function public.admin_enroll_users(uuid, uuid[]) from public, anon;
grant execute on function public.admin_enroll_users(uuid, uuid[]) to authenticated;

create or replace function public.admin_unenroll_user(p_course_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_can_manage_user(p_user_id) then
    raise exception 'Not allowed to manage this user';
  end if;
  delete from public.course_enrollments where user_id = p_user_id and course_id = p_course_id;
end; $$;
revoke execute on function public.admin_unenroll_user(uuid, uuid) from public, anon;
grant execute on function public.admin_unenroll_user(uuid, uuid) to authenticated;
