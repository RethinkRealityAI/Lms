# Course Assignments & User Groups — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add admin-controlled course assignment and user group management to the GANSID LMS. Shifts the enrollment model from student self-enrollment to admin-managed visibility: published courses are visible to all institution students by default, but admins can restrict individual courses to specific users or groups.

## Core Decisions

- **Default access:** All published courses are visible to every student in the institution.
- **Restriction model:** Admins toggle a course to "Restricted" and assign specific users and/or groups. Unassigned students cannot see or access restricted courses.
- **Groups:** Simple flat groups (name + members). Users can belong to multiple groups. Groups are scoped to an institution.
- **Assignment preservation:** Toggling a course back from "Restricted" to "All Students" preserves existing assignment rows (admin doesn't lose configuration).
- **Enrollment tracker:** `course_enrollments` remains as a "started" tracker — auto-created when a student first opens a course. Self-enrollment UI is removed.

## Database Schema

### New Tables

#### `user_groups`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `institution_id` | UUID | FK -> institutions, NOT NULL |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | default `now()` |
| `updated_at` | TIMESTAMPTZ | default `now()` |

- UNIQUE constraint on `(institution_id, name)`

#### `user_group_members`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `group_id` | UUID | FK -> user_groups ON DELETE CASCADE, NOT NULL |
| `user_id` | UUID | FK -> users ON DELETE CASCADE, NOT NULL |
| `added_at` | TIMESTAMPTZ | default `now()` |

- UNIQUE constraint on `(group_id, user_id)`

#### `course_user_assignments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `course_id` | UUID | FK -> courses ON DELETE CASCADE, NOT NULL |
| `user_id` | UUID | FK -> users ON DELETE CASCADE, NOT NULL |
| `assigned_at` | TIMESTAMPTZ | default `now()` |
| `assigned_by` | UUID | FK -> users, nullable |

- UNIQUE constraint on `(course_id, user_id)`

#### `course_group_assignments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default `gen_random_uuid()` |
| `course_id` | UUID | FK -> courses ON DELETE CASCADE, NOT NULL |
| `group_id` | UUID | FK -> user_groups ON DELETE CASCADE, NOT NULL |
| `assigned_at` | TIMESTAMPTZ | default `now()` |
| `assigned_by` | UUID | FK -> users, nullable |

- UNIQUE constraint on `(course_id, group_id)`

### Modified Tables

#### `courses` — new column

| Column | Type | Default | Constraint |
|---|---|---|---|
| `access_mode` | TEXT | `'all'` | CHECK `access_mode IN ('all', 'restricted')` |

### RLS Policies

All new tables follow the existing `is_admin()` SECURITY DEFINER pattern (never inline `FROM users`):

**`user_groups`:**
- Admin: full CRUD via `public.is_admin()`
- Students: SELECT where `institution_id` matches their institution (for populating assignment pickers is admin-only, but group name display may be needed)

**`user_group_members`:**
- Admin: full CRUD via `public.is_admin()`
- Students: SELECT own rows (`user_id = auth.uid()`)

**`course_user_assignments`:**
- Admin: full CRUD via `public.is_admin()`
- Students: SELECT own rows (`user_id = auth.uid()`)

**`course_group_assignments`:**
- Admin: full CRUD via `public.is_admin()`
- Students: SELECT where group_id is in a group they belong to

### Student Course Visibility Query

```sql
SELECT c.* FROM courses c
WHERE c.institution_id = :institution_id
  AND c.is_published = true
  AND (
    c.access_mode = 'all'
    OR EXISTS (
      SELECT 1 FROM course_user_assignments cua
      WHERE cua.course_id = c.id AND cua.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM course_group_assignments cga
      JOIN user_group_members ugm ON ugm.group_id = cga.group_id
      WHERE cga.course_id = c.id AND ugm.user_id = auth.uid()
    )
  )
```

## UI Design

### Course Create/Edit Modal

Added to the bottom of the existing form (below Thumbnail, above Save):

1. **Access toggle** — Radio or switch: "All Students" (default) | "Restricted"
2. **Assignment picker** (visible only when "Restricted"):
   - Two tabs: **Groups** | **Users**
   - Each tab: searchable combobox/popover (shadcn pattern)
   - Selected items shown as removable badge chips
   - Groups tab: lists all `user_groups` for the institution
   - Users tab: lists all students for the institution (email + full name)
3. **Save behavior:**
   - "All Students" -> `access_mode = 'all'`, existing assignment rows preserved
   - "Restricted" -> `access_mode = 'restricted'`, sync assignment rows (insert new, delete removed)
4. **Edit pre-population:** fetches current `access_mode` + assignments on modal open

### Course Detail Page — Assignments Tab

New tab alongside existing Lessons section on `/admin/courses/[id]`:

- Access mode toggle at top
- When restricted: two sections — **Assigned Groups** and **Assigned Users**
- Each section: table with rows showing name/email + remove button
- "Add Groups" / "Add Users" buttons open searchable multi-select popovers
- Groups show member count badge
- Changes saved immediately on add/remove

### User Management — Groups Tab

New tab in `/admin/users` user management dashboard alongside "Active Users", "Invitations", "Legacy Users":

**Groups list view:**
- Header: "Groups" title + "Create Group" button
- Table columns: Name | Members (count) | Courses Assigned (count) | Created | Actions
- Actions: Edit (name/description), Manage Members, Delete
- Empty state: "No groups yet — create one to start bulk-assigning courses"

**Create/Edit Group Dialog:**
- Fields: Name (required), Description (optional)
- Inserts into `user_groups` with admin's `institution_id`

**Manage Members (dialog or inline expansion):**
- Current members list with remove buttons
- Add members: searchable multi-select of institution users (email + name)
- Changes saved immediately

### Active Users Tab Enhancement

- New "Groups" column showing badge chips of groups each user belongs to

### Student Portal

- Course visibility query updated to filter by `access_mode` + assignment tables
- Self-enrollment button/flow removed; `course_enrollments` auto-insert on first course open preserved as "started" tracker
- No other student UI changes — students simply see the courses they have access to
- Direct URL navigation to restricted course returns "course not found" (existing handling)

## New Code Modules

### `src/lib/db/groups.ts`
- `getGroups(supabase, institutionId)` — list all groups with member counts
- `getGroup(supabase, groupId)` — single group with members
- `createGroup(supabase, data)` — insert group
- `updateGroup(supabase, groupId, data)` — update name/description
- `deleteGroup(supabase, groupId)` — delete group (CASCADE handles members)
- `getGroupMembers(supabase, groupId)` — list members with user details
- `addGroupMembers(supabase, groupId, userIds)` — bulk add members
- `removeGroupMember(supabase, groupId, userId)` — remove single member
- `getUserGroups(supabase, userId)` — get all groups a user belongs to

### `src/lib/db/course-assignments.ts`
- `getCourseAssignments(supabase, courseId)` — get both user and group assignments
- `setCourseUserAssignments(supabase, courseId, userIds, assignedBy)` — sync user assignments
- `setCourseGroupAssignments(supabase, courseId, groupIds, assignedBy)` — sync group assignments
- `getVisibleCourses(supabase, userId, institutionId)` — filtered course list for students

### Modified modules
- `src/lib/db/courses.ts` — add `access_mode` to Course type and queries
- `src/lib/db/index.ts` — export new modules

## Out of Scope

- Hierarchical or typed groups (future enhancement)
- Notification to students when assigned to a course
- Course assignment history/audit log
- Batch course assignment (assigning multiple courses at once)
- Per-tenant branding of groups
- Analytics filtered by group
