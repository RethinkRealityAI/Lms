# Canva Integration + Certificate System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Design in Canva" functionality to the editor and build a full certificate management system with templates, PDF generation, admin dashboard, and public verification.

**Architecture:** Canva Connect API via OAuth redirect flow — users design on canva.com, exported PNGs stored in Supabase Storage. Certificate system uses templates with configurable field layouts; HTML renderer composites Canva backgrounds with dynamic data fields. `@react-pdf/renderer` generates PDFs server-side.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Storage + Auth), `@react-pdf/renderer`, `qrcode.react`, Canva Connect REST API, Tailwind CSS, shadcn/ui

---

## File Structure

### New Files

```
src/
  types/
    certificates.ts                          # Certificate + template type definitions
  lib/
    canva/
      auth.ts                                # OAuth helpers, token refresh
      api.ts                                 # Canva REST API helpers (designs, exports)
    db/
      certificate-templates.ts               # Template CRUD
      certificates.ts                        # Certificate CRUD (enhanced)
  components/
    certificates/
      certificate-renderer.tsx               # HTML certificate renderer (background + data fields)
      certificate-pdf-document.tsx           # @react-pdf/renderer Document for PDF generation
      certificate-preview-modal.tsx          # Full-size preview modal
      template-editor.tsx                    # Template create/edit form with layout config
      award-certificate-modal.tsx            # Manual award: pick template, recipients, reason
  app/
    api/
      auth/canva/route.ts                    # OAuth initiation (PKCE)
      auth/canva/callback/route.ts           # OAuth callback (token exchange)
      canva/designs/route.ts                 # Create/fetch Canva designs
      canva/return/route.ts                  # Handle Canva return redirect + export
      certificates/[id]/pdf/route.ts         # PDF generation endpoint
    admin/
      certificates/
        page.tsx                             # Server component — data fetching
        certificates-dashboard.tsx           # Client component — tabs UI
    verify/
      [certificateNumber]/page.tsx           # Public verification page

supabase/
  migrations/
    022_canva_integration.sql                # Canva columns on users + slides
    023_certificate_templates.sql            # Templates, course assignments, cert enhancements
```

### Modified Files

```
src/
  types/index.ts                             # Update Certificate interface
  lib/db/index.ts                            # Add barrel exports
  app/admin/layout.tsx                       # Add "Certificates" nav link
  components/student/course-viewer.tsx       # Enhanced cert insert with template_id + cert number
  app/student/certificates/page.tsx          # Render actual certificates, PDF download
  .env.local                                 # Add CANVA_CLIENT_ID, CANVA_CLIENT_SECRET
  package.json                               # Add @react-pdf/renderer, qrcode.react
```

---

## Task 1: Install Dependencies + Environment Setup

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install npm packages**

```bash
npm install @react-pdf/renderer qrcode.react
```

- [ ] **Step 2: Add Canva environment variables to `.env.local`**

Add these lines to `.env.local`:
```
CANVA_CLIENT_ID=placeholder_until_app_registered
CANVA_CLIENT_SECRET=placeholder_until_app_registered
NEXT_PUBLIC_CANVA_RETURN_URL=http://localhost:3001/api/canva/return
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev -- -p 3001
```

Expected: server starts without errors on port 3001.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "chore: add @react-pdf/renderer and qrcode.react dependencies"
```

---

## Task 2: Database Migrations

**Files:**
- Create: `supabase/migrations/022_canva_integration.sql`
- Create: `supabase/migrations/023_certificate_templates.sql`

- [ ] **Step 1: Create migration 022 — Canva columns**

Create `supabase/migrations/022_canva_integration.sql`:

```sql
-- Canva OAuth tokens on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_token_expires_at TIMESTAMPTZ;

-- Canva design tracking on slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_id TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_url TEXT;
```

- [ ] **Step 2: Create migration 023 — Certificate templates + enhancements**

Create `supabase/migrations/023_certificate_templates.sql`:

```sql
-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  canva_design_id TEXT,
  canva_design_url TEXT,
  layout_config JSONB NOT NULL DEFAULT '{
    "width": 1056,
    "height": 816,
    "orientation": "landscape",
    "fields": {
      "student_name": { "x": 528, "y": 320, "fontSize": 36, "fontWeight": "bold", "color": "#1E3A5F", "align": "center" },
      "course_title": { "x": 528, "y": 380, "fontSize": 24, "color": "#0F172A", "align": "center" },
      "completion_date": { "x": 528, "y": 440, "fontSize": 18, "color": "#64748B", "align": "center" },
      "certificate_number": { "x": 900, "y": 750, "fontSize": 12, "color": "#94A3B8", "align": "right" },
      "institution_name": { "x": 528, "y": 500, "fontSize": 14, "color": "#64748B", "align": "center" }
    }
  }'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_templates_default
  ON certificate_templates (institution_id) WHERE is_default = true;

-- RLS for certificate_templates
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage certificate templates"
  ON certificate_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read certificate templates"
  ON certificate_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Course-to-template assignment
CREATE TABLE IF NOT EXISTS course_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE course_certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course certificate templates"
  ON course_certificate_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read course certificate templates"
  ON course_certificate_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Enhance existing certificates table
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES certificate_templates(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES users(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS award_reason TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Certificate number sequence
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq;

-- Auto-generate certificate numbers
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  inst_slug TEXT;
  seq_val BIGINT;
BEGIN
  SELECT slug INTO inst_slug FROM institutions WHERE id = NEW.institution_id;
  seq_val := nextval('certificate_number_seq');
  NEW.certificate_number := UPPER(COALESCE(inst_slug, 'CERT')) || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certificate_number ON certificates;
CREATE TRIGGER trg_certificate_number
  BEFORE INSERT ON certificates
  FOR EACH ROW
  WHEN (NEW.certificate_number IS NULL)
  EXECUTE FUNCTION generate_certificate_number();

-- Seed default GANSID certificate template
INSERT INTO certificate_templates (institution_id, name, description, is_default, layout_config)
VALUES (
  '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a',
  'GANSID Default Certificate',
  'Default certificate of completion with GANSID branding',
  true,
  '{
    "width": 1056,
    "height": 816,
    "orientation": "landscape",
    "fields": {
      "student_name": { "x": 528, "y": 340, "fontSize": 36, "fontWeight": "bold", "color": "#FFFFFF", "align": "center" },
      "course_title": { "x": 528, "y": 400, "fontSize": 22, "color": "#E2E8F0", "align": "center" },
      "completion_date": { "x": 528, "y": 460, "fontSize": 16, "color": "#94A3B8", "align": "center" },
      "certificate_number": { "x": 940, "y": 770, "fontSize": 11, "color": "#64748B", "align": "right" },
      "institution_name": { "x": 528, "y": 520, "fontSize": 13, "color": "#94A3B8", "align": "center" }
    }
  }'::jsonb
)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 3: Apply migrations via Supabase MCP**

Run migration 022 first, then 023 via `apply_migration` MCP tool.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/022_canva_integration.sql supabase/migrations/023_certificate_templates.sql
git commit -m "feat: add certificate templates and Canva integration migrations (022, 023)"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types/certificates.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create certificate types**

Create `src/types/certificates.ts`:

```typescript
export interface CertificateFieldConfig {
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  color: string;
  align: 'left' | 'center' | 'right';
}

export interface CertificateLayoutConfig {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  fields: {
    student_name: CertificateFieldConfig;
    course_title: CertificateFieldConfig;
    completion_date: CertificateFieldConfig;
    certificate_number: CertificateFieldConfig;
    institution_name: CertificateFieldConfig;
  };
}

export interface CertificateTemplate {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  canva_design_id: string | null;
  canva_design_url: string | null;
  layout_config: CertificateLayoutConfig;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateTemplateWithCourseCount extends CertificateTemplate {
  course_count: number;
}

export interface CourseCertificateTemplate {
  id: string;
  course_id: string;
  template_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface CertificateData {
  student_name: string;
  course_title?: string;
  completion_date: string;
  certificate_number: string;
  institution_name: string;
  institution_logo?: string;
}

export interface CertificateWithDetails {
  id: string;
  user_id: string;
  course_id: string | null;
  institution_id: string;
  template_id: string | null;
  issued_at: string;
  certificate_number: string | null;
  pdf_url: string | null;
  awarded_by: string | null;
  award_reason: string | null;
  user?: { full_name: string | null; email: string };
  course?: { title: string; description: string } | null;
  template?: CertificateTemplate | null;
  awarder?: { full_name: string | null } | null;
}
```

- [ ] **Step 2: Update Certificate interface in `src/types/index.ts`**

Replace the existing `Certificate` interface (lines 214-221) with:

```typescript
export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  institution_id?: string;
  issued_at: string;
  certificate_url?: string;
  template_id?: string;
  awarded_by?: string;
  award_reason?: string;
  certificate_number?: string;
  pdf_url?: string;
  course?: Course;
}
```

- [ ] **Step 3: Add export to `src/types/index.ts`**

Add at the bottom of `src/types/index.ts`, after `export * from './groups';`:

```typescript
export * from './certificates';
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/certificates.ts src/types/index.ts
git commit -m "feat: add certificate and Canva type definitions"
```

---

## Task 4: Certificate Template DB Layer

**Files:**
- Create: `src/lib/db/certificate-templates.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Create certificate-templates.ts**

Create `src/lib/db/certificate-templates.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateTemplate, CourseCertificateTemplate } from '@/types';

export async function getCertificateTemplates(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateTemplate[]> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<CertificateTemplate | null> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDefaultCertificateTemplate(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateTemplate | null> {
  const { data, error } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCertificateTemplate(
  supabase: SupabaseClient,
  input: {
    institution_id: string;
    name: string;
    description?: string;
    layout_config?: Record<string, unknown>;
    is_default?: boolean;
    created_by: string;
  }
): Promise<CertificateTemplate> {
  // If setting as default, unset any existing default first
  if (input.is_default) {
    await supabase
      .from('certificate_templates')
      .update({ is_default: false })
      .eq('institution_id', input.institution_id)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('certificate_templates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string,
  changes: Partial<Pick<CertificateTemplate, 'name' | 'description' | 'canva_design_id' | 'canva_design_url' | 'layout_config' | 'is_default'>>
): Promise<CertificateTemplate> {
  // If setting as default, unset existing default first
  if (changes.is_default) {
    const { data: existing } = await supabase
      .from('certificate_templates')
      .select('institution_id')
      .eq('id', templateId)
      .single();

    if (existing) {
      await supabase
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('institution_id', existing.institution_id)
        .eq('is_default', true);
    }
  }

  const { data, error } = await supabase
    .from('certificate_templates')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;

  // Invalidate cached PDFs when template changes
  if (changes.canva_design_url || changes.layout_config) {
    await supabase
      .from('certificates')
      .update({ pdf_url: null })
      .eq('template_id', templateId);
  }

  return data;
}

export async function deleteCertificateTemplate(
  supabase: SupabaseClient,
  templateId: string
): Promise<void> {
  const { error } = await supabase
    .from('certificate_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

// --- Course-template assignments ---

export async function getCourseCertificateAssignments(
  supabase: SupabaseClient,
  institutionId: string
): Promise<(CourseCertificateTemplate & { course_title: string; template_name: string })[]> {
  const { data, error } = await supabase
    .from('course_certificate_templates')
    .select('*, courses:course_id(title, institution_id), certificate_templates:template_id(name)')
    .order('assigned_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => row.courses?.institution_id === institutionId)
    .map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      template_id: row.template_id,
      assigned_by: row.assigned_by,
      assigned_at: row.assigned_at,
      course_title: row.courses?.title ?? '',
      template_name: row.certificate_templates?.name ?? '',
    }));
}

export async function getCourseTemplateId(
  supabase: SupabaseClient,
  courseId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('course_certificate_templates')
    .select('template_id')
    .eq('course_id', courseId)
    .maybeSingle();

  return data?.template_id ?? null;
}

export async function assignCourseTemplate(
  supabase: SupabaseClient,
  courseId: string,
  templateId: string,
  assignedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('course_certificate_templates')
    .upsert(
      { course_id: courseId, template_id: templateId, assigned_by: assignedBy },
      { onConflict: 'course_id' }
    );

  if (error) throw error;
}

export async function removeCourseTemplate(
  supabase: SupabaseClient,
  courseId: string
): Promise<void> {
  const { error } = await supabase
    .from('course_certificate_templates')
    .delete()
    .eq('course_id', courseId);

  if (error) throw error;
}
```

- [ ] **Step 2: Add barrel export to `src/lib/db/index.ts`**

Add this line at the end of `src/lib/db/index.ts`:

```typescript
export * from './certificate-templates';
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/certificate-templates.ts src/lib/db/index.ts
git commit -m "feat: add certificate template CRUD and course-template assignment DB layer"
```

---

## Task 5: Enhanced Certificates DB Layer

**Files:**
- Create: `src/lib/db/certificates.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Create certificates.ts**

Create `src/lib/db/certificates.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateWithDetails } from '@/types';

export async function getIssuedCertificates(
  supabase: SupabaseClient,
  institutionId: string
): Promise<CertificateWithDetails[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(name, canva_design_url, layout_config, is_default),
      awarder:users!certificates_awarded_by_fkey(full_name)
    `)
    .eq('institution_id', institutionId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateWithDetails[];
}

export async function getCertificateById(
  supabase: SupabaseClient,
  certificateId: string
): Promise<CertificateWithDetails | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(*)
    `)
    .eq('id', certificateId)
    .maybeSingle();

  if (error) throw error;
  return data as CertificateWithDetails | null;
}

export async function getCertificateByNumber(
  supabase: SupabaseClient,
  certificateNumber: string
): Promise<CertificateWithDetails | null> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      user:users!certificates_user_id_fkey(full_name, email),
      course:courses!certificates_course_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(name)
    `)
    .eq('certificate_number', certificateNumber)
    .maybeSingle();

  if (error) throw error;
  return data as CertificateWithDetails | null;
}

export async function awardCertificates(
  supabase: SupabaseClient,
  input: {
    user_ids: string[];
    institution_id: string;
    template_id: string;
    course_id?: string;
    awarded_by: string;
    award_reason: string;
  }
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const userId of input.user_ids) {
    // Check for duplicate: same user + course (if course provided), or same user + template (manual)
    const query = supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId);

    if (input.course_id) {
      query.eq('course_id', input.course_id);
    } else {
      query.eq('template_id', input.template_id).is('course_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('certificates').insert({
      user_id: userId,
      course_id: input.course_id ?? null,
      institution_id: input.institution_id,
      template_id: input.template_id,
      awarded_by: input.awarded_by,
      award_reason: input.award_reason,
      issued_at: new Date().toISOString(),
    });

    if (!error) inserted++;
    else skipped++;
  }

  return { inserted, skipped };
}

export async function revokeCertificates(
  supabase: SupabaseClient,
  certificateIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from('certificates')
    .delete()
    .in('id', certificateIds);

  if (error) throw error;
}

export async function getUserCertificates(
  supabase: SupabaseClient,
  userId: string
): Promise<CertificateWithDetails[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      *,
      course:courses!certificates_course_id_fkey(title, description),
      template:certificate_templates!certificates_template_id_fkey(*)
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateWithDetails[];
}
```

- [ ] **Step 2: Add barrel export**

Add to the end of `src/lib/db/index.ts`:

```typescript
export * from './certificates';
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/certificates.ts src/lib/db/index.ts
git commit -m "feat: add enhanced certificates DB layer with award, revoke, and detail queries"
```

---

## Task 6: Canva OAuth + API Helpers

**Files:**
- Create: `src/lib/canva/auth.ts`
- Create: `src/lib/canva/api.ts`

- [ ] **Step 1: Create Canva auth helpers**

Create `src/lib/canva/auth.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes: string[];
}): string {
  const url = new URL('https://www.canva.com/api/oauth/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', params.scopes.join(' '));
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;

  const resp = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva token exchange failed: ${resp.status} ${body}`);
  }

  return resp.json();
}

export async function getCanvaAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: user } = await supabase
    .from('users')
    .select('canva_access_token, canva_refresh_token, canva_token_expires_at')
    .eq('id', userId)
    .single();

  if (!user?.canva_access_token) return null;

  const expiresAt = new Date(user.canva_token_expires_at);
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt > fiveMinFromNow) {
    return user.canva_access_token;
  }

  // Token expired or expiring soon — refresh
  if (!user.canva_refresh_token) return null;

  const clientId = process.env.CANVA_CLIENT_ID!;
  const clientSecret = process.env.CANVA_CLIENT_SECRET!;

  const resp = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.canva_refresh_token,
    }),
  });

  if (!resp.ok) return null;

  const tokens = await resp.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('users')
    .update({
      canva_access_token: tokens.access_token,
      canva_refresh_token: tokens.refresh_token,
      canva_token_expires_at: newExpiresAt,
    })
    .eq('id', userId);

  return tokens.access_token;
}

export async function storeCanvaTokens(
  supabase: SupabaseClient,
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number }
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from('users')
    .update({
      canva_access_token: tokens.access_token,
      canva_refresh_token: tokens.refresh_token,
      canva_token_expires_at: expiresAt,
    })
    .eq('id', userId);
}
```

- [ ] **Step 2: Create Canva API helpers**

Create `src/lib/canva/api.ts`:

```typescript
const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

export async function createCanvaDesign(
  accessToken: string,
  options: { width: number; height: number; title?: string }
): Promise<{ designId: string; editUrl: string }> {
  const resp = await fetch(`${CANVA_API_BASE}/designs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_type: {
        type: 'custom',
        width: options.width,
        height: options.height,
      },
      title: options.title ?? 'LMS Design',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva create design failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    designId: data.design.id,
    editUrl: data.design.urls.edit_url,
  };
}

export async function getCanvaDesign(
  accessToken: string,
  designId: string
): Promise<{ editUrl: string; viewUrl: string; title: string }> {
  const resp = await fetch(`${CANVA_API_BASE}/designs/${designId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Canva get design failed: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return {
    editUrl: data.design.urls.edit_url,
    viewUrl: data.design.urls.view_url,
    title: data.design.title,
  };
}

export async function exportCanvaDesign(
  accessToken: string,
  designId: string,
  format: { type: 'png' | 'pdf'; width?: number; quality?: string }
): Promise<string> {
  // Start export job
  const exportResp = await fetch(`${CANVA_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format,
    }),
  });

  if (!exportResp.ok) {
    const body = await exportResp.text();
    throw new Error(`Canva export failed: ${exportResp.status} ${body}`);
  }

  const exportData = await exportResp.json();
  const exportId = exportData.job.id;

  // Poll for completion (max 60 seconds)
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pollResp = await fetch(`${CANVA_API_BASE}/exports/${exportId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!pollResp.ok) continue;

    const pollData = await pollResp.json();

    if (pollData.job.status === 'success') {
      return pollData.job.urls[0];
    }

    if (pollData.job.status === 'failed') {
      throw new Error('Canva export job failed');
    }
  }

  throw new Error('Canva export timed out after 60 seconds');
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/canva/auth.ts src/lib/canva/api.ts
git commit -m "feat: add Canva OAuth helpers and REST API client"
```

---

## Task 7: Canva OAuth API Routes

**Files:**
- Create: `src/app/api/auth/canva/route.ts`
- Create: `src/app/api/auth/canva/callback/route.ts`

- [ ] **Step 1: Create OAuth initiation route**

Create `src/app/api/auth/canva/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generatePKCE, generateState, buildAuthorizeUrl } from '@/lib/canva/auth';

const CANVA_SCOPES = [
  'design:content:write',
  'design:meta:read',
  'design:content:read',
  'asset:write',
  'asset:read',
  'profile:read',
];

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3001' : ''}/api/auth/canva/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Canva not configured' }, { status: 500 });
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set('canva_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  cookieStore.set('canva_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
    scopes: CANVA_SCOPES,
  });

  return NextResponse.redirect(authorizeUrl);
}
```

- [ ] **Step 2: Create OAuth callback route**

Create `src/app/api/auth/canva/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeCanvaTokens } from '@/lib/canva/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('canva_state')?.value;
  const codeVerifier = cookieStore.get('canva_code_verifier')?.value;

  // Clean up cookies
  cookieStore.delete('canva_state');
  cookieStore.delete('canva_code_verifier');

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return new NextResponse(
      '<html><body><script>window.opener?.postMessage({type:"canva-auth-error",error:"Invalid state"},"*");window.close();</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const redirectUri = `${new URL(request.url).origin}/api/auth/canva/callback`;
    const tokens = await exchangeCodeForTokens(code, codeVerifier, redirectUri);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    await storeCanvaTokens(supabase, user.id, tokens);

    return new NextResponse(
      '<html><body><script>window.opener?.postMessage({type:"canva-auth-success"},"*");window.close();</script></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(
      `<html><body><script>window.opener?.postMessage({type:"canva-auth-error",error:${JSON.stringify(message)}},"*");window.close();</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/canva/route.ts src/app/api/auth/canva/callback/route.ts
git commit -m "feat: add Canva OAuth initiation and callback API routes"
```

---

## Task 8: Canva Design + Return API Routes

**Files:**
- Create: `src/app/api/canva/designs/route.ts`
- Create: `src/app/api/canva/return/route.ts`

- [ ] **Step 1: Create designs API route**

Create `src/app/api/canva/designs/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanvaAccessToken } from '@/lib/canva/auth';
import { createCanvaDesign, getCanvaDesign } from '@/lib/canva/api';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accessToken = await getCanvaAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json({ error: 'Canva not connected', needsAuth: true }, { status: 401 });
  }

  const body = await request.json();
  const { designId, width, height, title, entityType, entityId } = body;

  try {
    if (designId) {
      // Fetch existing design edit URL
      const design = await getCanvaDesign(accessToken, designId);
      return NextResponse.json({
        designId,
        editUrl: design.editUrl,
        entityType,
        entityId,
      });
    }

    // Create new design
    const design = await createCanvaDesign(accessToken, {
      width: width ?? 1920,
      height: height ?? 1080,
      title: title ?? 'LMS Design',
    });

    return NextResponse.json({
      designId: design.designId,
      editUrl: design.editUrl,
      entityType,
      entityId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create design';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create return handler route**

Create `src/app/api/canva/return/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanvaAccessToken } from '@/lib/canva/auth';
import { exportCanvaDesign } from '@/lib/canva/api';

export async function GET(request: NextRequest) {
  const designId = request.nextUrl.searchParams.get('designId');
  const entityType = request.nextUrl.searchParams.get('entityType'); // 'slide' or 'template'
  const entityId = request.nextUrl.searchParams.get('entityId');

  if (!designId || !entityType || !entityId) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const accessToken = await getCanvaAccessToken(supabase, user.id);
    if (!accessToken) {
      return new NextResponse('Canva not connected', { status: 401 });
    }

    // Export the design as PNG
    const downloadUrl = await exportCanvaDesign(accessToken, designId, {
      type: 'png',
      width: 1920,
    });

    // Download the image
    const imageResp = await fetch(downloadUrl);
    const imageBuffer = await imageResp.arrayBuffer();

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = entityType === 'template'
      ? `certificates/templates/${entityId}/${timestamp}.png`
      : `slides/${entityId}/${timestamp}.png`;

    const { error: uploadError } = await supabase.storage
      .from('canva-exports')
      .upload(storagePath, Buffer.from(imageBuffer), {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('canva-exports')
      .getPublicUrl(storagePath);

    // Update the entity record
    if (entityType === 'template') {
      await supabase
        .from('certificate_templates')
        .update({
          canva_design_id: designId,
          canva_design_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      // Invalidate cached PDFs
      await supabase
        .from('certificates')
        .update({ pdf_url: null })
        .eq('template_id', entityId);
    } else {
      await supabase
        .from('slides')
        .update({
          canva_design_id: designId,
          canva_design_url: publicUrl,
        })
        .eq('id', entityId);
    }

    // Return HTML that closes the tab and notifies the opener
    return new NextResponse(
      `<html><body><script>
        window.opener?.postMessage({
          type: 'canva-design-complete',
          designId: ${JSON.stringify(designId)},
          imageUrl: ${JSON.stringify(publicUrl)},
          entityType: ${JSON.stringify(entityType)},
          entityId: ${JSON.stringify(entityId)}
        }, '*');
        window.close();
      </script><p>Design saved. You can close this tab.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return new NextResponse(
      `<html><body><p>Error: ${message}</p><a href="javascript:window.close()">Close</a></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/canva/designs/route.ts src/app/api/canva/return/route.ts
git commit -m "feat: add Canva design creation and return handler API routes"
```

---

## Task 9: Certificate Renderer Component

**Files:**
- Create: `src/components/certificates/certificate-renderer.tsx`

- [ ] **Step 1: Create the certificate renderer**

Create `src/components/certificates/certificate-renderer.tsx`:

```tsx
'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { CertificateTemplate, CertificateData, CertificateFieldConfig } from '@/types';

interface CertificateRendererProps {
  template: CertificateTemplate;
  data: CertificateData;
  scale?: number;
  className?: string;
  showQR?: boolean;
}

function FieldText({
  config,
  value,
  containerWidth,
}: {
  config: CertificateFieldConfig;
  value: string;
  containerWidth: number;
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: config.y,
    fontSize: config.fontSize,
    fontWeight: (config.fontWeight as React.CSSProperties['fontWeight']) ?? 'normal',
    color: config.color,
    whiteSpace: 'nowrap',
  };

  if (config.align === 'center') {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  } else if (config.align === 'right') {
    style.right = containerWidth - config.x;
  } else {
    style.left = config.x;
  }

  return <div style={style}>{value}</div>;
}

export function CertificateRenderer({
  template,
  data,
  scale = 1,
  className = '',
  showQR = true,
}: CertificateRendererProps) {
  const { width, height, fields } = template.layout_config;
  const hasCanvaBackground = !!template.canva_design_url;

  return (
    <div
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width,
          height,
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Background layer */}
        {hasCanvaBackground ? (
          <img
            src={template.canva_design_url!}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <DefaultBackground width={width} height={height} />
        )}

        {/* Data fields layer */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {fields.student_name && (
            <FieldText
              config={fields.student_name}
              value={data.student_name}
              containerWidth={width}
            />
          )}
          {fields.course_title && data.course_title && (
            <FieldText
              config={fields.course_title}
              value={data.course_title}
              containerWidth={width}
            />
          )}
          {fields.completion_date && (
            <FieldText
              config={fields.completion_date}
              value={data.completion_date}
              containerWidth={width}
            />
          )}
          {fields.certificate_number && (
            <FieldText
              config={fields.certificate_number}
              value={data.certificate_number}
              containerWidth={width}
            />
          )}
          {fields.institution_name && (
            <FieldText
              config={fields.institution_name}
              value={data.institution_name}
              containerWidth={width}
            />
          )}
        </div>

        {/* QR Code */}
        {showQR && data.certificate_number && (
          <div style={{ position: 'absolute', bottom: 30, right: 30 }}>
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${data.certificate_number}`}
              size={80}
              bgColor="transparent"
              fgColor={hasCanvaBackground ? '#000000' : '#FFFFFF'}
              level="M"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultBackground({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #1E3A5F 0%, #0F172A 100%)',
      }}
    >
      {/* Decorative border */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
      >
        {/* Outer gold border */}
        <rect x="20" y="20" width={width - 40} height={height - 40} rx="4"
          stroke="#D4A843" strokeWidth="2" />
        {/* Inner red accent border */}
        <rect x="30" y="30" width={width - 60} height={height - 60} rx="2"
          stroke="#DC2626" strokeWidth="1" strokeOpacity="0.4" />
      </svg>

      {/* Header text */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: '#D4A843',
        fontSize: 14,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        Certificate of Completion
      </div>

      {/* Decorative line under header */}
      <div style={{
        position: 'absolute',
        top: 115,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 200,
        height: 1,
        background: 'linear-gradient(90deg, transparent, #D4A843, transparent)',
      }} />

      {/* Bottom red stripe */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 6,
        background: '#DC2626',
        borderRadius: '0 0 4px 4px',
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/certificates/certificate-renderer.tsx
git commit -m "feat: add CertificateRenderer component with default and Canva backgrounds"
```

---

## Task 10: PDF Generation

**Files:**
- Create: `src/components/certificates/certificate-pdf-document.tsx`
- Create: `src/app/api/certificates/[id]/pdf/route.ts`

- [ ] **Step 1: Create the PDF document component**

Create `src/components/certificates/certificate-pdf-document.tsx`:

```tsx
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { CertificateTemplate, CertificateData, CertificateFieldConfig } from '@/types';

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  defaultBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A5F',
  },
  headerText: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#D4A843',
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontWeight: 600,
    fontFamily: 'Times-Roman',
  },
  bottomStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#DC2626',
  },
});

function fieldStyle(config: CertificateFieldConfig, containerWidth: number) {
  const base: Record<string, unknown> = {
    position: 'absolute' as const,
    top: config.y,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight === 'bold' ? 700 : 400,
    color: config.color,
    fontFamily: 'Times-Roman',
  };

  if (config.align === 'center') {
    base.left = 0;
    base.right = 0;
    base.textAlign = 'center';
  } else if (config.align === 'right') {
    base.right = containerWidth - config.x;
    base.textAlign = 'right';
  } else {
    base.left = config.x;
  }

  return base;
}

interface CertificatePdfDocumentProps {
  template: CertificateTemplate;
  data: CertificateData;
}

export function CertificatePdfDocument({ template, data }: CertificatePdfDocumentProps) {
  const { width, height, fields } = template.layout_config;

  return (
    <Document>
      <Page size={[width, height]} style={styles.page}>
        {/* Background */}
        {template.canva_design_url ? (
          <Image src={template.canva_design_url} style={styles.backgroundImage} />
        ) : (
          <View style={styles.defaultBg}>
            <Text style={styles.headerText}>Certificate of Completion</Text>
            <View style={styles.bottomStripe} />
          </View>
        )}

        {/* Data fields */}
        {fields.student_name && (
          <Text style={fieldStyle(fields.student_name, width)}>{data.student_name}</Text>
        )}
        {fields.course_title && data.course_title && (
          <Text style={fieldStyle(fields.course_title, width)}>{data.course_title}</Text>
        )}
        {fields.completion_date && (
          <Text style={fieldStyle(fields.completion_date, width)}>{data.completion_date}</Text>
        )}
        {fields.certificate_number && (
          <Text style={fieldStyle(fields.certificate_number, width)}>{data.certificate_number}</Text>
        )}
        {fields.institution_name && (
          <Text style={fieldStyle(fields.institution_name, width)}>{data.institution_name}</Text>
        )}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create PDF API route**

Create `src/app/api/certificates/[id]/pdf/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { getCertificateById } from '@/lib/db/certificates';
import { getDefaultCertificateTemplate } from '@/lib/db/certificate-templates';
import { CertificatePdfDocument } from '@/components/certificates/certificate-pdf-document';
import type { CertificateData } from '@/types';
import React from 'react';

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cert = await getCertificateById(supabase, params.id);
  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  // If cached PDF exists, redirect to it
  if (cert.pdf_url) {
    return NextResponse.redirect(cert.pdf_url);
  }

  // Resolve template
  let template = cert.template;
  if (!template && cert.institution_id) {
    template = await getDefaultCertificateTemplate(supabase, cert.institution_id);
  }
  if (!template) {
    return NextResponse.json({ error: 'No certificate template found' }, { status: 404 });
  }

  const certData: CertificateData = {
    student_name: cert.user?.full_name ?? cert.user?.email ?? 'Student',
    course_title: cert.course?.title,
    completion_date: new Date(cert.issued_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    certificate_number: cert.certificate_number ?? cert.id.slice(0, 8),
    institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(CertificatePdfDocument, { template, data: certData })
  );

  // Upload to Supabase Storage
  const storagePath = `certificates/pdfs/${cert.id}.pdf`;
  await supabase.storage
    .from('canva-exports')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  const { data: { publicUrl } } = supabase.storage
    .from('canva-exports')
    .getPublicUrl(storagePath);

  // Cache the URL
  await supabase
    .from('certificates')
    .update({ pdf_url: publicUrl })
    .eq('id', cert.id);

  // Return the PDF directly
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${cert.certificate_number ?? cert.id}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/certificates/certificate-pdf-document.tsx src/app/api/certificates/[id]/pdf/route.ts
git commit -m "feat: add certificate PDF generation with @react-pdf/renderer"
```

---

## Task 11: Certificate Preview Modal

**Files:**
- Create: `src/components/certificates/certificate-preview-modal.tsx`

- [ ] **Step 1: Create the preview modal**

Create `src/components/certificates/certificate-preview-modal.tsx`:

```tsx
'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CertificateRenderer } from './certificate-renderer';
import { Download, Printer, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CertificateTemplate, CertificateData } from '@/types';

interface CertificatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: CertificateTemplate;
  data: CertificateData;
  certificateId?: string; // If set, enables PDF download
  isSample?: boolean;
}

export function CertificatePreviewModal({
  open,
  onClose,
  template,
  data,
  certificateId,
  isSample = false,
}: CertificatePreviewModalProps) {
  const handleDownloadPdf = () => {
    if (!certificateId) return;
    window.open(`/api/certificates/${certificateId}/pdf`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    if (!data.certificate_number) return;
    const url = `${window.location.origin}/verify/${data.certificate_number}`;
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1120px] max-h-[90vh] overflow-auto p-6">
        <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isSample ? 'Template Preview' : 'Certificate'}
            </h2>
            {isSample && (
              <p className="text-sm text-slate-500">Preview with sample data</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {certificateId && (
              <Button
                onClick={handleDownloadPdf}
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#162d4a]"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </Button>
            )}
            <Button onClick={handlePrint} size="sm" variant="outline">
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            {data.certificate_number && (
              <Button onClick={handleCopyLink} size="sm" variant="outline">
                <Link2 className="h-4 w-4 mr-1.5" />
                Copy Link
              </Button>
            )}
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-center bg-slate-100 rounded-xl p-6">
          <CertificateRenderer
            template={template}
            data={data}
            scale={0.85}
            showQR={!isSample}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/certificates/certificate-preview-modal.tsx
git commit -m "feat: add certificate preview modal with PDF download and share actions"
```

---

## Task 12: Template Editor Component

**Files:**
- Create: `src/components/certificates/template-editor.tsx`

- [ ] **Step 1: Create the template editor**

Create `src/components/certificates/template-editor.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CertificateRenderer } from './certificate-renderer';
import { Paintbrush } from 'lucide-react';
import type { CertificateTemplate, CertificateLayoutConfig, CertificateFieldConfig, CertificateData } from '@/types';

interface TemplateEditorProps {
  template?: CertificateTemplate;
  onSave: (data: {
    name: string;
    description: string;
    layout_config: CertificateLayoutConfig;
    is_default: boolean;
  }) => Promise<void>;
  onCanvaDesign: (templateId?: string) => void;
  saving?: boolean;
}

const SAMPLE_DATA: CertificateData = {
  student_name: 'Jane Doe',
  course_title: 'Fundamentals of Effective Advocacy',
  completion_date: 'April 9, 2026',
  certificate_number: 'GANSID-2026-00001',
  institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
};

const FIELD_LABELS: Record<string, string> = {
  student_name: 'Student Name',
  course_title: 'Course Title',
  completion_date: 'Completion Date',
  certificate_number: 'Certificate Number',
  institution_name: 'Institution Name',
};

export function TemplateEditor({ template, onSave, onCanvaDesign, saving }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>(
    template?.layout_config ?? {
      width: 1056,
      height: 816,
      orientation: 'landscape' as const,
      fields: {
        student_name: { x: 528, y: 340, fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', align: 'center' as const },
        course_title: { x: 528, y: 400, fontSize: 22, color: '#E2E8F0', align: 'center' as const },
        completion_date: { x: 528, y: 460, fontSize: 16, color: '#94A3B8', align: 'center' as const },
        certificate_number: { x: 940, y: 770, fontSize: 11, color: '#64748B', align: 'right' as const },
        institution_name: { x: 528, y: 520, fontSize: 13, color: '#94A3B8', align: 'center' as const },
      },
    }
  );

  const updateField = (fieldKey: string, prop: keyof CertificateFieldConfig, value: number | string) => {
    setLayoutConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldKey]: {
          ...prev.fields[fieldKey as keyof typeof prev.fields],
          [prop]: prop === 'fontSize' || prop === 'x' || prop === 'y' ? Number(value) : value,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    await onSave({ name, description, layout_config: layoutConfig, is_default: isDefault });
  };

  // Build a preview template object
  const previewTemplate: CertificateTemplate = {
    id: template?.id ?? '',
    institution_id: template?.institution_id ?? '',
    name,
    description,
    canva_design_id: template?.canva_design_id ?? null,
    canva_design_url: template?.canva_design_url ?? null,
    layout_config: layoutConfig,
    is_default: isDefault,
    created_by: null,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GANSID Advocacy Certificate"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-desc">Description</Label>
          <Textarea
            id="template-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for internal use"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} id="is-default" />
          <Label htmlFor="is-default">Set as institution default</Label>
        </div>

        <div>
          <Button
            variant="outline"
            onClick={() => onCanvaDesign(template?.id)}
            className="w-full"
          >
            <Paintbrush className="h-4 w-4 mr-2" />
            {template?.canva_design_id ? 'Edit Background in Canva' : 'Design Background in Canva'}
          </Button>
          {template?.canva_design_url && (
            <p className="text-xs text-green-600 mt-1">Canva background applied</p>
          )}
        </div>

        {/* Field position editors */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-slate-700">Field Positions</h3>
          {Object.entries(layoutConfig.fields).map(([key, config]) => (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-600">{FIELD_LABELS[key] ?? key}</p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={config.y}
                    onChange={(e) => updateField(key, 'y', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Size</Label>
                  <Input
                    type="number"
                    value={config.fontSize}
                    onChange={(e) => updateField(key, 'fontSize', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={config.color}
                    onChange={(e) => updateField(key, 'color', e.target.value)}
                    className="h-8 p-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Align</Label>
                  <select
                    value={config.align}
                    onChange={(e) => updateField(key, 'align', e.target.value)}
                    className="w-full h-8 text-xs border rounded px-1"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-[#1E3A5F] hover:bg-[#162d4a]"
        >
          {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>

      {/* Right: Live Preview */}
      <div className="lg:sticky lg:top-4">
        <h3 className="text-sm font-bold text-slate-500 mb-3">Live Preview</h3>
        <div className="bg-slate-100 rounded-xl p-4 flex justify-center">
          <CertificateRenderer
            template={previewTemplate}
            data={SAMPLE_DATA}
            scale={0.5}
            showQR={false}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/certificates/template-editor.tsx
git commit -m "feat: add certificate template editor with live preview and field position controls"
```

---

## Task 13: Award Certificate Modal

**Files:**
- Create: `src/components/certificates/award-certificate-modal.tsx`

- [ ] **Step 1: Create the award modal**

Create `src/components/certificates/award-certificate-modal.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { awardCertificates } from '@/lib/db/certificates';
import { toast } from 'sonner';
import { Award, Search, Users, User } from 'lucide-react';
import type { CertificateTemplate, Course } from '@/types';

interface AwardCertificateModalProps {
  open: boolean;
  onClose: () => void;
  templates: CertificateTemplate[];
  institutionId: string;
  onAwarded: () => void;
}

interface SearchResult {
  id: string;
  email: string;
  full_name: string | null;
}

interface GroupResult {
  id: string;
  name: string;
  member_count: number;
}

export function AwardCertificateModal({
  open,
  onClose,
  templates,
  institutionId,
  onAwarded,
}: AwardCertificateModalProps) {
  const supabase = createClient();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'users' | 'group'>('users');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Load groups and courses
    supabase
      .from('user_groups')
      .select('id, name, user_group_members(count)')
      .eq('institution_id', institutionId)
      .then(({ data }) => {
        setGroups(
          (data ?? []).map((g: any) => ({
            id: g.id,
            name: g.name,
            member_count: g.user_group_members?.[0]?.count ?? 0,
          }))
        );
      });

    supabase
      .from('courses')
      .select('id, title, description, is_published, created_at, updated_at, created_by, institution_id')
      .eq('institution_id', institutionId)
      .order('title')
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, [open, institutionId]);

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
        .limit(10);
      setSearchResults((data as SearchResult[]) ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleAward = async () => {
    if (!templateId || !reason.trim()) {
      toast.error('Please select a template and provide a reason');
      return;
    }

    setAwarding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let userIds: string[];

      if (mode === 'group' && selectedGroupId) {
        const { data: members } = await supabase
          .from('user_group_members')
          .select('user_id')
          .eq('group_id', selectedGroupId)
          .not('user_id', 'is', null);
        userIds = (members ?? []).map((m: any) => m.user_id);
      } else {
        userIds = selectedUsers.map((u) => u.id);
      }

      if (userIds.length === 0) {
        toast.error('No recipients selected');
        return;
      }

      const result = await awardCertificates(supabase, {
        user_ids: userIds,
        institution_id: institutionId,
        template_id: templateId,
        course_id: courseId || undefined,
        awarded_by: user.id,
        award_reason: reason,
      });

      toast.success(`Awarded ${result.inserted} certificate(s)`, {
        description: result.skipped > 0 ? `${result.skipped} skipped (already awarded)` : undefined,
      });

      onAwarded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to award certificates');
    } finally {
      setAwarding(false);
    }
  };

  const toggleUser = (user: SearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#1E3A5F]" />
            Award Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template picker */}
          <div className="space-y-1.5">
            <Label>Template</Label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Course (optional) */}
          <div className="space-y-1.5">
            <Label>Course (optional)</Label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm"
            >
              <option value="">No course — manual award</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Recipient mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('users')}
              className={mode === 'users' ? 'bg-[#1E3A5F]' : ''}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Individual Users
            </Button>
            <Button
              variant={mode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('group')}
              className={mode === 'group' ? 'bg-[#1E3A5F]' : ''}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              User Group
            </Button>
          </div>

          {/* Recipients */}
          {mode === 'users' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                        selectedUsers.some((s) => s.id === u.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      {u.full_name ?? u.email} <span className="text-slate-400">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-blue-200"
                      onClick={() => toggleUser(u)}
                    >
                      {u.full_name ?? u.email} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Select Group</Label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full h-9 border rounded-md px-3 text-sm"
              >
                <option value="">Choose a group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Workshop attendance, Prior learning recognition..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleAward}
            disabled={awarding || !templateId || !reason.trim()}
            className="w-full bg-[#1E3A5F] hover:bg-[#162d4a]"
          >
            {awarding ? 'Awarding...' : 'Award Certificate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/certificates/award-certificate-modal.tsx
git commit -m "feat: add award certificate modal with user/group recipient selection"
```

---

## Task 14: Admin Certificates Dashboard

**Files:**
- Create: `src/app/admin/certificates/page.tsx`
- Create: `src/app/admin/certificates/certificates-dashboard.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create server page**

Create `src/app/admin/certificates/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { getCertificateTemplates, getCourseCertificateAssignments } from '@/lib/db/certificate-templates';
import { getIssuedCertificates } from '@/lib/db/certificates';
import { CertificatesDashboard } from './certificates-dashboard';

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  const institutionId = userData?.institution_id;
  if (!institutionId) return <p className="p-8">No institution found.</p>;

  const [templates, certificates, assignments] = await Promise.all([
    getCertificateTemplates(supabase, institutionId),
    getIssuedCertificates(supabase, institutionId),
    getCourseCertificateAssignments(supabase, institutionId),
  ]);

  // Get courses for the assignment tab
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('institution_id', institutionId)
    .order('title');

  return (
    <CertificatesDashboard
      templates={templates}
      certificates={certificates}
      assignments={assignments}
      courses={courses ?? []}
      institutionId={institutionId}
    />
  );
}
```

- [ ] **Step 2: Create client dashboard component**

Create `src/app/admin/certificates/certificates-dashboard.tsx`. This is a large component — it implements all three tabs: Templates, Awarded, Course Assignments.

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { createCertificateTemplate, updateCertificateTemplate, deleteCertificateTemplate, assignCourseTemplate, removeCourseTemplate } from '@/lib/db/certificate-templates';
import { revokeCertificates } from '@/lib/db/certificates';
import { CertificateRenderer } from '@/components/certificates/certificate-renderer';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import { TemplateEditor } from '@/components/certificates/template-editor';
import { AwardCertificateModal } from '@/components/certificates/award-certificate-modal';
import { toast } from 'sonner';
import { Award, Plus, Pencil, Trash2, Search, Download, Eye } from 'lucide-react';
import type { CertificateTemplate, CertificateWithDetails, CertificateData, CourseCertificateTemplate, Course } from '@/types';

interface Props {
  templates: CertificateTemplate[];
  certificates: CertificateWithDetails[];
  assignments: (CourseCertificateTemplate & { course_title: string; template_name: string })[];
  courses: Pick<Course, 'id' | 'title'>[];
  institutionId: string;
}

type Tab = 'templates' | 'awarded' | 'assignments';

const SAMPLE_DATA: CertificateData = {
  student_name: 'Jane Doe',
  course_title: 'Fundamentals of Effective Advocacy',
  completion_date: 'April 9, 2026',
  certificate_number: 'GANSID-2026-00001',
  institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
};

export function CertificatesDashboard({ templates: initialTemplates, certificates: initialCerts, assignments: initialAssignments, courses, institutionId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState(initialTemplates);
  const [certificates, setCertificates] = useState(initialCerts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCert, setPreviewCert] = useState<CertificateWithDetails | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);

  // Assign template modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleSaveTemplate = async (data: { name: string; description: string; layout_config: any; is_default: boolean }) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTemplate) {
        const updated = await updateCertificateTemplate(supabase, editingTemplate.id, data);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Template updated');
      } else {
        const created = await createCertificateTemplate(supabase, {
          ...data,
          institution_id: institutionId,
          created_by: user.id,
        });
        setTemplates((prev) => [created, ...prev]);
        toast.success('Template created');
      }
      setEditingTemplate(null);
      setCreatingTemplate(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? Certificates already issued will keep their existing design.')) return;
    try {
      await deleteCertificateTemplate(supabase, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleCanvaDesign = (templateId?: string) => {
    // Open Canva design flow — for now redirect to Canva OAuth
    const returnUrl = encodeURIComponent(`${window.location.origin}/api/canva/return?entityType=template&entityId=${templateId ?? 'new'}`);
    // This will be enhanced when Canva integration is active
    toast.info('Canva integration requires app registration at canva.dev');
  };

  const handleAssignTemplate = async () => {
    if (!assignCourseId || !assignTemplateId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await assignCourseTemplate(supabase, assignCourseId, assignTemplateId, user.id);
      toast.success('Template assigned to course');
      setAssignModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign template');
    }
  };

  const handleRemoveAssignment = async (courseId: string) => {
    try {
      await removeCourseTemplate(supabase, courseId);
      setAssignments((prev) => prev.filter((a) => a.course_id !== courseId));
      toast.success('Template assignment removed — course will use default');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  const handleRevoke = async (certIds: string[]) => {
    if (!confirm(`Revoke ${certIds.length} certificate(s)? This cannot be undone.`)) return;
    try {
      await revokeCertificates(supabase, certIds);
      setCertificates((prev) => prev.filter((c) => !certIds.includes(c.id)));
      toast.success(`${certIds.length} certificate(s) revoked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke');
    }
  };

  const filteredCerts = certificates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user?.full_name?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.certificate_number?.toLowerCase().includes(q) ||
      c.course?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F172A] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 px-4 sm:px-6 lg:px-8 py-8 rounded-b-xl">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Certificates</h1>
            <p className="text-slate-400 text-sm font-medium">Manage templates, awards, and course assignments</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {(['templates', 'awarded', 'assignments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setCreatingTemplate(false); setEditingTemplate(null); }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'templates' ? 'Templates' : t === 'awarded' ? 'Awarded' : 'Course Assignments'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'templates' && !creatingTemplate && !editingTemplate && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreatingTemplate(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Template
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="bg-slate-100 p-3 flex justify-center">
                  <CertificateRenderer template={t} data={SAMPLE_DATA} scale={0.25} showQR={false} />
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{t.name}</h3>
                      {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                    </div>
                    {t.is_default && <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">Default</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(t)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate(t)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {!t.is_default && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'templates' && (creatingTemplate || editingTemplate) && (
        <div>
          <Button variant="ghost" onClick={() => { setCreatingTemplate(false); setEditingTemplate(null); }} className="mb-4">
            &larr; Back to Templates
          </Button>
          <TemplateEditor
            template={editingTemplate ?? undefined}
            onSave={handleSaveTemplate}
            onCanvaDesign={handleCanvaDesign}
            saving={saving}
          />
        </div>
      )}

      {tab === 'awarded' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or certificate number..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAwardModal(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Award className="h-4 w-4 mr-1.5" />
              Award Certificate
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Student</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Course</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Certificate #</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Awarded By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{cert.user?.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{cert.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cert.course?.title ?? <span className="text-amber-600 font-medium">Manual Award</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{cert.certificate_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {cert.awarded_by ? (cert.awarder?.full_name ?? 'Admin') : 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewCert(cert)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/api/certificates/${cert.id}/pdf`, '_blank')}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRevoke([cert.id])}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      {searchQuery ? 'No certificates match your search' : 'No certificates awarded yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAssignModalOpen(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Template
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Course</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Template</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Assigned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const assignment = assignments.find((a) => a.course_id === course.id);
                  return (
                    <tr key={course.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{course.title}</td>
                      <td className="px-4 py-3">
                        {assignment ? (
                          <span className="text-slate-600">{assignment.template_name}</span>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-none text-xs">Using Default</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {assignment ? new Date(assignment.assigned_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {assignment && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveAssignment(course.id)}>
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Assign modal */}
          {assignModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setAssignModalOpen(false)}>
              <div className="bg-white rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg">Assign Template to Course</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Course</label>
                  <select value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)} className="w-full h-9 border rounded-md px-3 text-sm">
                    <option value="">Select course...</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Template</label>
                  <select value={assignTemplateId} onChange={(e) => setAssignTemplateId(e.target.value)} className="w-full h-9 border rounded-md px-3 text-sm">
                    <option value="">Select template...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssignTemplate} disabled={!assignCourseId || !assignTemplateId} className="bg-[#1E3A5F]">Assign</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview modals */}
      {previewTemplate && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
          data={SAMPLE_DATA}
          isSample
        />
      )}
      {previewCert && previewCert.template && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewCert(null)}
          template={previewCert.template}
          data={{
            student_name: previewCert.user?.full_name ?? previewCert.user?.email ?? 'Student',
            course_title: previewCert.course?.title,
            completion_date: new Date(previewCert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            certificate_number: previewCert.certificate_number ?? '',
            institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
          }}
          certificateId={previewCert.id}
        />
      )}

      {/* Award modal */}
      <AwardCertificateModal
        open={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        templates={templates}
        institutionId={institutionId}
        onAwarded={refresh}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add "Certificates" nav link to admin layout**

In `src/app/admin/layout.tsx`, insert a new nav item between "Analytics" and "Users" in the `navLinks` array (after line 39, before the Users entry at line 41):

```typescript
    {
      href: '/admin/certificates',
      label: 'Certificates',
      icon: 'Award',
    },
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/certificates/page.tsx src/app/admin/certificates/certificates-dashboard.tsx src/app/admin/layout.tsx
git commit -m "feat: add admin certificates dashboard with templates, awards, and course assignments tabs"
```

---

## Task 15: Public Verification Page

**Files:**
- Create: `src/app/verify/[certificateNumber]/page.tsx`

- [ ] **Step 1: Create verification page**

Create `src/app/verify/[certificateNumber]/page.tsx`:

```tsx
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCertificateByNumber } from '@/lib/db/certificates';
import { CheckCircle2, XCircle, Award } from 'lucide-react';

export default async function VerifyPage({
  params: paramsPromise,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const params = React.use(paramsPromise);
  const supabase = await createClient();
  const cert = await getCertificateByNumber(supabase, params.certificateNumber);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
            <Award className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Certificate Verification
        </h1>

        {cert ? (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <p className="text-green-700 font-bold text-lg">This certificate is valid</p>

            <div className="bg-slate-50 rounded-xl p-5 text-left space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Recipient</p>
                <p className="text-slate-900 font-medium">{cert.user?.full_name ?? cert.user?.email}</p>
              </div>
              {cert.course && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Course</p>
                  <p className="text-slate-900 font-medium">{cert.course.title}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Date Issued</p>
                <p className="text-slate-900 font-medium">
                  {new Date(cert.issued_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Certificate Number</p>
                <p className="text-slate-900 font-mono text-sm">{cert.certificate_number}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-400" />
              </div>
            </div>
            <p className="text-red-600 font-bold text-lg">Certificate not found</p>
            <p className="text-slate-500 text-sm">
              The certificate number <span className="font-mono">{params.certificateNumber}</span> was not found in our records.
            </p>
          </>
        )}

        <p className="text-xs text-slate-400 pt-4 border-t">
          Issued by GANSID Learning Management System
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/verify/[certificateNumber]/page.tsx
git commit -m "feat: add public certificate verification page"
```

---

## Task 16: Update Course Completion Flow

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

- [ ] **Step 1: Update the certificate insert logic in `course-viewer.tsx`**

Replace the certificate insert block (approximately lines 370-383 in `course-viewer.tsx`) — the section starting with `const allCompleted = lessons.every(...)`:

Find this code:
```typescript
        const allCompleted = lessons.every(l => updatedProgress[l.id]?.completed);
        if (allCompleted && lessons.length > 0) {
          const { data: existingCert } = await supabase.from('certificates').select('id')
            .eq('user_id', user.id).eq('course_id', courseId).single();
          if (!existingCert) {
            const { error: certError } = await supabase.from('certificates').insert([{
              user_id: user.id, course_id: courseId, issued_at: new Date().toISOString(),
            }]);
            if (!certError) {
              toast.success('Course Completed! 🎉', {
                description: 'A certificate has been issued. View it in your Certificates page.',
                duration: 6000,
              });
            }
          }
        }
```

Replace with:
```typescript
        const allCompleted = lessons.every(l => updatedProgress[l.id]?.completed);
        if (allCompleted && lessons.length > 0) {
          const { data: existingCert } = await supabase.from('certificates').select('id')
            .eq('user_id', user.id).eq('course_id', courseId).single();
          if (!existingCert) {
            // Resolve certificate template
            const { data: courseTemplate } = await supabase
              .from('course_certificate_templates')
              .select('template_id')
              .eq('course_id', courseId)
              .maybeSingle();

            let templateId = courseTemplate?.template_id;
            if (!templateId) {
              // Fall back to institution default template
              const { data: userData } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', user.id)
                .single();
              if (userData?.institution_id) {
                const { data: defaultTemplate } = await supabase
                  .from('certificate_templates')
                  .select('id')
                  .eq('institution_id', userData.institution_id)
                  .eq('is_default', true)
                  .maybeSingle();
                templateId = defaultTemplate?.id;
              }
            }

            const { data: newCert, error: certError } = await supabase.from('certificates').insert([{
              user_id: user.id,
              course_id: courseId,
              institution_id: (await supabase.from('courses').select('institution_id').eq('id', courseId).single()).data?.institution_id,
              template_id: templateId ?? null,
              issued_at: new Date().toISOString(),
            }]).select('id, certificate_number').single();

            if (!certError && newCert) {
              toast.success('Course Completed! 🎉', {
                description: 'A certificate has been issued. View it in your Certificates page.',
                duration: 6000,
              });
              // Pre-generate PDF (fire-and-forget)
              fetch(`/api/certificates/${newCert.id}/pdf`).catch(() => {});
            }
          }
        }
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: (Optional) Enhance completion slide with certificate preview**

In `course-viewer.tsx`, in the completion slide rendering section, add a conditional mini certificate preview when a certificate was just earned. This shows a scaled-down `<CertificateRenderer scale={0.25}>` with "View Certificate" and "Download PDF" buttons below it. This replaces the plain-text "Certificate Earned" message. Import `CertificateRenderer` dynamically to avoid increasing the initial bundle. The state for `justEarnedCert` (certificate ID + template) can be set in the `handleMarkComplete` flow after the insert succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/student/course-viewer.tsx
git commit -m "feat: enhance course completion to resolve certificate template and pre-generate PDF"
```

---

## Task 17: Update Student Certificates Page

**Files:**
- Modify: `src/app/student/certificates/page.tsx`

- [ ] **Step 1: Update the student certificates page**

Replace the entire content of `src/app/student/certificates/page.tsx` with a version that renders actual certificate thumbnails and supports PDF download. The key changes:

1. Import `CertificateRenderer` and `CertificatePreviewModal`
2. Fetch certificates with template data joined
3. Render thumbnail previews using `<CertificateRenderer scale={0.25}>`
4. "View" opens the preview modal
5. "Download PDF" hits the PDF API route
6. "Share" copies the verification URL

Replace the file content — this replaces the existing placeholder cards with actual certificate renders:

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Award, Download, Eye, Share2 } from 'lucide-react';
import { CertificateRenderer } from '@/components/certificates/certificate-renderer';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import type { CertificateWithDetails, CertificateTemplate, CertificateData } from '@/types';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState<CertificateWithDetails | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses!certificates_course_id_fkey(title, description),
          template:certificate_templates!certificates_template_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) {
        toast.error('Failed to load certificates', { description: error.message });
      } else {
        setCertificates((data ?? []) as CertificateWithDetails[]);
      }
    }
    setLoading(false);
  };

  const handleShare = async (cert: CertificateWithDetails) => {
    if (cert.certificate_number) {
      const url = `${window.location.origin}/verify/${cert.certificate_number}`;
      await navigator.clipboard.writeText(url);
      toast.success('Verification link copied to clipboard');
    } else {
      const message = `I've completed ${cert.course?.title ?? 'a course'} through GANSID's Capacity Building Curriculum! 🎓`;
      await navigator.clipboard.writeText(message);
      toast.success('Copied to clipboard!');
    }
  };

  const buildCertData = (cert: CertificateWithDetails): CertificateData => ({
    student_name: cert.user?.full_name ?? cert.user?.email ?? 'Student',
    course_title: cert.course?.title,
    completion_date: new Date(cert.issued_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    certificate_number: cert.certificate_number ?? '',
    institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-white">My Certificates</h1>
            {!loading && certificates.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 font-black text-sm px-3 py-1 rounded-full border border-amber-500/30">
                <Award className="h-3.5 w-3.5" />
                {certificates.length} earned
              </span>
            )}
          </div>
          <p className="text-slate-400 font-medium">
            View and download your official course completion credentials.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full bg-slate-200" />
                <CardContent className="pt-4">
                  <Skeleton className="h-5 w-3/4 bg-slate-200" />
                  <Skeleton className="h-4 w-1/2 mt-2 bg-slate-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <Card className="border-none shadow-md bg-white">
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Award className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">No Certificates Earned</h3>
              <p className="text-slate-400 font-medium text-center mb-8 max-w-sm">
                Complete your enrolled courses to receive official certification.
              </p>
              <Button asChild className="bg-[#2563EB] hover:bg-[#1D4ED8] font-bold px-8 rounded-xl h-12">
                <Link href="/student">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {certificates.map((cert) => {
              const template = cert.template as CertificateTemplate | null;
              const certData = buildCertData(cert);

              return (
                <Card key={cert.id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white overflow-hidden">
                  {/* Certificate thumbnail */}
                  {template ? (
                    <div className="bg-slate-100 p-4 flex justify-center">
                      <CertificateRenderer template={template} data={certData} scale={0.35} showQR={false} />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] h-48 flex items-center justify-center">
                      <Award className="h-16 w-16 text-white/30" />
                    </div>
                  )}

                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{cert.course?.title ?? 'Certificate of Achievement'}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      {cert.certificate_number && (
                        <p className="text-xs font-mono text-slate-400 mt-1">{cert.certificate_number}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {template && (
                        <Button size="sm" variant="outline" onClick={() => setPreviewCert(cert)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#1E3A5F] hover:bg-[#162d4a]"
                        onClick={() => window.open(`/api/certificates/${cert.id}/pdf`, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleShare(cert)}>
                        <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewCert && previewCert.template && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewCert(null)}
          template={previewCert.template as CertificateTemplate}
          data={buildCertData(previewCert)}
          certificateId={previewCert.id}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/student/certificates/page.tsx
git commit -m "feat: update student certificates page with real renders, PDF download, and verification links"
```

---

## Task 18: Create Supabase Storage Bucket

**Files:** None (MCP operation)

- [ ] **Step 1: Create the `canva-exports` storage bucket via Supabase MCP**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('canva-exports', 'canva-exports', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Add storage RLS policies**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'canva-exports');

-- Allow public read
CREATE POLICY "Public read for canva-exports" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'canva-exports');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'canva-exports');
```

- [ ] **Step 3: Commit any migration if needed**

If the above was run via MCP `execute_sql`, no file to commit. Document in commit message.

```bash
git commit --allow-empty -m "chore: create canva-exports storage bucket via Supabase MCP"
```

---

## Task 19: Integration Test — Full Flow Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev -- -p 3001
```

- [ ] **Step 2: Verify admin certificates page loads**

Navigate to `http://localhost:3001/gansid/admin/certificates`. Verify:
- Page loads without errors
- Three tabs visible: Templates, Awarded, Course Assignments
- Default GANSID template appears in Templates tab with preview thumbnail
- "Create Template" button works, opens the template editor
- Template editor live preview renders the default certificate design

- [ ] **Step 3: Verify student certificates page loads**

Navigate to `http://localhost:3001/gansid/student/certificates`. Verify:
- Page loads without errors
- If certificates exist, they render with actual thumbnails
- If no certificates, empty state shows correctly

- [ ] **Step 4: Verify public verification page**

Navigate to `http://localhost:3001/verify/NONEXISTENT`. Verify:
- Page renders "Certificate not found" with red X
- No auth required

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 6: Commit any fixes needed**

```bash
git add -A
git commit -m "fix: address integration issues from full flow verification"
```

---

## Task 20: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add migrations 022 and 023 to the Applied Migrations table**

Add after the row for migration 021:

```markdown
| 022 | canva_integration | Canva OAuth tokens on `users`, `canva_design_id`/`canva_design_url` on `slides` |
| 023 | certificate_templates | `certificate_templates` + `course_certificate_templates` tables, `certificates` enhancements (template_id, awarded_by, certificate_number, pdf_url), auto-number trigger, default GANSID template seed |
```

- [ ] **Step 2: Update Project Structure section**

Add under `lib/`:
```
    canva/
      auth.ts           # Canva OAuth helpers, PKCE, token refresh
      api.ts            # Canva REST API (designs, exports)
```

Add under `components/`:
```
    certificates/
      certificate-renderer.tsx      # HTML renderer (background + data fields)
      certificate-pdf-document.tsx  # @react-pdf/renderer PDF generator
      certificate-preview-modal.tsx # Full-size preview with actions
      template-editor.tsx           # Template create/edit with live preview
      award-certificate-modal.tsx   # Manual award: recipients + reason
```

- [ ] **Step 3: Update Implementation Status**

Add to Completed section:
```markdown
- [x] Certificate template system: create, edit, preview, assign to courses, set institution default
- [x] Certificate renderer: HTML component with Canva or default backgrounds + data field overlay
- [x] Certificate PDF generation via @react-pdf/renderer
- [x] Admin certificates dashboard: Templates, Awarded, Course Assignments tabs
- [x] Manual certificate awards: select template, users/groups, reason
- [x] Certificate number auto-generation (GANSID-2026-XXXXX)
- [x] Public certificate verification page (/verify/[number])
- [x] Canva Connect API OAuth flow (PKCE + token refresh)
- [x] Canva design creation, export, and storage pipeline
- [x] Student certificates page: rendered thumbnails, PDF download, share verification link
- [x] Course completion → certificate with template resolution + PDF pre-generation
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with migrations 022-023, certificate system, and Canva integration"
```
