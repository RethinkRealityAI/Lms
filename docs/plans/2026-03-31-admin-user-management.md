# Admin User Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive admin user management system with invite-by-magic-link, active user management, pending invite tracking, legacy EdApp user import with reusable CSV UI, and bulk invite capabilities.

**Architecture:** Server page fetches data via `lib/db/` helpers, passes to a `'use client'` tabbed dashboard component. Invite flow uses a Supabase Edge Function (`invite-user`) that holds the service role key. Legacy users are stored in a `legacy_users` table, imported via CSV upload UI. All admin RLS policies use `public.is_admin()`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Auth + Edge Functions), TypeScript, Tailwind CSS 4, shadcn/ui (Card, Tabs, Badge, Dialog, Button, Input), Lucide icons, Papa Parse for CSV parsing.

---

### Task 1: Database Migration — `legacy_users` and `user_invitations` tables

**Files:**
- Migration via Supabase MCP `apply_migration`

**Step 1: Apply the migration**

Use Supabase MCP `apply_migration` with name `add_user_management_tables`:

```sql
-- Legacy users imported from EdApp CSV exports
CREATE TABLE IF NOT EXISTS public.legacy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  email TEXT NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  roles TEXT,
  occupation TEXT,
  affiliation TEXT,
  country TEXT,
  date_registered TIMESTAMPTZ,
  avg_progress NUMERIC DEFAULT 0,
  avg_score NUMERIC,
  completions INTEGER DEFAULT 0,
  completed_percent NUMERIC DEFAULT 0,
  external_id TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  linked_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (institution_id, email)
);

-- User invitations sent by admins
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'institution_admin')),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  legacy_user_id UUID REFERENCES public.legacy_users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (admin-only using is_admin())
ALTER TABLE public.legacy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legacy_users"
  ON public.legacy_users FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage user_invitations"
  ON public.user_invitations FOR ALL USING (public.is_admin());

-- Indexes
CREATE INDEX idx_legacy_users_institution ON public.legacy_users(institution_id);
CREATE INDEX idx_legacy_users_email ON public.legacy_users(email);
CREATE INDEX idx_user_invitations_institution ON public.user_invitations(institution_id);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
```

**Step 2: Verify tables created**

Use Supabase MCP `list_tables` and confirm `legacy_users` and `user_invitations` appear.

**Step 3: Commit**

Update `CLAUDE.md` migration table with entry 018.

---

### Task 2: Supabase Edge Function — `invite-user`

**Files:**
- Deploy via Supabase MCP `deploy_edge_function`

**Step 1: Deploy the edge function**

Use Supabase MCP `deploy_edge_function` with name `invite-user`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the caller is authenticated using the anon key
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is admin
    const { data: profile } = await anonClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    const adminRoles = ['platform_admin', 'institution_admin', 'instructor', 'admin']
    if (!profile || !adminRoles.includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, redirectTo } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to invite
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ user: data.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

Note: The `_shared/cors.ts` file may need to be created if it doesn't exist. If edge function deployment fails due to missing shared module, inline the CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Step 2: Verify edge function is deployed**

Use Supabase MCP `list_edge_functions` and confirm `invite-user` appears.

---

### Task 3: TypeScript Types and DB Helpers

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/db/invitations.ts`
- Create: `src/lib/db/legacy-users.ts`
- Modify: `src/lib/db/users.ts`
- Modify: `src/lib/db/index.ts`

**Step 1: Add types to `src/types/index.ts`**

Append after existing types:

```typescript
export interface LegacyUser {
  id: string;
  institution_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string | null;
  occupation: string | null;
  affiliation: string | null;
  country: string | null;
  date_registered: string | null;
  avg_progress: number;
  avg_score: number | null;
  completions: number;
  completed_percent: number;
  external_id: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  linked_user_id: string | null;
  created_at: string;
}

export interface UserInvitation {
  id: string;
  institution_id: string;
  email: string;
  role: string;
  invited_by: string;
  custom_message: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  legacy_user_id: string | null;
  sent_at: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  // Joined fields
  inviter_name?: string;
  inviter_email?: string;
}
```

**Step 2: Create `src/lib/db/legacy-users.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LegacyUser } from '@/types';

export async function getLegacyUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<LegacyUser[]> {
  const { data, error } = await supabase
    .from('legacy_users')
    .select('*')
    .eq('institution_id', institutionId)
    .order('full_name', { ascending: true });
  if (error) return [];
  return (data ?? []) as LegacyUser[];
}

export async function importLegacyUsers(
  supabase: SupabaseClient,
  users: Omit<LegacyUser, 'id' | 'created_at' | 'invited_at' | 'accepted_at' | 'linked_user_id'>[],
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const user of users) {
    const { error } = await supabase
      .from('legacy_users')
      .upsert(user, { onConflict: 'institution_id,email', ignoreDuplicates: true });
    if (error) {
      skipped++;
    } else {
      inserted++;
    }
  }
  return { inserted, skipped };
}

export async function updateLegacyUserInviteStatus(
  supabase: SupabaseClient,
  legacyUserId: string,
  invitedAt: string,
): Promise<void> {
  await supabase
    .from('legacy_users')
    .update({ invited_at: invitedAt })
    .eq('id', legacyUserId);
}
```

**Step 3: Create `src/lib/db/invitations.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInvitation } from '@/types';

export async function getInvitations(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*, users!invited_by(full_name, email)')
    .eq('institution_id', institutionId)
    .order('sent_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: any) => ({
    ...row,
    inviter_name: row.users?.full_name,
    inviter_email: row.users?.email,
  })) as UserInvitation[];
}

export async function createInvitation(
  supabase: SupabaseClient,
  invitation: {
    institution_id: string;
    email: string;
    role: string;
    invited_by: string;
    custom_message?: string;
    legacy_user_id?: string;
  },
): Promise<UserInvitation | null> {
  const { data, error } = await supabase
    .from('user_invitations')
    .insert(invitation)
    .select()
    .single();
  if (error) return null;
  return data as UserInvitation;
}

export async function cancelInvitation(
  supabase: SupabaseClient,
  invitationId: string,
): Promise<void> {
  await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);
}
```

**Step 4: Add user management helpers to `src/lib/db/users.ts`**

Append to existing file:

```typescript
export interface ActiveUser {
  id: string;
  email: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  enrollment_count: number;
  last_activity: string | null;
}

export async function getActiveUsers(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ActiveUser[]> {
  // Get users who belong to this institution
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name, avatar_url, created_at, updated_at')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  // Enrich with enrollment counts
  const userIds = data.map((u) => u.id);
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('user_id')
    .in('user_id', userIds);

  const enrollmentCounts: Record<string, number> = {};
  for (const e of enrollments ?? []) {
    enrollmentCounts[e.user_id] = (enrollmentCounts[e.user_id] || 0) + 1;
  }

  // Get last activity from progress table
  const { data: progress } = await supabase
    .from('progress')
    .select('user_id, completed_at')
    .in('user_id', userIds)
    .order('completed_at', { ascending: false });

  const lastActivity: Record<string, string> = {};
  for (const p of progress ?? []) {
    if (p.completed_at && !lastActivity[p.user_id]) {
      lastActivity[p.user_id] = p.completed_at;
    }
  }

  return data.map((u) => ({
    ...u,
    enrollment_count: enrollmentCounts[u.id] || 0,
    last_activity: lastActivity[u.id] || null,
  }));
}

export async function updateUserRole(
  supabase: SupabaseClient,
  userId: string,
  role: string,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateUserDetails(
  supabase: SupabaseClient,
  userId: string,
  changes: { full_name?: string; role?: string; bio?: string },
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function deactivateUser(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('institution_memberships')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('institution_id', institutionId);
  if (error) throw error;
}

export async function removeUserFromCourse(
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<void> {
  await supabase
    .from('course_enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  // Also clean up progress for lessons in that course
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId);
  if (lessons && lessons.length > 0) {
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .in('lesson_id', lessons.map((l) => l.id));
  }
}
```

**Step 5: Update barrel `src/lib/db/index.ts`**

Add:
```typescript
export * from './invitations';
export * from './legacy-users';
```

**Step 6: Commit**

```
feat: add user management types and db helpers
```

---

### Task 4: API Route — `/api/admin/users/invite`

**Files:**
- Create: `src/app/api/admin/users/invite/route.ts`

**Step 1: Create the invite API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { createInvitation } from '@/lib/db/invitations';
import { updateLegacyUserInviteStatus } from '@/lib/db/legacy-users';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminRoles = ['platform_admin', 'institution_admin', 'instructor', 'admin'];
  if (!profile || !adminRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { institutionId } = await getTenantContext();
  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  }

  const body = await request.json();
  const { email, role, customMessage, legacyUserId } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
  }

  try {
    // Call the edge function to send the invite
    const { data: { session } } = await supabase.auth.getSession();
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`;

    const inviteRes = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email,
        redirectTo: `${request.nextUrl.origin}/gansid/login`,
      }),
    });

    const inviteData = await inviteRes.json();
    if (!inviteRes.ok) {
      return NextResponse.json(
        { error: inviteData.error || 'Failed to send invite' },
        { status: inviteRes.status },
      );
    }

    // Record the invitation in our table
    const invitation = await createInvitation(supabase, {
      institution_id: institutionId,
      email,
      role,
      invited_by: user.id,
      custom_message: customMessage || undefined,
      legacy_user_id: legacyUserId || undefined,
    });

    // If this is a legacy user invite, update their invited_at
    if (legacyUserId) {
      await updateLegacyUserInviteStatus(
        supabase,
        legacyUserId,
        new Date().toISOString(),
      );
    }

    return NextResponse.json({ invitation, invitedUser: inviteData.user });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```
feat: add admin invite API route
```

---

### Task 5: API Route — `/api/admin/users/import`

**Files:**
- Create: `src/app/api/admin/users/import/route.ts`

**Step 1: Create the import API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminRoles = ['platform_admin', 'institution_admin', 'instructor', 'admin'];
  if (!profile || !adminRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { institutionId } = await getTenantContext();
  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  }

  const body = await request.json();
  const { users } = body;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: 'Users array is required' }, { status: 400 });
  }

  // Cap at 500 per batch
  if (users.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 users per import' }, { status: 400 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.email) { skipped++; continue; }
    const { error } = await supabase
      .from('legacy_users')
      .upsert({
        institution_id: institutionId,
        email: u.email.trim().toLowerCase(),
        full_name: u.full_name || null,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        roles: u.roles || null,
        occupation: u.occupation || null,
        affiliation: u.affiliation || null,
        country: u.country || null,
        date_registered: u.date_registered || null,
        avg_progress: u.avg_progress ?? 0,
        avg_score: u.avg_score ?? null,
        completions: u.completions ?? 0,
        completed_percent: u.completed_percent ?? 0,
        external_id: u.external_id || null,
      }, { onConflict: 'institution_id,email', ignoreDuplicates: false });

    if (error) { skipped++; } else { inserted++; }
  }

  return NextResponse.json({ inserted, skipped, total: users.length });
}
```

**Step 2: Commit**

```
feat: add legacy user CSV import API route
```

---

### Task 6: Admin Nav Update + Users Page Shell

**Files:**
- Modify: `src/app/admin/layout.tsx:61-87` (add Users nav link)
- Create: `src/app/admin/users/page.tsx`

**Step 1: Add Users nav link to layout**

In `src/app/admin/layout.tsx`, insert after the Analytics link (line 71):

```typescript
    {
      href: '/gansid/admin/users',
      label: 'Users',
      icon: 'Users',
    },
```

**Step 2: Create the server page**

Create `src/app/admin/users/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getActiveUsers } from '@/lib/db/users';
import { getInvitations } from '@/lib/db/invitations';
import { getLegacyUsers } from '@/lib/db/legacy-users';
import { UserManagementDashboard } from './user-management-dashboard';

export default async function UsersPage() {
  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return <div className="text-center py-12 text-slate-500">Institution not found.</div>;
  }

  const [activeUsers, invitations, legacyUsers] = await Promise.all([
    getActiveUsers(supabase, institutionId),
    getInvitations(supabase, institutionId),
    getLegacyUsers(supabase, institutionId),
  ]);

  return (
    <UserManagementDashboard
      activeUsers={activeUsers}
      invitations={invitations}
      legacyUsers={legacyUsers}
      institutionId={institutionId}
    />
  );
}
```

**Step 3: Commit**

```
feat: add users nav link and page shell
```

---

### Task 7: User Management Dashboard — Client Component

**Files:**
- Create: `src/app/admin/users/user-management-dashboard.tsx`

This is the main client component with the 3-tab interface. It contains:

1. **Header** with title + "Invite User" button
2. **Tabs**: Active Users | Pending Invites (count) | Legacy Users (count)
3. **Active Users tab**: searchable table with row action dropdowns
4. **Pending Invites tab**: table with resend/cancel actions
5. **Legacy Users tab**: searchable table with checkboxes, bulk invite, CSV import button

This file will be large (~400 lines). Key sections:

- `InviteUserModal` — Dialog with email, role selector, custom message
- `EditUserModal` — Dialog with name, role, bio fields
- `ImportCsvModal` — Dialog for CSV upload with preview
- `ActiveUsersTable` — with search, role filter, action dropdown
- `PendingInvitesTable` — with status badges, resend/cancel
- `LegacyUsersTable` — with search, country filter, checkboxes, status badges

Each action calls the appropriate API route and refreshes via `router.refresh()`.

**Step 1: Create the full component**

Create `src/app/admin/users/user-management-dashboard.tsx` with `'use client'` directive. Imports: Card, Tabs, Badge, Dialog, Button, Input, Select components from `@/components/ui/`. Icons from `lucide-react`. Uses `useRouter` for refresh after mutations. Uses `fetch` to call `/api/admin/users/invite` and `/api/admin/users/import`.

Implementation details:
- Search is local state filtering (not server-side) — dataset is small enough
- Role filter uses the existing `Select` component
- Action dropdown is a custom `<details>` or button+menu pattern (no Dropdown component exists)
- CSV parsing done client-side before sending to import API
- Bulk invite iterates selected legacy users and calls invite API for each
- Toast notifications via `sonner` for success/error feedback

**Step 2: Commit**

```
feat: add user management dashboard with all tabs
```

---

### Task 8: Install Papa Parse for CSV Parsing

**Step 1: Install**

```bash
npm install papaparse
npm install -D @types/papaparse
```

**Step 2: Commit**

```
chore: add papaparse for CSV import
```

---

### Task 9: Seed GANSID Legacy Users

**Step 1: Create seed script**

Create `scripts/seed-legacy-users.ts` that:
- Reads `../Downloads/users.csv` and `../Downloads/user-completions.csv` (paths passed as args)
- Parses with Papa Parse
- Joins users + completions by email
- Deduplicates by email (keeps first occurrence)
- Outputs JSON for the import API or direct SQL

**Step 2: Run the import**

Either via the CSV import UI (preferred — tests the feature) or via the seed script + Supabase MCP `execute_sql`.

**Step 3: Verify**

Check `legacy_users` count matches expected (~230 unique users after dedup).

**Step 4: Commit**

```
feat: seed GANSID legacy users from EdApp export
```

---

### Task 10: Verify & Polish

**Step 1: Test all flows in browser**

- Navigate to `/gansid/admin/users`
- Verify 3 tabs render with correct data
- Test search filtering on Active Users and Legacy Users
- Test "Invite User" modal → sends invite → appears in Pending tab
- Test CSV import → upload files → preview → import → appears in Legacy tab
- Test user actions: edit, reset password, remove from course
- Test legacy user "Send Invite" → updates status badge
- Verify mobile responsiveness

**Step 2: Fix any issues found during testing**

**Step 3: Final commit**

```
feat: admin user management system complete
```
