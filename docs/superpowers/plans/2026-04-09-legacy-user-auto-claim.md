# Legacy User Auto-Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user signs up with an email matching a `legacy_users` row, automatically pre-fill their profile with occupation/affiliation/country and migrate group memberships.

**Architecture:** A Postgres `claim_legacy_profile()` function called from the existing `handle_new_user()` auth trigger. Three new nullable columns on `users`. Profile page updated to show/edit the new fields.

**Tech Stack:** Supabase Postgres (migration via MCP), TypeScript, React, Vitest

**Spec:** `docs/superpowers/specs/2026-04-09-legacy-user-auto-claim-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/021_add_user_demographics_and_legacy_claim.sql` | Migration: columns + `claim_legacy_profile()` + updated trigger |
| Modify | `src/types/index.ts:22-31` | Add `occupation`, `affiliation`, `country` to `User` interface |
| Modify | `src/lib/db/users.ts:69-79` | Expand `updateUserDetails` changes type to include new fields |
| Create | `src/lib/db/users.test.ts` (append) | Test `updateUserDetails` with new fields |
| Modify | `src/app/student/profile/page.tsx` | Add three form fields + include in save/load |

---

### Task 1: Write and Apply the Migration

This migration adds demographic columns to `users`, creates the `claim_legacy_profile()` function, and updates the `handle_new_user()` trigger.

**Files:**
- Create: `supabase/migrations/021_add_user_demographics_and_legacy_claim.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration 021: Add user demographics and legacy profile auto-claim
-- Adds occupation, affiliation, country to users table.
-- Creates claim_legacy_profile() function called by handle_new_user() trigger.

-- 1. Add demographic columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS country text;

-- 2. Create claim_legacy_profile() function
CREATE OR REPLACE FUNCTION public.claim_legacy_profile(p_user_id uuid, p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_legacy legacy_users%ROWTYPE;
BEGIN
  -- Find unclaimed legacy user by email (case-insensitive)
  SELECT * INTO v_legacy
  FROM public.legacy_users
  WHERE lower(email) = lower(p_email)
    AND linked_user_id IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Copy demographic fields to users row
  UPDATE public.users
  SET
    occupation     = COALESCE(v_legacy.occupation, occupation),
    affiliation    = COALESCE(v_legacy.affiliation, affiliation),
    country        = COALESCE(v_legacy.country, country),
    institution_id = COALESCE(institution_id, v_legacy.institution_id),
    updated_at     = now()
  WHERE id = p_user_id;

  -- Mark legacy record as claimed
  UPDATE public.legacy_users
  SET linked_user_id = p_user_id, accepted_at = now()
  WHERE id = v_legacy.id;

  -- Migrate group memberships from legacy_user_id to user_id
  UPDATE public.user_group_members
  SET user_id = p_user_id, legacy_user_id = NULL
  WHERE legacy_user_id = v_legacy.id;

  -- Mark any pending invitations as accepted
  UPDATE public.user_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE legacy_user_id = v_legacy.id
    AND status = 'pending';
END;
$$;

-- 3. Update handle_new_user() trigger to call claim_legacy_profile()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );

  -- Attempt to claim a matching legacy profile
  PERFORM public.claim_legacy_profile(NEW.id, NEW.email);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Write this file to `supabase/migrations/021_add_user_demographics_and_legacy_claim.sql`.

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__claude_ai_Supabase__apply_migration` with:
- `project_id`: `ylmnbbrpaeiogdeqezlo`
- `name`: `add_user_demographics_and_legacy_claim`
- `query`: (contents of the migration file above)

Expected: Migration applied successfully.

- [ ] **Step 3: Verify columns exist**

Run: `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('occupation', 'affiliation', 'country')
ORDER BY column_name;
```

Expected: Three rows, all `text`, all `YES` nullable.

- [ ] **Step 4: Verify claim function exists**

Run: `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'claim_legacy_profile' AND routine_schema = 'public';
```

Expected: One row returned.

- [ ] **Step 5: Verify trigger updated**

Run: `mcp__claude_ai_Supabase__execute_sql` with:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

Expected: Source contains `claim_legacy_profile`.

- [ ] **Step 6: Update `supabase-trigger-setup.sql` reference file**

Update `supabase-trigger-setup.sql` at the project root to match the new trigger definition so the reference file stays in sync. Replace the `handle_new_user()` function body with the new version that includes the `PERFORM public.claim_legacy_profile(NEW.id, NEW.email);` line.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/021_add_user_demographics_and_legacy_claim.sql supabase-trigger-setup.sql
git commit -m "feat: migration 021 — user demographics columns + legacy auto-claim trigger"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts:22-31`

- [ ] **Step 1: Add fields to User interface**

In `src/types/index.ts`, find the `User` interface (line 22-31) and add three optional fields after `bio`:

```typescript
export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  occupation?: string;
  affiliation?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No new type errors (the new fields are optional, so all existing code is compatible).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add occupation, affiliation, country to User type"
```

---

### Task 3: Expand `updateUserDetails` in `lib/db/users.ts`

**Files:**
- Modify: `src/lib/db/users.ts:69-79`
- Modify: `src/lib/db/users.test.ts` (append new tests)

- [ ] **Step 1: Write failing test for updateUserDetails with new fields**

Append to `src/lib/db/users.test.ts`:

```typescript
import { getUserInstitutionId, updateUserDetails } from './users';

// ... (existing tests above)

describe('updateUserDetails', () => {
  it('passes demographic fields through to supabase update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const sb = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as unknown as SupabaseClient;

    await updateUserDetails(sb, 'user-1', {
      occupation: 'Doctor',
      affiliation: 'WHO',
      country: 'Ghana',
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        occupation: 'Doctor',
        affiliation: 'WHO',
        country: 'Ghana',
      }),
    );
  });

  it('throws when supabase returns an error', async () => {
    const mockEq = vi.fn().mockResolvedValue({
      error: { message: 'update failed' },
    });
    const sb = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: mockEq }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      updateUserDetails(sb, 'user-1', { full_name: 'Test' }),
    ).rejects.toThrow();
  });
});
```

Also update the import at the top of the file to include `updateUserDetails`:
```typescript
import { getUserInstitutionId, updateUserDetails } from './users';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/db/users.test.ts`

Expected: The "passes demographic fields" test FAILS because `updateUserDetails` doesn't accept `occupation`/`affiliation`/`country` in its type yet.

- [ ] **Step 3: Update the function signature**

In `src/lib/db/users.ts`, change line 72 from:

```typescript
  changes: { full_name?: string; role?: string; bio?: string },
```

to:

```typescript
  changes: { full_name?: string; role?: string; bio?: string; occupation?: string; affiliation?: string; country?: string },
```

No other code changes needed — the spread `{ ...changes, updated_at: ... }` already passes all fields through.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/db/users.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/users.ts src/lib/db/users.test.ts
git commit -m "feat: expand updateUserDetails to accept demographic fields"
```

---

### Task 4: Add Demographic Fields to Profile Page

**Files:**
- Modify: `src/app/student/profile/page.tsx`

- [ ] **Step 1: Add Lucide icons import**

In `src/app/student/profile/page.tsx` line 14, add `Briefcase`, `Building2`, `Globe` to the existing Lucide import:

```typescript
import { User, Mail, Loader2, Save, Camera, ShieldCheck, Key, LogOut, BookOpen, CheckCircle, Award, BarChart3, Briefcase, Building2, Globe } from 'lucide-react';
```

- [ ] **Step 2: Add fields to formData state**

Change the `formData` useState (line 25-29) from:

```typescript
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
  });
```

to:

```typescript
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    occupation: '',
    affiliation: '',
    country: '',
  });
```

- [ ] **Step 3: Update loadProfile to populate new fields**

Change the `setFormData` call inside `loadProfile` (line 52-56) from:

```typescript
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        });
```

to:

```typescript
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          occupation: data.occupation || '',
          affiliation: data.affiliation || '',
          country: data.country || '',
        });
```

- [ ] **Step 4: Add new fields to save handler**

Change the `update()` call in `handleSubmit` (line 153-158) from:

```typescript
      const { error } = await supabase
        .from('users')
        .update({
          full_name: trimmedName,
          bio: formData.bio.trim(),
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
```

to:

```typescript
      const { error } = await supabase
        .from('users')
        .update({
          full_name: trimmedName,
          bio: formData.bio.trim(),
          avatar_url: formData.avatar_url,
          occupation: formData.occupation.trim() || null,
          affiliation: formData.affiliation.trim() || null,
          country: formData.country.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
```

Note: `|| null` converts empty strings to null so we store null in the DB rather than empty strings.

- [ ] **Step 5: Add form fields to the JSX**

After the existing email/name grid (line 349, the closing `</div>` of `grid gap-6 md:grid-cols-2`) and before the Bio textarea (line 351), insert a new row:

```tsx
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="occupation" className="text-xs font-black uppercase tracking-widest text-slate-400">Occupation</Label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="occupation"
                    type="text"
                    placeholder="e.g. Healthcare Professional"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    maxLength={100}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="affiliation" className="text-xs font-black uppercase tracking-widest text-slate-400">Affiliation</Label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="affiliation"
                    type="text"
                    placeholder="e.g. Sickle Cell Foundation"
                    value={formData.affiliation}
                    onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
                    maxLength={150}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-black uppercase tracking-widest text-slate-400">Country</Label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="country"
                    type="text"
                    placeholder="e.g. Nigeria"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    maxLength={100}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
```

This goes between the `</div>` closing the email/name grid and the `<div className="space-y-1.5">` that opens the Bio textarea.

- [ ] **Step 6: Run dev server and visually verify**

Run: `npm run dev -- -p 3001`

Navigate to `http://localhost:3001/gansid/student/profile` and verify:
- Three new fields (Occupation, Affiliation, Country) appear between the Name/Email row and the Bio textarea
- Fields have icons (Briefcase, Building2, Globe)
- Fields save and reload correctly
- Layout is a clean 3-column grid on desktop, stacking on mobile

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`

Expected: All existing tests pass. No regressions.

- [ ] **Step 8: Commit**

```bash
git add src/app/student/profile/page.tsx
git commit -m "feat: add occupation, affiliation, country fields to student profile page"
```

---

### Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add migration 021 to the Applied Migrations table**

In `CLAUDE.md`, find the Applied Migrations table and add a row after migration 020:

```
| 021 | add_user_demographics_and_legacy_claim | `occupation`, `affiliation`, `country` on users + `claim_legacy_profile()` fn + updated `handle_new_user()` trigger |
```

- [ ] **Step 2: Update User interface documentation if referenced**

Search `CLAUDE.md` for any reference to the `User` interface fields. If found, add the three new fields. (The current CLAUDE.md doesn't list User fields individually, so this may be a no-op.)

- [ ] **Step 3: Add to Completed section**

In the "Current Implementation Status" → "Completed" section, add:

```
- [x] Legacy user auto-claim: signup with matching email pre-fills occupation/affiliation/country, links legacy record, migrates group memberships
- [x] User demographic fields (occupation, affiliation, country) on profile page for all users
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with migration 021 and legacy auto-claim status"
```
