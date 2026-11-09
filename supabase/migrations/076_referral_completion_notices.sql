-- 076: Referral completion notices — email named contacts when a learner who
-- signed up through a referral link completes the full program.
--
-- Why: partner organisations (first: NorWest Community Health Centres, SCAGO)
-- give learners they referred a thank-you gift card on completion, and need to
-- know WHO completed. The public /report/<token> page stays aggregates-only
-- (rule 28: the token is a bearer credential handed outside the organisation),
-- so identifiable details travel ONLY by email to the contacts an admin lists
-- on the code — never through the report.
--
-- "Completion" = the learner holds a live PROGRAM certificate in the code's
-- institution (for SCAGO: all 13 modules). Capture is database-side so every
-- issuance path counts: the learner's own completion, admin awards, legacy
-- claims (materialize_legacy_completions) and backfill_program_certificates.
--
--   1. referral_codes.completion_notify_emails  — who gets the email (empty = off)
--   2. referral_completion_notices              — outbox, one row per program cert
--   3. queue_referral_completion_notice()       — AFTER INSERT/restore trigger on certificates
--   4. enqueue_missing_referral_completion_notices() — idempotent sweep (config set
--      after a completion, or anything the trigger missed); service role only
--   5. get_referral_signup_notice(code, slug)   — anon: partner name to show at signup
--   6. admin_referral_learners(code_id)         — admin: per-learner list for one code
--
-- Sending happens in the app (SMTP lives there): /api/notify/certificate flushes
-- immediately after a program certificate is issued, and an hourly scheduled
-- sweep (/api/admin/referrals/notices) catches the rest. Claims on the outbox
-- row prevent a double send when both run at once.

-- ── 1. Recipients per referral code ─────────────────────────────────────────
create or replace function public.emails_are_valid(p_emails text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(bool_and(e ~ '^[^@[:space:]<>,;]+@[^@[:space:]<>,;]+\.[^@[:space:]<>,;]+$'), true)
  from unnest(p_emails) as e;
$$;

alter table public.referral_codes
  add column if not exists completion_notify_emails text[] not null default '{}';

alter table public.referral_codes
  drop constraint if exists referral_codes_completion_notify_emails_check;
alter table public.referral_codes
  add constraint referral_codes_completion_notify_emails_check
  check (cardinality(completion_notify_emails) <= 10
         and public.emails_are_valid(completion_notify_emails));

comment on column public.referral_codes.completion_notify_emails is
  'Contacts emailed (with the learner''s name and email) when someone who signed up through this link earns the program certificate. Empty = off. Learners see a notice at signup while this is non-empty.';

-- ── 2. Outbox ───────────────────────────────────────────────────────────────
create table if not exists public.referral_completion_notices (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  sent_to text[],
  attempts integer not null default 0,
  last_error text,
  constraint referral_completion_notices_certificate_unique unique (certificate_id)
);

create index if not exists idx_referral_completion_notices_pending
  on public.referral_completion_notices (created_at)
  where sent_at is null;
create index if not exists idx_referral_completion_notices_code
  on public.referral_completion_notices (referral_code_id);

alter table public.referral_completion_notices enable row level security;

-- Admins read their institution's notices (platform_admin all). No client
-- writes: rows are created by the trigger/sweep and updated by the sender
-- (service role), so there are deliberately no INSERT/UPDATE/DELETE policies.
drop policy if exists "Admins read referral completion notices" on public.referral_completion_notices;
create policy "Admins read referral completion notices"
  on public.referral_completion_notices
  for select
  using (
    public.is_admin() and (
      (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      or institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
    )
  );

-- ── 3. Capture trigger ──────────────────────────────────────────────────────
create or replace function public.queue_referral_completion_notice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only live program certificates; on UPDATE only the revoked→restored transition.
  if new.program_id is null or new.revoked_at is not null then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.revoked_at is null then
    return null;
  end if;

  begin
    insert into public.referral_completion_notices
      (referral_code_id, institution_id, user_id, certificate_id, program_id)
    select rc.id, new.institution_id, new.user_id, new.id, new.program_id
    from public.users u
    join public.referral_codes rc on rc.id = u.referral_code_id
    where u.id = new.user_id
      and rc.institution_id = new.institution_id   -- rule 28: same tenant only
      and cardinality(rc.completion_notify_emails) > 0
    on conflict (certificate_id) do nothing;
  exception when others then
    -- A notification problem must never block or roll back a certificate;
    -- the scheduled sweep re-queues anything missed here.
    raise warning 'queue_referral_completion_notice failed for certificate %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists certificates_queue_referral_completion_notice on public.certificates;
create trigger certificates_queue_referral_completion_notice
  after insert or update of revoked_at on public.certificates
  for each row execute function public.queue_referral_completion_notice();

-- ── 4. Idempotent sweep ─────────────────────────────────────────────────────
create or replace function public.enqueue_missing_referral_completion_notices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.referral_completion_notices
    (referral_code_id, institution_id, user_id, certificate_id, program_id)
  select rc.id, c.institution_id, c.user_id, c.id, c.program_id
  from public.certificates c
  join public.users u on u.id = c.user_id
  join public.referral_codes rc on rc.id = u.referral_code_id
  where c.program_id is not null
    and c.revoked_at is null
    and rc.institution_id = c.institution_id
    and cardinality(rc.completion_notify_emails) > 0
  on conflict (certificate_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.enqueue_missing_referral_completion_notices() from public, anon, authenticated;
grant execute on function public.enqueue_missing_referral_completion_notices() to service_role;

-- ── 5. Signup notice (anon) ─────────────────────────────────────────────────
-- Returns the partner's display name only when the code is live in that
-- institution AND completion sharing is on, so the signup form can tell the
-- learner up front. Exposes nothing beyond the label of a code that is already
-- public in its own share link.
create or replace function public.get_referral_signup_notice(p_code text, p_institution_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rc.label
  from public.referral_codes rc
  join public.institutions i on i.id = rc.institution_id
  where i.slug = lower(btrim(coalesce(p_institution_slug, '')))
    and rc.code = lower(btrim(coalesce(p_code, '')))
    and rc.is_active
    and rc.archived_at is null
    and cardinality(rc.completion_notify_emails) > 0
  limit 1;
$$;

revoke all on function public.get_referral_signup_notice(text, text) from public;
grant execute on function public.get_referral_signup_notice(text, text) to anon, authenticated;

-- ── 6. Admin learner list ───────────────────────────────────────────────────
create or replace function public.admin_referral_learners(p_code_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  profession text,
  campaign text,
  joined_at timestamptz,
  modules_completed integer,
  modules_total integer,
  program_completed_at timestamptz,
  certificate_number text,
  notice_status text,
  notice_sent_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_institution uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  select rc.institution_id into v_institution
  from public.referral_codes rc where rc.id = p_code_id;
  if v_institution is null then
    raise exception 'Referral code not found';
  end if;

  if not exists (
    select 1 from public.users
    where id = auth.uid()
      and (role = 'platform_admin' or institution_id = v_institution)
  ) then
    raise exception 'Not authorised for this institution';
  end if;

  return query
  with program_course_ids as (
    select distinct pc.course_id
    from public.program_courses pc
    join public.programs p on p.id = pc.program_id
    join public.courses c on c.id = pc.course_id and c.deleted_at is null
    where p.institution_id = v_institution
  )
  select
    u.id,
    u.full_name,
    u.email,
    u.occupation,
    u.referral_campaign,
    u.created_at,
    (select count(distinct c.course_id)::integer
       from public.certificates c
      where c.user_id = u.id and c.revoked_at is null
        and c.institution_id = v_institution
        and c.course_id in (select course_id from program_course_ids)),
    (select count(*)::integer from program_course_ids),
    pc.issued_at,
    pc.certificate_number,
    case
      when n.id is null then case when pc.id is null then 'not_eligible' else 'not_queued' end
      when n.sent_at is not null then 'sent'
      when n.attempts > 0 then 'failed'
      else 'pending'
    end,
    n.sent_at
  from public.users u
  left join lateral (
    select c.id, c.issued_at, c.certificate_number
    from public.certificates c
    where c.user_id = u.id and c.program_id is not null and c.revoked_at is null
      and c.institution_id = v_institution
    order by c.issued_at
    limit 1
  ) pc on true
  left join public.referral_completion_notices n on n.certificate_id = pc.id
  where u.referral_code_id = p_code_id
  order by pc.issued_at desc nulls last, u.created_at desc;
end;
$$;

revoke all on function public.admin_referral_learners(uuid) from public, anon;
grant execute on function public.admin_referral_learners(uuid) to authenticated;
