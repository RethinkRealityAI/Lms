-- Migration 064: unified feedback_submissions table.
--
-- Replaces the flat, untyped contact_submissions (which stuffed course/lesson/slide
-- context into the message body as a text blob). One typed table backs all three
-- free-text entry points — the public contact form, the in-viewer "Report issue"
-- button, and the dashboard support widget. CME certificate requests stay their own
-- table (structured + RPC-backed); the admin hub shows them as a filter.
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  -- contact = general message; issue = something wrong with content/course;
  -- suggestion = idea/improvement; bug = platform defect.
  type text not null default 'contact' check (type in ('contact','issue','suggestion','bug')),
  category text,                                    -- pill slug, scoped to the type (nullable)
  name text,
  email text,
  subject text,
  message text not null,
  user_id uuid references public.users(id) on delete set null,       -- set for authed submissions
  institution_id uuid references public.institutions(id) on delete set null,
  -- { page_url, course_id, course_title, module_title, lesson_id, lesson_title, slide_index, user_agent }
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_submissions_inst_created
  on public.feedback_submissions (institution_id, created_at desc);
create index if not exists idx_feedback_submissions_type on public.feedback_submissions (type);
create index if not exists idx_feedback_submissions_status on public.feedback_submissions (status);

alter table public.feedback_submissions enable row level security;

-- Public submit (anon + authenticated), mirroring contact_submissions today.
-- Authenticated callers may only stamp their OWN user_id (or leave it null); anon
-- must leave it null. Prevents spoofing another user's id.
create policy "Anyone can submit feedback"
  on public.feedback_submissions for insert
  with check (user_id is null or user_id = auth.uid());

-- Admins read/update/delete their own institution's feedback (platform_admin any).
create policy "Admins read feedback"
  on public.feedback_submissions for select
  using (
    public.is_admin() and (
      (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      or institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
    )
  );
create policy "Admins update feedback"
  on public.feedback_submissions for update
  using (
    public.is_admin() and (
      (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      or institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
    )
  )
  with check (
    public.is_admin() and (
      (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      or institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
    )
  );
create policy "Admins delete feedback"
  on public.feedback_submissions for delete
  using (
    public.is_admin() and (
      (select u.role from public.users u where u.id = auth.uid()) = 'platform_admin'
      or institution_id = (select u.institution_id from public.users u where u.id = auth.uid())
    )
  );

-- Backfill existing contact_submissions as type='contact' (preserving ids + timestamps).
-- contact_submissions is left dormant (droppable once verified).
insert into public.feedback_submissions (id, type, name, email, subject, message, institution_id, created_at)
select id, 'contact', name, email, subject, message, institution_id, created_at
from public.contact_submissions
on conflict (id) do nothing;
