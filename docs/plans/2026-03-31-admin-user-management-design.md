# Admin User Management System — Design

**Date:** 2026-03-31
**Status:** Approved

## Summary

A comprehensive admin user management system for the GANSID LMS that allows admins to invite new users via magic link, manage existing users, and import/invite 237 legacy EdApp users with their historical completion data.

## Decisions

- **Invite flow:** Magic link via Supabase `inviteUserByEmail()` — user sets their own password
- **Legacy users:** Pre-imported as "pending" in a `legacy_users` table; admin can browse and selectively invite
- **UI layout:** Tabbed interface on a single `/admin/users` page — Active Users | Pending Invites | Legacy Users
- **Service role key:** Supabase Edge Function (`invite-user`) holds the key securely; API route calls the edge function

## Database Schema

### `legacy_users`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| institution_id | uuid FK → institutions | |
| email | text | unique per institution |
| full_name | text | |
| first_name / last_name | text | |
| roles | text | original EdApp roles string |
| occupation / affiliation / country | text | |
| date_registered | timestamptz | original EdApp date |
| avg_progress | numeric | 0–100 |
| avg_score | numeric | nullable |
| completions | int | courses completed count |
| completed_percent | numeric | 0–100 |
| external_id | text | EdApp user ID |
| invited_at | timestamptz | nullable — when invite sent |
| accepted_at | timestamptz | nullable — when they joined |
| linked_user_id | uuid FK → users | nullable — set on acceptance |
| created_at | timestamptz | |

### `user_invitations`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| institution_id | uuid FK → institutions | |
| email | text | |
| role | text | 'student' / 'instructor' / 'admin' |
| invited_by | uuid FK → users | |
| custom_message | text | nullable — admin's personal note |
| status | text | 'pending' / 'accepted' / 'expired' / 'cancelled' |
| legacy_user_id | uuid FK → legacy_users | nullable |
| sent_at | timestamptz | |
| accepted_at | timestamptz | nullable |
| expires_at | timestamptz | default 7 days |

## UI Layout

### Route

`/gansid/admin/users` → rewrites to `/admin/users`

### Navigation

Add "Users" link (icon: `Users`) between "Analytics" and "Categories" in admin layout nav.

### Tab 1: Active Users

- **Table columns:** Avatar + Name, Email, Role (badge), Courses Enrolled, Last Active, Joined
- **Row actions (dropdown):** View Profile, Edit Details, Reset Password, Remove from Course, Deactivate
- **Top bar:** Search input + Role filter dropdown + "Invite User" button

### Tab 2: Pending Invites

- **Table columns:** Email, Role, Invited By, Sent Date, Expires, Status (badge)
- **Row actions:** Resend Invite, Cancel Invite
- **Tab badge:** count of pending invites

### Tab 3: Legacy Users (EdApp)

- **Table columns:** Name, Email, Affiliation, Country, Progress %, Score, Completions, EdApp Registered
- **Row actions:** Send Invite, View Details
- **Top bar:** Search + Country filter + "Bulk Invite Selected" button
- **Checkboxes** for multi-select bulk invite
- **Status badge:** Not Invited / Invite Pending / Joined

### Invite User Modal

- Email input (required)
- Role selector: Student / Instructor
- Custom message textarea (optional)
- "Send Invite" button → Edge Function → Supabase invite

## Flows

### New User Invite

1. Admin fills invite modal → `POST /api/admin/users/invite`
2. API calls Supabase Edge Function `invite-user` (holds service role key)
3. Edge function calls `inviteUserByEmail()` + returns result
4. API creates `user_invitations` row (status: pending)
5. User receives magic link → sets password → auth trigger creates `users` + `institution_memberships` rows
6. Invitation status → accepted

### Legacy User Invite

1. Admin browses Legacy Users tab → "Send Invite" (or bulk select)
2. Same invite modal, pre-filled with legacy email + name
3. Same API + edge function flow
4. Sets `legacy_users.invited_at` and `user_invitations.legacy_user_id`
5. On acceptance: `legacy_users.linked_user_id` → new `users.id`

### User Management Actions

- **Edit:** Modal with name, role, bio fields → updates `users` + `institution_memberships`
- **Reset Password:** Confirm dialog → `resetPasswordForEmail()`
- **Remove from Course:** Course list with checkboxes → delete enrollments + progress
- **Deactivate:** Soft delete via `institution_memberships.is_active = false`

## Data Import

**Reusable CSV import UI** in the Legacy Users tab (not a one-time script):
- Upload button in Legacy Users tab header → opens import modal
- Accepts `users.csv` and `user-completions.csv` (EdApp export format)
- Client-side CSV parsing (Papa Parse or manual), preview table before import
- Joins on email, deduplicates, shows conflict resolution
- Inserts into `legacy_users` via API route → Supabase
- Scoped to current institution — reusable when new institutions export from EdApp
- Initial GANSID data: ~237 users, ~230 with completion data, 9 published courses
