-- ============================================================
-- 045: Announcements / notification modal system
-- Applied via Supabase MCP; this file is the version-controlled source.
--   Institution-scoped, schedulable, audience-targeted announcements
--   rendered as a dashboard banner or a modal. Replaces the hardcoded
--   legacy welcome-back banner with editable seeded templates.
--     audience: all | first_time (users created after starts_at) |
--               legacy_claimed (users with a linked legacy_users row)
--     display_mode: once (recorded on first view) |
--                   until_dismissed (recorded on explicit dismiss) |
--                   always (every visit while scheduled)
-- ============================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  body text not null,
  style text not null default 'banner' check (style in ('banner', 'modal')),
  audience text not null default 'all' check (audience in ('all', 'first_time', 'legacy_claimed')),
  display_mode text not null default 'until_dismissed' check (display_mode in ('once', 'until_dismissed', 'always')),
  accent_color text,                 -- null = institution primary color
  show_logo boolean not null default true,
  cta_label text,
  cta_url text,
  show_report_issue boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_institution_active
  on public.announcements (institution_id, is_active, starts_at);

create table if not exists public.announcement_dismissals (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_dismissals enable row level security;

-- students read live announcements for their own institution
drop policy if exists "Users read live announcements" on public.announcements;
create policy "Users read live announcements" on public.announcements
  for select using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
  );

-- admins manage their institution's announcements (platform_admin exempt)
drop policy if exists "Admins manage announcements" on public.announcements;
create policy "Admins manage announcements" on public.announcements
  for all using (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  ) with check (
    public.is_admin() and (
      institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
      or (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
    )
  );

-- users record + read their own dismissals
drop policy if exists "Users manage own dismissals" on public.announcement_dismissals;
create policy "Users manage own dismissals" on public.announcement_dismissals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Admins read dismissals" on public.announcement_dismissals;
create policy "Admins read dismissals" on public.announcement_dismissals
  for select using (public.is_admin());

-- ── Seed: generic first-time welcome + editable legacy welcome-back ─────────
insert into public.announcements
  (institution_id, title, body, style, audience, display_mode, show_logo, show_report_issue)
select i.id,
  'Welcome to ' || v.display_name || ' Learning! 🎉',
  'Hi {{firstName}}, welcome aboard!' || E'\n\n'
    || 'Your courses are ready whenever you are — work through them at your own pace, '
    || 'track your progress from this dashboard, and earn a certificate for every course you complete.' || E'\n\n'
    || 'Happy learning!',
  'modal', 'first_time', 'once', true, false
from public.institutions i
join (values ('gansid', 'GANSID'), ('scago', 'SCAGO')) as v(slug, display_name) on v.slug = i.slug
where not exists (
  select 1 from public.announcements a
  where a.institution_id = i.id and a.audience = 'first_time'
);

insert into public.announcements
  (institution_id, title, body, style, audience, display_mode, show_logo, show_report_issue)
select i.id,
  'Welcome back, {{firstName}}! 👋',
  '{{institutionName}}''s learning has a new home — this platform replaces EdApp. '
    || 'We''ve carried over your progress, completed courses, and certificates.' || E'\n\n'
    || 'Heads-up: progress in courses you hadn''t finished may be slightly off, '
    || 'but completed courses and earned certificates are accurate. '
    || 'Spot something wrong? Let us know and we''ll fix it.',
  'banner', 'legacy_claimed', 'until_dismissed', true, true
from public.institutions i
where i.slug in ('gansid', 'scago')
  and not exists (
    select 1 from public.announcements a
    where a.institution_id = i.id and a.audience = 'legacy_claimed'
  );
