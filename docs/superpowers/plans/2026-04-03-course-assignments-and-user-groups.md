# Course Assignments & User Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-controlled course assignment with user groups so that published courses default to all-institution visibility but can be restricted to specific users/groups.

**Architecture:** Four new database tables (`user_groups`, `user_group_members`, `course_user_assignments`, `course_group_assignments`) plus an `access_mode` column on `courses`. Two new db layer modules (`groups.ts`, `course-assignments.ts`). UI additions to the course create/edit forms, course detail page, and user management dashboard. Student course query updated to filter by assignment visibility.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), Tailwind CSS, shadcn/ui, Vitest

---

## File Map

### New Files
- `supabase/migrations/016_user_groups_and_course_assignments.sql` — DDL for all new tables, column, RLS policies
- `src/types/groups.ts` — TypeScript types for groups and assignments
- `src/lib/db/groups.ts` — DB layer for user group CRUD and membership
- `src/lib/db/course-assignments.ts` — DB layer for course assignment CRUD and visibility query
- `src/components/admin/access-mode-picker.tsx` — Reusable access toggle + group/user multi-select component
- `src/components/admin/groups-tab.tsx` — Groups tab for user management dashboard
- `src/components/admin/course-assignments-tab.tsx` — Assignments tab for course detail page
- `src/__tests__/lib/db/groups.test.ts` — Unit tests for groups db layer
- `src/__tests__/lib/db/course-assignments.test.ts` — Unit tests for course-assignments db layer

### Modified Files
- `src/types/index.ts` — Add `access_mode` to `Course` interface, re-export groups types
- `src/lib/db/index.ts` — Add barrel exports for new modules
- `src/lib/db/courses.ts` — Add `access_mode` to select queries
- `src/lib/db/users.ts` — Add `getUserGroups()` to ActiveUser enrichment
- `src/app/admin/courses/create/page.tsx` — Add AccessModePicker to creation form
- `src/components/admin/course-card-grid.tsx` — Add AccessModePicker to edit modal
- `src/app/admin/courses/[id]/page.tsx` — Add Assignments tab
- `src/app/admin/users/user-management-dashboard.tsx` — Add Groups tab, groups column on active users
- `src/app/student/page.tsx` — Replace raw course query with visibility-filtered query
- `src/components/student/course-viewer.tsx` — Keep auto-enrollment as "started" tracker (no enrollment removal needed)

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/016_user_groups_and_course_assignments.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration 016: User groups and course assignments
-- Adds user_groups, user_group_members, course_user_assignments, course_group_assignments tables
-- Adds access_mode column to courses

-- 1. Add access_mode to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'all'
  CHECK (access_mode IN ('all', 'restricted'));

-- 2. user_groups table
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, name)
);

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_groups"
  ON public.user_groups FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own institution groups"
  ON public.user_groups FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 3. user_group_members table
CREATE TABLE IF NOT EXISTS public.user_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_group_members"
  ON public.user_group_members FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own memberships"
  ON public.user_group_members FOR SELECT
  USING (user_id = auth.uid());

-- 4. course_user_assignments table
CREATE TABLE IF NOT EXISTS public.course_user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(id),
  UNIQUE (course_id, user_id)
);

ALTER TABLE public.course_user_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course_user_assignments"
  ON public.course_user_assignments FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own course assignments"
  ON public.course_user_assignments FOR SELECT
  USING (user_id = auth.uid());

-- 5. course_group_assignments table
CREATE TABLE IF NOT EXISTS public.course_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(id),
  UNIQUE (course_id, group_id)
);

ALTER TABLE public.course_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course_group_assignments"
  ON public.course_group_assignments FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can read own group course assignments"
  ON public.course_group_assignments FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.user_group_members WHERE user_id = auth.uid()
    )
  );

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_group_members_user_id ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_members_group_id ON public.user_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_course_user_assignments_course_id ON public.course_user_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_user_assignments_user_id ON public.course_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_course_id ON public.course_group_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_group_assignments_group_id ON public.course_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_courses_access_mode ON public.courses(access_mode);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: Use `mcp__claude_ai_Supabase__apply_migration` with the SQL above and name `user_groups_and_course_assignments`.

- [ ] **Step 3: Verify tables exist**

Run: Use `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_groups', 'user_group_members', 'course_user_assignments', 'course_group_assignments')
ORDER BY table_name;
```
Expected: 4 rows returned.

- [ ] **Step 4: Verify access_mode column**

Run: Use `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT column_name, data_type, column_default FROM information_schema.columns
WHERE table_name = 'courses' AND column_name = 'access_mode';
```
Expected: 1 row with default `'all'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/016_user_groups_and_course_assignments.sql
git commit -m "feat: add user_groups and course_assignments tables with RLS (migration 016)"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/groups.ts`
- Modify: `src/types/index.ts:41-53`

- [ ] **Step 1: Create the groups types file**

Create `src/types/groups.ts`:

```typescript
export interface UserGroup {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGroupWithCounts extends UserGroup {
  member_count: number;
  course_count: number;
}

export interface UserGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  added_at: string;
  // Joined fields
  email?: string;
  full_name?: string | null;
  role?: string;
}

export interface CourseUserAssignment {
  id: string;
  course_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  email?: string;
  full_name?: string | null;
}

export interface CourseGroupAssignment {
  id: string;
  course_id: string;
  group_id: string;
  assigned_at: string;
  assigned_by: string | null;
  // Joined fields
  group_name?: string;
  member_count?: number;
}

export interface CourseAssignments {
  users: CourseUserAssignment[];
  groups: CourseGroupAssignment[];
}
```

- [ ] **Step 2: Add access_mode to Course interface and re-export**

In `src/types/index.ts`, add `access_mode` to the `Course` interface (after `is_published`):

```typescript
export interface Course {
  id: string;
  institution_id?: string;
  title: string;
  description: string;
  category_id?: string;
  thumbnail_url?: string;
  created_by: string;
  is_published: boolean;
  access_mode?: 'all' | 'restricted';
  created_at: string;
  updated_at: string;
  category?: Category;
}
```

And add at the end of `src/types/index.ts`:

```typescript
export * from './groups';
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/groups.ts src/types/index.ts
git commit -m "feat: add TypeScript types for user groups and course assignments"
```

---

## Task 3: Groups DB Layer

**Files:**
- Create: `src/lib/db/groups.ts`
- Create: `src/__tests__/lib/db/groups.test.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/db/groups.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
  getUserGroupIds,
} from '@/lib/db/groups';

// Mock Supabase client
function createMockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnThis();
  chain.select = vi.fn().mockReturnThis();
  chain.insert = vi.fn().mockReturnThis();
  chain.update = vi.fn().mockReturnThis();
  chain.delete = vi.fn().mockReturnThis();
  chain.eq = vi.fn().mockReturnThis();
  chain.in = vi.fn().mockReturnThis();
  chain.order = vi.fn().mockReturnThis();
  chain.single = vi.fn().mockReturnThis();
  // Default resolve
  chain.then = undefined;
  return chain as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}

function mockResolve(mock: any, data: any) {
  // Make the last chained call resolve with { data, error: null }
  const lastCall = mock;
  lastCall.then = (_resolve: any) => Promise.resolve({ data, error: null }).then(_resolve);
  // Also support await directly
  Object.assign(lastCall, { data, error: null });
  return lastCall;
}

describe('groups db layer', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  describe('getGroups', () => {
    it('queries user_groups by institution with counts', async () => {
      const groups = [{ id: 'g1', name: 'Group 1', institution_id: 'inst1' }];
      supabase.from.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.eq.mockReturnThis();
      supabase.order.mockResolvedValue({ data: groups, error: null });

      const result = await getGroups(supabase, 'inst1');
      expect(supabase.from).toHaveBeenCalledWith('user_groups');
      expect(supabase.eq).toHaveBeenCalledWith('institution_id', 'inst1');
      expect(result).toEqual(groups);
    });
  });

  describe('createGroup', () => {
    it('inserts a new group and returns it', async () => {
      const newGroup = { id: 'g1', name: 'New Group', institution_id: 'inst1', description: null };
      supabase.from.mockReturnThis();
      supabase.insert.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.single.mockResolvedValue({ data: newGroup, error: null });

      const result = await createGroup(supabase, { name: 'New Group', institution_id: 'inst1' });
      expect(supabase.from).toHaveBeenCalledWith('user_groups');
      expect(supabase.insert).toHaveBeenCalledWith([{ name: 'New Group', institution_id: 'inst1', description: undefined }]);
      expect(result).toEqual(newGroup);
    });
  });

  describe('deleteGroup', () => {
    it('deletes a group by id', async () => {
      supabase.from.mockReturnThis();
      supabase.delete.mockReturnThis();
      supabase.eq.mockResolvedValue({ data: null, error: null });

      await deleteGroup(supabase, 'g1');
      expect(supabase.from).toHaveBeenCalledWith('user_groups');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', 'g1');
    });
  });

  describe('addGroupMembers', () => {
    it('inserts multiple members', async () => {
      supabase.from.mockReturnThis();
      supabase.insert.mockResolvedValue({ data: null, error: null });

      await addGroupMembers(supabase, 'g1', ['u1', 'u2']);
      expect(supabase.from).toHaveBeenCalledWith('user_group_members');
      expect(supabase.insert).toHaveBeenCalledWith([
        { group_id: 'g1', user_id: 'u1' },
        { group_id: 'g1', user_id: 'u2' },
      ]);
    });
  });

  describe('removeGroupMember', () => {
    it('deletes a single membership row', async () => {
      supabase.from.mockReturnThis();
      supabase.delete.mockReturnThis();
      const firstEq = vi.fn().mockReturnThis();
      supabase.eq = firstEq;
      firstEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

      await removeGroupMember(supabase, 'g1', 'u1');
      expect(supabase.from).toHaveBeenCalledWith('user_group_members');
    });
  });

  describe('getUserGroupIds', () => {
    it('returns group ids for a user', async () => {
      const memberships = [{ group_id: 'g1' }, { group_id: 'g2' }];
      supabase.from.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.eq.mockResolvedValue({ data: memberships, error: null });

      const result = await getUserGroupIds(supabase, 'u1');
      expect(supabase.from).toHaveBeenCalledWith('user_group_members');
      expect(result).toEqual(['g1', 'g2']);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/db/groups.test.ts 2>&1 | tail -20`
Expected: FAIL — module `@/lib/db/groups` not found.

- [ ] **Step 3: Implement the groups db layer**

Create `src/lib/db/groups.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserGroup, UserGroupWithCounts, UserGroupMember } from '@/types';

export async function getGroups(
  supabase: SupabaseClient,
  institutionId: string
): Promise<UserGroupWithCounts[]> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*, user_group_members(count), course_group_assignments(count)')
    .eq('institution_id', institutionId)
    .order('name');

  if (error || !data) return [];

  return data.map((g: any) => ({
    ...g,
    member_count: g.user_group_members?.[0]?.count ?? 0,
    course_count: g.course_group_assignments?.[0]?.count ?? 0,
  }));
}

export async function getGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<UserGroup | null> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) return null;
  return data;
}

export async function createGroup(
  supabase: SupabaseClient,
  input: { name: string; institution_id: string; description?: string }
): Promise<UserGroup | null> {
  const { data, error } = await supabase
    .from('user_groups')
    .insert([{ name: input.name, institution_id: input.institution_id, description: input.description }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGroup(
  supabase: SupabaseClient,
  groupId: string,
  changes: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase
    .from('user_groups')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', groupId);

  if (error) throw error;
}

export async function deleteGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

export async function getGroupMembers(
  supabase: SupabaseClient,
  groupId: string
): Promise<UserGroupMember[]> {
  const { data, error } = await supabase
    .from('user_group_members')
    .select('*, users:user_id(email, full_name, role)')
    .eq('group_id', groupId)
    .order('added_at', { ascending: false });

  if (error || !data) return [];

  return data.map((m: any) => ({
    id: m.id,
    group_id: m.group_id,
    user_id: m.user_id,
    added_at: m.added_at,
    email: m.users?.email,
    full_name: m.users?.full_name,
    role: m.users?.role,
  }));
}

export async function addGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  const rows = userIds.map((user_id) => ({ group_id: groupId, user_id }));
  const { error } = await supabase.from('user_group_members').insert(rows);
  if (error) throw error;
}

export async function removeGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getUserGroupIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data.map((r: any) => r.group_id);
}
```

- [ ] **Step 4: Add barrel export**

In `src/lib/db/index.ts`, add after the `export * from './legacy-users';` line:

```typescript
export * from './groups';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/db/groups.test.ts 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/groups.ts src/__tests__/lib/db/groups.test.ts src/lib/db/index.ts
git commit -m "feat: add groups db layer with CRUD, membership, and tests"
```

---

## Task 4: Course Assignments DB Layer

**Files:**
- Create: `src/lib/db/course-assignments.ts`
- Create: `src/__tests__/lib/db/course-assignments.test.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/lib/db/courses.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/db/course-assignments.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCourseAssignments,
  setCourseUserAssignments,
  setCourseGroupAssignments,
  getVisibleCourseIds,
} from '@/lib/db/course-assignments';

describe('course-assignments db layer', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };
  });

  describe('getCourseAssignments', () => {
    it('fetches both user and group assignments for a course', async () => {
      const userAssignments = [{ id: 'a1', course_id: 'c1', user_id: 'u1' }];
      const groupAssignments = [{ id: 'a2', course_id: 'c1', group_id: 'g1' }];

      // First call: user assignments
      supabase.from.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.eq
        .mockResolvedValueOnce({ data: userAssignments, error: null })
        // Reset chain for second call
        .mockReturnThis();
      supabase.order.mockResolvedValueOnce({ data: groupAssignments, error: null });

      const result = await getCourseAssignments(supabase, 'c1');
      expect(result.users).toBeDefined();
      expect(result.groups).toBeDefined();
    });
  });

  describe('setCourseUserAssignments', () => {
    it('deletes removed and inserts new user assignments', async () => {
      supabase.delete.mockReturnThis();
      supabase.eq.mockReturnThis();
      supabase.not.mockResolvedValue({ data: null, error: null });
      supabase.insert.mockResolvedValue({ data: null, error: null });

      await setCourseUserAssignments(supabase, 'c1', ['u1', 'u2'], 'admin1');
      expect(supabase.from).toHaveBeenCalledWith('course_user_assignments');
    });
  });

  describe('getVisibleCourseIds', () => {
    it('returns course ids the user can see', async () => {
      // Mock the RPC or query
      supabase.from.mockReturnThis();
      supabase.select.mockReturnThis();
      supabase.eq.mockResolvedValue({
        data: [{ id: 'c1' }, { id: 'c2' }],
        error: null,
      });

      const result = await getVisibleCourseIds(supabase, 'u1', 'inst1');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/db/course-assignments.test.ts 2>&1 | tail -20`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the course-assignments db layer**

Create `src/lib/db/course-assignments.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CourseAssignments, CourseUserAssignment, CourseGroupAssignment } from '@/types';

export async function getCourseAssignments(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseAssignments> {
  const [userResult, groupResult] = await Promise.all([
    supabase
      .from('course_user_assignments')
      .select('*, users:user_id(email, full_name)')
      .eq('course_id', courseId),
    supabase
      .from('course_group_assignments')
      .select('*, user_groups:group_id(name, user_group_members(count))')
      .eq('course_id', courseId),
  ]);

  const users: CourseUserAssignment[] = (userResult.data ?? []).map((a: any) => ({
    id: a.id,
    course_id: a.course_id,
    user_id: a.user_id,
    assigned_at: a.assigned_at,
    assigned_by: a.assigned_by,
    email: a.users?.email,
    full_name: a.users?.full_name,
  }));

  const groups: CourseGroupAssignment[] = (groupResult.data ?? []).map((a: any) => ({
    id: a.id,
    course_id: a.course_id,
    group_id: a.group_id,
    assigned_at: a.assigned_at,
    assigned_by: a.assigned_by,
    group_name: a.user_groups?.name,
    member_count: a.user_groups?.user_group_members?.[0]?.count ?? 0,
  }));

  return { users, groups };
}

export async function setCourseUserAssignments(
  supabase: SupabaseClient,
  courseId: string,
  userIds: string[],
  assignedBy: string
): Promise<void> {
  // Delete assignments not in the new list
  if (userIds.length > 0) {
    await supabase
      .from('course_user_assignments')
      .delete()
      .eq('course_id', courseId)
      .not('user_id', 'in', `(${userIds.join(',')})`);
  } else {
    await supabase
      .from('course_user_assignments')
      .delete()
      .eq('course_id', courseId);
  }

  // Insert new assignments (upsert-like: ignore conflicts)
  if (userIds.length > 0) {
    const rows = userIds.map((user_id) => ({
      course_id: courseId,
      user_id,
      assigned_by: assignedBy,
    }));
    await supabase
      .from('course_user_assignments')
      .upsert(rows, { onConflict: 'course_id,user_id', ignoreDuplicates: true });
  }
}

export async function setCourseGroupAssignments(
  supabase: SupabaseClient,
  courseId: string,
  groupIds: string[],
  assignedBy: string
): Promise<void> {
  if (groupIds.length > 0) {
    await supabase
      .from('course_group_assignments')
      .delete()
      .eq('course_id', courseId)
      .not('group_id', 'in', `(${groupIds.join(',')})`);
  } else {
    await supabase
      .from('course_group_assignments')
      .delete()
      .eq('course_id', courseId);
  }

  if (groupIds.length > 0) {
    const rows = groupIds.map((group_id) => ({
      course_id: courseId,
      group_id,
      assigned_by: assignedBy,
    }));
    await supabase
      .from('course_group_assignments')
      .upsert(rows, { onConflict: 'course_id,group_id', ignoreDuplicates: true });
  }
}

export async function getVisibleCourseIds(
  supabase: SupabaseClient,
  userId: string,
  institutionId: string
): Promise<string[]> {
  // Get all published courses for institution
  const { data: allCourses, error: coursesErr } = await supabase
    .from('courses')
    .select('id, access_mode')
    .eq('institution_id', institutionId)
    .eq('is_published', true);

  if (coursesErr || !allCourses) return [];

  const openCourseIds = allCourses
    .filter((c: any) => c.access_mode === 'all')
    .map((c: any) => c.id);

  const restrictedCourseIds = allCourses
    .filter((c: any) => c.access_mode === 'restricted')
    .map((c: any) => c.id);

  if (restrictedCourseIds.length === 0) return openCourseIds;

  // Check direct user assignments
  const { data: userAssignments } = await supabase
    .from('course_user_assignments')
    .select('course_id')
    .eq('user_id', userId)
    .in('course_id', restrictedCourseIds);

  // Check group assignments
  const { data: groupMemberships } = await supabase
    .from('user_group_members')
    .select('group_id')
    .eq('user_id', userId);

  const userGroupIds = (groupMemberships ?? []).map((m: any) => m.group_id);

  let groupAssignedCourseIds: string[] = [];
  if (userGroupIds.length > 0) {
    const { data: groupAssignments } = await supabase
      .from('course_group_assignments')
      .select('course_id')
      .in('group_id', userGroupIds)
      .in('course_id', restrictedCourseIds);

    groupAssignedCourseIds = (groupAssignments ?? []).map((a: any) => a.course_id);
  }

  const directCourseIds = (userAssignments ?? []).map((a: any) => a.course_id);
  const visibleRestricted = [...new Set([...directCourseIds, ...groupAssignedCourseIds])];

  return [...openCourseIds, ...visibleRestricted];
}
```

- [ ] **Step 4: Add access_mode to courses.ts select queries**

In `src/lib/db/courses.ts`, update `getCoursesByInstitution` select string from `'*, category:categories(*)'` to `'*, access_mode, category:categories(*)'`.

Note: Since `*` already includes all columns, this is technically redundant but makes the intent explicit. Actually `*` already includes `access_mode`, so no change needed in the select. The column is automatically returned. No modification to `courses.ts` is required.

- [ ] **Step 5: Add barrel export**

In `src/lib/db/index.ts`, add after the `export * from './groups';` line:

```typescript
export * from './course-assignments';
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/db/course-assignments.test.ts 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/course-assignments.ts src/__tests__/lib/db/course-assignments.test.ts src/lib/db/index.ts
git commit -m "feat: add course-assignments db layer with visibility query and tests"
```

---

## Task 5: AccessModePicker Component

**Files:**
- Create: `src/components/admin/access-mode-picker.tsx`

This is a reusable component used in both the course create form and the course edit modal. It renders:
1. A radio toggle for "All Students" vs "Restricted"
2. When restricted: a tabbed interface with searchable multi-selects for groups and users

- [ ] **Step 1: Create the component**

Create `src/components/admin/access-mode-picker.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { X, Users, User, Check, Globe, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserGroup } from '@/types';

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface AccessModePickerProps {
  accessMode: 'all' | 'restricted';
  selectedUserIds: string[];
  selectedGroupIds: string[];
  institutionId: string;
  onAccessModeChange: (mode: 'all' | 'restricted') => void;
  onSelectedUsersChange: (ids: string[]) => void;
  onSelectedGroupsChange: (ids: string[]) => void;
}

export function AccessModePicker({
  accessMode,
  selectedUserIds,
  selectedGroupIds,
  institutionId,
  onAccessModeChange,
  onSelectedUsersChange,
  onSelectedGroupsChange,
}: AccessModePickerProps) {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (accessMode !== 'restricted') return;
    const supabase = createClient();

    async function loadOptions() {
      const [groupsResult, usersResult] = await Promise.all([
        supabase
          .from('user_groups')
          .select('id, name, institution_id, description, created_at, updated_at')
          .eq('institution_id', institutionId)
          .order('name'),
        supabase
          .from('users')
          .select('id, email, full_name')
          .eq('institution_id', institutionId)
          .eq('role', 'student')
          .order('email'),
      ]);
      setGroups(groupsResult.data ?? []);
      setUsers(usersResult.data ?? []);
    }

    loadOptions();
  }, [accessMode, institutionId]);

  const selectedGroupNames = groups.filter((g) => selectedGroupIds.includes(g.id));
  const selectedUserOptions = users.filter((u) => selectedUserIds.includes(u.id));

  function toggleGroup(groupId: string) {
    if (selectedGroupIds.includes(groupId)) {
      onSelectedGroupsChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onSelectedGroupsChange([...selectedGroupIds, groupId]);
    }
  }

  function toggleUser(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onSelectedUsersChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUserIds, userId]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Course Access</Label>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant={accessMode === 'all' ? 'default' : 'outline'}
            size="sm"
            className={accessMode === 'all' ? 'bg-[#1E3A5F] hover:bg-[#162d4a] text-white' : ''}
            onClick={() => onAccessModeChange('all')}
          >
            <Globe className="w-4 h-4 mr-1" />
            All Students
          </Button>
          <Button
            type="button"
            variant={accessMode === 'restricted' ? 'default' : 'outline'}
            size="sm"
            className={accessMode === 'restricted' ? 'bg-[#1E3A5F] hover:bg-[#162d4a] text-white' : ''}
            onClick={() => onAccessModeChange('restricted')}
          >
            <Lock className="w-4 h-4 mr-1" />
            Restricted
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {accessMode === 'all'
            ? 'All students in your institution can access this course.'
            : 'Only assigned users and groups can access this course.'}
        </p>
      </div>

      {accessMode === 'restricted' && (
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups">
              <Users className="w-4 h-4 mr-1" />
              Groups {selectedGroupIds.length > 0 && `(${selectedGroupIds.length})`}
            </TabsTrigger>
            <TabsTrigger value="users">
              <User className="w-4 h-4 mr-1" />
              Users {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-2">
            {selectedGroupNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedGroupNames.map((g) => (
                  <Badge key={g.id} variant="secondary" className="gap-1">
                    {g.name}
                    <button type="button" onClick={() => toggleGroup(g.id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Popover open={groupsOpen} onOpenChange={setGroupsOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start text-slate-500">
                  <Users className="w-4 h-4 mr-2" />
                  {selectedGroupIds.length === 0 ? 'Select groups...' : 'Add more groups...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search groups..." />
                  <CommandList>
                    <CommandEmpty>No groups found.</CommandEmpty>
                    <CommandGroup>
                      {groups.map((g) => (
                        <CommandItem key={g.id} onSelect={() => toggleGroup(g.id)}>
                          <Check className={`w-4 h-4 mr-2 ${selectedGroupIds.includes(g.id) ? 'opacity-100' : 'opacity-0'}`} />
                          {g.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>

          <TabsContent value="users" className="space-y-2">
            {selectedUserOptions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUserOptions.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1">
                    {u.full_name || u.email}
                    <button type="button" onClick={() => toggleUser(u.id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Popover open={usersOpen} onOpenChange={setUsersOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-start text-slate-500">
                  <User className="w-4 h-4 mr-2" />
                  {selectedUserIds.length === 0 ? 'Select users...' : 'Add more users...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((u) => (
                        <CommandItem key={u.id} onSelect={() => toggleUser(u.id)}>
                          <Check className={`w-4 h-4 mr-2 ${selectedUserIds.includes(u.id) ? 'opacity-100' : 'opacity-0'}`} />
                          <div className="flex flex-col">
                            <span className="text-sm">{u.full_name || u.email}</span>
                            {u.full_name && <span className="text-xs text-slate-500">{u.email}</span>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify required shadcn components exist**

Run: `ls src/components/ui/command.tsx src/components/ui/popover.tsx src/components/ui/tabs.tsx 2>&1`

If `command.tsx` or `popover.tsx` are missing, install them:

```bash
npx shadcn@latest add command popover
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/access-mode-picker.tsx
git commit -m "feat: add AccessModePicker component for course access control"
```

---

## Task 6: Integrate AccessModePicker into Course Create Page

**Files:**
- Modify: `src/app/admin/courses/create/page.tsx`

- [ ] **Step 1: Add state and imports**

In `src/app/admin/courses/create/page.tsx`, add imports:

```typescript
import { AccessModePicker } from '@/components/admin/access-mode-picker';
import { setCourseUserAssignments, setCourseGroupAssignments } from '@/lib/db/course-assignments';
```

Add state variables after the existing state declarations (around line 32):

```typescript
const [accessMode, setAccessMode] = useState<'all' | 'restricted'>('all');
const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
const [institutionId, setInstitutionId] = useState<string | null>(null);
```

- [ ] **Step 2: Load institutionId on mount**

Inside the existing `useEffect` (where `loadCategories` is called), add after categories load:

```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const instId = await getUserInstitutionId(supabase, user.id);
  setInstitutionId(instId);
}
```

- [ ] **Step 3: Update handleSubmit to save access_mode and assignments**

In the `handleSubmit` function, add `access_mode: accessMode` to the insert object. After the successful insert (where `data` is returned), add:

```typescript
if (accessMode === 'restricted' && data?.id) {
  const supabase = createClient();
  await Promise.all([
    setCourseUserAssignments(supabase, data.id, selectedUserIds, user.id),
    setCourseGroupAssignments(supabase, data.id, selectedGroupIds, user.id),
  ]);
}
```

- [ ] **Step 4: Add AccessModePicker to the form JSX**

Insert the `AccessModePicker` component before the Publish switch section:

```tsx
{institutionId && (
  <AccessModePicker
    accessMode={accessMode}
    selectedUserIds={selectedUserIds}
    selectedGroupIds={selectedGroupIds}
    institutionId={institutionId}
    onAccessModeChange={setAccessMode}
    onSelectedUsersChange={setSelectedUserIds}
    onSelectedGroupsChange={setSelectedGroupIds}
  />
)}
```

- [ ] **Step 5: Test manually**

Start dev server: `npm run dev -- -p 3001`
Navigate to: `http://localhost:3001/gansid/admin/courses/create`
Verify: Access toggle appears, defaults to "All Students", switching to "Restricted" shows tabs.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/courses/create/page.tsx
git commit -m "feat: integrate AccessModePicker into course creation form"
```

---

## Task 7: Integrate AccessModePicker into Course Edit Modal

**Files:**
- Modify: `src/components/admin/course-card-grid.tsx`

- [ ] **Step 1: Add imports and state**

In `src/components/admin/course-card-grid.tsx`, add imports:

```typescript
import { AccessModePicker } from '@/components/admin/access-mode-picker';
import { getCourseAssignments, setCourseUserAssignments, setCourseGroupAssignments } from '@/lib/db/course-assignments';
```

Add state variables alongside the existing edit state:

```typescript
const [accessMode, setAccessMode] = useState<'all' | 'restricted'>('all');
const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
const [institutionId, setInstitutionId] = useState<string | null>(null);
```

- [ ] **Step 2: Load institutionId on mount**

Add a `useEffect` to fetch `institutionId`:

```typescript
useEffect(() => {
  async function loadInstitution() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('institution_id').eq('id', user.id).single();
      setInstitutionId(data?.institution_id ?? null);
    }
  }
  loadInstitution();
}, []);
```

- [ ] **Step 3: Update openEdit to load existing assignments**

In the `openEdit` function (around line 110), add after populating existing form state:

```typescript
setAccessMode((course.access_mode as 'all' | 'restricted') ?? 'all');

// Load existing assignments
const supabase = createClient();
const assignments = await getCourseAssignments(supabase, course.id);
setSelectedUserIds(assignments.users.map((a) => a.user_id));
setSelectedGroupIds(assignments.groups.map((a) => a.group_id));
```

Make `openEdit` async if it isn't already.

- [ ] **Step 4: Update handleSave to persist access_mode and assignments**

In `handleSave` (around line 154), add `access_mode: accessMode` to the update object. After the successful update, add:

```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (user && editingCourse) {
  await Promise.all([
    setCourseUserAssignments(supabase, editingCourse, selectedUserIds, user.id),
    setCourseGroupAssignments(supabase, editingCourse, selectedGroupIds, user.id),
  ]);
}
```

- [ ] **Step 5: Add AccessModePicker to the edit dialog JSX**

In the edit Dialog (around line 267-442), insert before the Published switch:

```tsx
{institutionId && (
  <AccessModePicker
    accessMode={accessMode}
    selectedUserIds={selectedUserIds}
    selectedGroupIds={selectedGroupIds}
    institutionId={institutionId}
    onAccessModeChange={setAccessMode}
    onSelectedUsersChange={setSelectedUserIds}
    onSelectedGroupsChange={setSelectedGroupIds}
  />
)}
```

- [ ] **Step 6: Add access mode badge to course cards**

In the card rendering (around line 210), add a badge next to the existing Draft badge:

```tsx
{course.access_mode === 'restricted' && (
  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
    <Lock className="w-3 h-3 mr-1" />
    Restricted
  </Badge>
)}
```

Import `Lock` from lucide-react if not already imported.

- [ ] **Step 7: Update local Course type**

In the `Course` type at the top of the file, add `access_mode`:

```typescript
type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  access_mode?: string;
  created_at: string;
  category_id: string | null;
  categories: { name: string } | null;
};
```

- [ ] **Step 8: Test manually**

Navigate to: `http://localhost:3001/gansid/admin`
Click Edit on a course card. Verify: Access toggle loads current state, Restricted shows picker, Save persists changes.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/course-card-grid.tsx
git commit -m "feat: integrate AccessModePicker into course edit modal"
```

---

## Task 8: Course Assignments Tab on Course Detail Page

**Files:**
- Create: `src/components/admin/course-assignments-tab.tsx`
- Modify: `src/app/admin/courses/[id]/page.tsx`

- [ ] **Step 1: Create the assignments tab component**

Create `src/components/admin/course-assignments-tab.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Globe, Lock, Users, User, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCourseAssignments,
  setCourseUserAssignments,
  setCourseGroupAssignments,
} from '@/lib/db/course-assignments';
import { AccessModePicker } from '@/components/admin/access-mode-picker';
import type { CourseAssignments } from '@/types';

interface CourseAssignmentsTabProps {
  courseId: string;
  institutionId: string;
  accessMode: 'all' | 'restricted';
  onAccessModeChange: (mode: 'all' | 'restricted') => void;
}

export function CourseAssignmentsTab({
  courseId,
  institutionId,
  accessMode,
  onAccessModeChange,
}: CourseAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<CourseAssignments>({ users: [], groups: [] });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [courseId]);

  async function loadAssignments() {
    setLoading(true);
    const supabase = createClient();
    const data = await getCourseAssignments(supabase, courseId);
    setAssignments(data);
    setSelectedUserIds(data.users.map((a) => a.user_id));
    setSelectedGroupIds(data.groups.map((a) => a.group_id));
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update access_mode on the course
      await supabase
        .from('courses')
        .update({ access_mode: accessMode, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      // Sync assignments
      await Promise.all([
        setCourseUserAssignments(supabase, courseId, selectedUserIds, user.id),
        setCourseGroupAssignments(supabase, courseId, selectedGroupIds, user.id),
      ]);

      await loadAssignments();
      toast.success('Assignments updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Course Access & Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AccessModePicker
          accessMode={accessMode}
          selectedUserIds={selectedUserIds}
          selectedGroupIds={selectedGroupIds}
          institutionId={institutionId}
          onAccessModeChange={onAccessModeChange}
          onSelectedUsersChange={setSelectedUserIds}
          onSelectedGroupsChange={setSelectedGroupIds}
        />

        {accessMode === 'restricted' && (
          <div className="space-y-4">
            {assignments.groups.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Currently Assigned Groups</Label>
                <div className="mt-2 space-y-1">
                  {assignments.groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium">{g.group_name}</span>
                        <Badge variant="secondary" className="text-xs">{g.member_count} members</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignments.users.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Currently Assigned Users</Label>
                <div className="mt-2 space-y-1">
                  {assignments.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm">{u.full_name || u.email}</span>
                        {u.full_name && <span className="text-xs text-slate-500">{u.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Assignments
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add Assignments section to course detail page**

In `src/app/admin/courses/[id]/page.tsx`, add import:

```typescript
import { CourseAssignmentsTab } from '@/components/admin/course-assignments-tab';
```

Add state for `accessMode` alongside existing state:

```typescript
const [accessMode, setAccessMode] = useState<'all' | 'restricted'>('all');
```

In the `fetchCourse` function, after populating `editData`, add:

```typescript
setAccessMode((courseData.access_mode as 'all' | 'restricted') ?? 'all');
```

In the JSX, add the `CourseAssignmentsTab` component after the Lessons card (around line 462):

```tsx
{course && (
  <CourseAssignmentsTab
    courseId={params.id}
    institutionId={course.institution_id ?? ''}
    accessMode={accessMode}
    onAccessModeChange={setAccessMode}
  />
)}
```

- [ ] **Step 3: Test manually**

Navigate to: `http://localhost:3001/gansid/admin/courses/<any-course-id>`
Verify: Assignments section appears below lessons. Toggle works. Save persists.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/course-assignments-tab.tsx src/app/admin/courses/[id]/page.tsx
git commit -m "feat: add course assignments tab to course detail page"
```

---

## Task 9: Groups Tab in User Management Dashboard

**Files:**
- Create: `src/components/admin/groups-tab.tsx`
- Modify: `src/app/admin/users/user-management-dashboard.tsx`

- [ ] **Step 1: Create the groups tab component**

Create `src/components/admin/groups-tab.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Plus, Pencil, Trash2, UserPlus, X, Check, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
} from '@/lib/db/groups';
import type { UserGroupWithCounts, UserGroupMember } from '@/types';

interface GroupsTabProps {
  institutionId: string;
}

export function GroupsTab({ institutionId }: GroupsTabProps) {
  const [groups, setGroups] = useState<UserGroupWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroupWithCounts | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Members management
  const [members, setMembers] = useState<UserGroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGroups();
  }, [institutionId]);

  async function loadGroups() {
    setLoading(true);
    const supabase = createClient();
    const data = await getGroups(supabase, institutionId);
    setGroups(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await createGroup(supabase, { name: name.trim(), institution_id: institutionId, description: description.trim() || undefined });
      toast.success('Group created');
      setShowCreate(false);
      setName('');
      setDescription('');
      await loadGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selectedGroup || !name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await updateGroup(supabase, selectedGroup.id, { name: name.trim(), description: description.trim() || undefined });
      toast.success('Group updated');
      setShowEdit(false);
      await loadGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await deleteGroup(supabase, selectedGroup.id);
      toast.success('Group deleted');
      setShowDelete(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  }

  async function openMembers(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setShowMembers(true);
    setMembersLoading(true);
    const supabase = createClient();
    const [membersData, usersData] = await Promise.all([
      getGroupMembers(supabase, group.id),
      supabase
        .from('users')
        .select('id, email, full_name')
        .eq('institution_id', institutionId)
        .order('email'),
    ]);
    setMembers(membersData);
    setAllUsers(usersData.data ?? []);
    setMembersLoading(false);
  }

  async function handleAddMember(userId: string) {
    if (!selectedGroup) return;
    try {
      const supabase = createClient();
      await addGroupMembers(supabase, selectedGroup.id, [userId]);
      await openMembers(selectedGroup);
      toast.success('Member added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedGroup) return;
    try {
      const supabase = createClient();
      await removeGroupMember(supabase, selectedGroup.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success('Member removed');
      await loadGroups(); // Refresh counts
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  }

  function openEdit(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setName(group.name);
    setDescription(group.description ?? '');
    setShowEdit(true);
  }

  function openDelete(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setShowDelete(true);
  }

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));
  const filteredGroups = groups.filter(
    (g) => g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={() => { setName(''); setDescription(''); setShowCreate(true); }} className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No groups yet</p>
          <p className="text-sm">Create a group to start bulk-assigning courses.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Members</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Courses</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Created</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium">{group.name}</span>
                      {group.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{group.member_count}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{group.course_count}</Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(group.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openMembers(group)} title="Manage members">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(group)} title="Edit group">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDelete(group)} title="Delete group" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Create a new user group for bulk course assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. West Africa Region" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group for?" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={saving || !name.trim()} className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedGroup?.name}&rdquo;? This will remove all members from the group and unassign it from any courses. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Members of {selectedGroup?.name}</DialogTitle>
            <DialogDescription>Add or remove users from this group.</DialogDescription>
          </DialogHeader>
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add member */}
              <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-slate-500">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add member...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users available.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((u) => (
                          <CommandItem key={u.id} onSelect={() => { handleAddMember(u.id); setAddMemberOpen(false); }}>
                            <div className="flex flex-col">
                              <span className="text-sm">{u.full_name || u.email}</span>
                              {u.full_name && <span className="text-xs text-slate-500">{u.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Member list */}
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No members yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                      <div>
                        <span className="text-sm font-medium">{m.full_name || m.email}</span>
                        {m.full_name && <span className="text-xs text-slate-500 ml-2">{m.email}</span>}
                        {m.role && <Badge variant="outline" className="ml-2 text-xs">{m.role}</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.user_id)} className="text-red-600 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembers(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Add Groups tab to user management dashboard**

In `src/app/admin/users/user-management-dashboard.tsx`:

Add import:
```typescript
import { GroupsTab } from '@/components/admin/groups-tab';
```

In the Tabs component (around line 1090), add a new TabsTrigger in the TabsList:

```tsx
<TabsTrigger value="groups" className="gap-1">
  <Users className="w-4 h-4" />
  Groups
</TabsTrigger>
```

Add a new TabsContent after the legacy users tab:

```tsx
<TabsContent value="groups">
  <GroupsTab institutionId={institutionId} />
</TabsContent>
```

- [ ] **Step 3: Add groups badges to Active Users tab**

In the `ActiveUsersTab` component (around line 571), this requires fetching group memberships. Since this is a sub-component that receives `users: ActiveUser[]`, the simplest approach is to fetch group data inside the tab.

Add at the top of `ActiveUsersTab`:

```typescript
const [userGroupMap, setUserGroupMap] = useState<Record<string, string[]>>({});

useEffect(() => {
  async function loadUserGroups() {
    const supabase = createClient();
    const { data } = await supabase
      .from('user_group_members')
      .select('user_id, user_groups:group_id(name)')
      .in('user_id', users.map((u) => u.id));
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((row: any) => {
        if (!map[row.user_id]) map[row.user_id] = [];
        map[row.user_id].push(row.user_groups?.name ?? '');
      });
      setUserGroupMap(map);
    }
  }
  if (users.length > 0) loadUserGroups();
}, [users]);
```

Add a "Groups" column header to the table (after "Last Active"):

```tsx
<th className="text-left py-3 px-4 font-medium text-slate-600">Groups</th>
```

Add the groups cell in each row (after the Last Active cell):

```tsx
<td className="py-3 px-4">
  <div className="flex flex-wrap gap-1">
    {(userGroupMap[user.id] ?? []).map((name, i) => (
      <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
    ))}
  </div>
</td>
```

Add `createClient` import if not already present:
```typescript
import { createClient } from '@/lib/supabase/client';
```

- [ ] **Step 4: Test manually**

Navigate to: `http://localhost:3001/gansid/admin/users`
Verify: Groups tab appears. Can create/edit/delete groups. Can manage members. Groups badges show on Active Users tab.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/groups-tab.tsx src/app/admin/users/user-management-dashboard.tsx
git commit -m "feat: add Groups tab to user management with full CRUD and member management"
```

---

## Task 10: Student Portal Visibility Filter

**Files:**
- Modify: `src/app/student/page.tsx`

- [ ] **Step 1: Update course query to use visibility filter**

In `src/app/student/page.tsx`, add import:

```typescript
import { getVisibleCourseIds } from '@/lib/db/course-assignments';
```

After the existing course fetch (around line 50-62), replace the raw query with a visibility-filtered approach.

Replace the existing courses query block:

```typescript
// Old: fetches all published courses for institution
const { data: coursesRaw } = await supabase
  .from('courses')
  .select('id, title, description, slug, thumbnail_url, is_published, status, institution_id')
  .eq('institution_id', institutionId)
  .eq('is_published', true);
```

With:

```typescript
// Get visible course IDs based on access_mode + assignments
const visibleIds = await getVisibleCourseIds(supabase, user.id, institutionId);

let coursesRaw: any[] = [];
if (visibleIds.length > 0) {
  const { data } = await supabase
    .from('courses')
    .select('id, title, description, slug, thumbnail_url, is_published, status, institution_id')
    .in('id', visibleIds);
  coursesRaw = data ?? [];
}
```

The rest of the sorting/rendering logic stays the same.

- [ ] **Step 2: Test manually**

Navigate to: `http://localhost:3001/gansid/student`
Verify: All courses still visible (all have `access_mode = 'all'` by default). 

Then: Set one course to `access_mode = 'restricted'` in the admin portal without assigning anyone. Verify it disappears from the student view.

Then: Assign the current test user to that course. Verify it reappears.

- [ ] **Step 3: Commit**

```bash
git add src/app/student/page.tsx
git commit -m "feat: filter student course list by access_mode and assignments"
```

---

## Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add migration 016 to the migration table**

In `CLAUDE.md`, add to the Applied Migrations table:

```
| 016 | user_groups_and_course_assignments | `user_groups`, `user_group_members`, `course_user_assignments`, `course_group_assignments` tables + `courses.access_mode` column |
```

- [ ] **Step 2: Update project structure**

Add to the `lib/db/` section:

```
      groups.ts             # User group CRUD, membership management
      course-assignments.ts # Course assignment CRUD, visibility query
```

Add to `components/admin/`:

```
    admin/
      access-mode-picker.tsx    # Reusable course access toggle + user/group multi-select
      groups-tab.tsx            # Groups management for user dashboard
      course-assignments-tab.tsx # Assignments tab for course detail page
```

- [ ] **Step 3: Update Database Architecture section**

Add to the core tables diagram:

```
users → user_group_members → user_groups
courses → course_user_assignments → users
courses → course_group_assignments → user_groups
```

- [ ] **Step 4: Update Current Implementation Status**

Move from In Progress to Completed:

```
- [x] Course assignment system: access_mode toggle, user/group assignment, student visibility filtering
- [x] User groups: CRUD, membership management, groups tab in admin portal
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with course assignments and user groups"
```

---

## Task 12: Final Integration Test

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Run dev server and verify end-to-end flow**

Start: `npm run dev -- -p 3001`

Test sequence:
1. Login as admin (`tech@sicklecellanemia.ca`)
2. Go to Users -> Groups tab -> Create a group "Test Group"
3. Add a user to the group
4. Go to Courses -> Edit a course -> Set to "Restricted" -> Assign the group -> Save
5. Login as a student user -> Verify only assigned courses visible
6. Go back to admin -> Set course back to "All Students" -> Save
7. Login as student -> Verify all courses visible again

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes for course assignments and user groups"
```
