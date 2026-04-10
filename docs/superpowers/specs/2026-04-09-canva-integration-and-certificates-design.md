# Canva Integration + Certificate System Design

**Date:** 2026-04-09
**Status:** Approved
**Scope:** Strategy A Canva "Edit in Canva" integration + full certificate management system

---

## Overview

Two interconnected features:

1. **Canva Connect API integration** — "Design in Canva" button in the editor for creating professional slide backgrounds and certificate artwork. Uses OAuth redirect flow (not embedded). Exported images stored in Supabase Storage alongside the Canva design ID for re-editing.

2. **Certificate management system** — Admin page for creating certificate templates (with optional Canva-designed backgrounds), assigning templates to courses, manually awarding certificates, and tracking all issued certificates. Students get auto-awarded certificates on course completion with PDF download.

---

## Part 1: Canva OAuth + Editor Integration

### 1.1 Canva App Registration

Register a public integration at canva.dev:
- App name: "GANSID LMS"
- OAuth redirect URI: `http://localhost:3001/api/auth/canva/callback` (dev) + production URL
- Scopes requested: `design:content:write`, `design:meta:read`, `design:content:read`, `asset:write`, `asset:read`, `profile:read`

### 1.2 Data Model — Canva Tokens

New columns on `users` table (migration):

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_token_expires_at TIMESTAMPTZ;
```

Tokens are per-user. Each admin authenticates with their own Canva account.

### 1.3 Data Model — Slide Canva Fields

New columns on `slides` table (migration):

```sql
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_id TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_url TEXT;
```

- `canva_design_id` — Canva's design ID, used to generate `edit_url` for re-editing
- `canva_design_url` — URL of the exported image in Supabase Storage

### 1.4 OAuth Flow

**API Routes:**

`/api/auth/canva/route.ts` — GET handler:
1. Generate PKCE code_verifier + code_challenge (SHA-256)
2. Store code_verifier in an httpOnly cookie (short-lived, 10 min)
3. Redirect to `https://www.canva.com/api/oauth/authorize` with:
   - `client_id`, `redirect_uri`, `response_type=code`
   - `code_challenge`, `code_challenge_method=S256`
   - `scope` (space-separated list from 1.1)
   - `state` (CSRF token, also stored in cookie)

`/api/auth/canva/callback/route.ts` — GET handler:
1. Verify `state` matches cookie
2. Exchange `code` + `code_verifier` for tokens via `POST https://api.canva.com/rest/v1/oauth/token`
3. Store `access_token`, `refresh_token`, `expires_at` on the user record
4. Return HTML that calls `window.opener.postMessage({ type: 'canva-auth-success' })` and closes the popup

**Token Refresh:**

Helper function `getCanvaAccessToken(supabase, userId)` in `lib/canva/auth.ts`:
1. Read user's tokens
2. If `canva_token_expires_at` is within 5 minutes of now → refresh via `POST /oauth/token` with `grant_type=refresh_token`
3. Update stored tokens
4. Return valid access token

### 1.5 Editor Integration — "Design in Canva" Button

**Placement:**
- Properties panel → Background section → "Design in Canva" button (below existing color/image controls)
- If slide already has `canva_design_id`, button says "Edit in Canva"

**Flow:**

1. Button click → check if user has valid Canva tokens
2. If no tokens → open OAuth popup (section 1.4), wait for `postMessage` callback
3. Call our API route `POST /api/canva/designs`:
   - If slide has `canva_design_id` → call Canva `GET /designs/{id}` to get fresh `edit_url`
   - If no design → call Canva `POST /designs` with `{ design_type: { type: 'custom', width: 1920, height: 1080 } }` for slide backgrounds, or `{ design_type: { type: 'custom', width: 1056, height: 816 } }` for certificates
   - Return `edit_url` and `design_id`
4. Open `edit_url` in new tab (append `?correlation_state={slideId}` for tracking)
5. User designs on canva.com, clicks "Return" when done

**Return Handling:**

`/api/canva/return/route.ts` — GET handler (Canva redirects here):
1. Verify the `correlation_jwt` using Canva's public keys
2. Extract `design_id` and `correlation_state` (our slide ID or template ID)
3. Trigger export: `POST https://api.canva.com/rest/v1/exports` with `{ design_id, format: { type: 'png', quality: 'high', width: 1920 } }`
4. Poll `GET /exports/{exportId}` until status is `completed` (timeout after 60s)
5. Download the exported image
6. Upload to Supabase Storage (`certificates/` or `slides/` bucket)
7. Update the slide or template record with `canva_design_id` and `canva_design_url`
8. Redirect to a success page that calls `window.close()` or navigates back to the editor

### 1.6 Rendering in Editor + Student Viewer

`canva_design_url` renders identically to existing `settings.background_image`:
- Absolute-positioned `<img>` behind content with `object-cover`
- Existing `SlideFrame` and `course-viewer.tsx` background image logic handles this
- No new rendering code needed — just populate `settings.background_image` from `canva_design_url` at load time

### 1.7 Supabase Storage Buckets

Create bucket `canva-exports` (public read, authenticated write):
- `slides/{slideId}/{timestamp}.png` — slide backgrounds
- `certificates/templates/{templateId}/{timestamp}.png` — certificate backgrounds
- `certificates/pdfs/{certificateId}.pdf` — generated PDFs

---

## Part 2: Certificate Data Model

### 2.1 New Table: `certificate_templates`

```sql
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
CREATE UNIQUE INDEX idx_certificate_templates_default
  ON certificate_templates (institution_id) WHERE is_default = true;
```

RLS: admin read/write via `is_admin()`.

### 2.2 New Table: `course_certificate_templates`

```sql
CREATE TABLE IF NOT EXISTS course_certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);
```

One template per course. UNIQUE on `course_id`.

RLS: admin read/write via `is_admin()`.

### 2.3 Changes to Existing `certificates` Table

```sql
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES certificate_templates(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS awarded_by UUID REFERENCES users(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS award_reason TEXT;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number TEXT UNIQUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Sequence for certificate numbers per institution
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq;
```

### 2.4 Certificate Number Generation

Postgres function called at insert time:

```sql
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

CREATE TRIGGER trg_certificate_number
  BEFORE INSERT ON certificates
  FOR EACH ROW
  WHEN (NEW.certificate_number IS NULL)
  EXECUTE FUNCTION generate_certificate_number();
```

Produces: `GANSID-2026-00001`, `GANSID-2026-00002`, etc.

### 2.5 Seed Default Template

Insert one `is_default = true` certificate template for the GANSID institution with no Canva design (uses HTML default renderer).

---

## Part 3: Certificate Admin Page

### 3.1 Route: `/admin/certificates`

New admin nav item: "Certificates" with `Award` icon, positioned between "Analytics" and "Users".

### 3.2 Page Structure — Three Tabs

**Tab 1: Templates**

- Grid of certificate template cards:
  - Thumbnail: mini render of the certificate (Canva background or default gradient)
  - Name, description, badge showing how many courses use it
  - "Default" badge on the institution default
  - Actions: Edit, Duplicate, Delete (delete blocked if in use)
- "Create Template" button → opens template editor page/modal:
  - Name and description text fields
  - "Design in Canva" button → Canva OAuth + design flow (section 1.5), exports to `canva_design_url`
  - Layout config editor: live preview with the certificate rendered at actual size, data fields shown with sample data ("Jane Doe", "Fundamentals of Effective Advocacy", "April 9, 2026", "GANSID-2026-00001")
  - Field position adjustment: numeric x/y/fontSize/color inputs in a sidebar, with live preview updating as values change
  - "Set as Institution Default" toggle
  - Save button

**Tab 2: Awarded**

- Filterable/searchable table of all issued certificates:
  - Columns: Student Name, Course (or "Manual Award"), Template, Certificate #, Date Issued, Awarded By
  - Filters: course dropdown, date range, template dropdown, type (auto/manual)
  - Search: student name or certificate number
  - Row click → certificate preview modal
  - Bulk actions: Export CSV, Revoke selected (soft delete with confirmation)
- "Award Certificate" button → modal:
  - Template picker (dropdown of institution templates)
  - Recipient picker: search users by name/email, OR select a user group (reuses existing group picker pattern from course assignments)
  - Course (optional dropdown — for context, not required for manual awards)
  - Reason text field (required for manual awards)
  - Live preview of the certificate with first selected recipient's data
  - "Award" button → bulk inserts certificates for all selected recipients

**Tab 3: Course Assignments**

- Table: Course Name | Template | Assigned By | Date
  - Courses with no template show "Using Default" pill
  - Click row → dropdown to pick a different template or "Use Default"
- "Assign Template" button → course picker + template picker modal
- Inline edit: click the template cell to change assignment

### 3.3 Certificate Preview/Detail Modal

Triggered from awarded table row click or template "Preview":
- Full-size `<CertificateRenderer>` with real or sample data
- Actions: Download PDF, Print (browser print), Copy Verification Link
- For templates: shows sample data with a note "Preview with sample data"

---

## Part 4: Certificate Renderer + PDF Generation

### 4.1 `<CertificateRenderer>` Component

Location: `src/components/certificates/certificate-renderer.tsx`

Props:
```typescript
interface CertificateRendererProps {
  template: CertificateTemplate;
  data: {
    student_name: string;
    course_title?: string;
    completion_date: string;
    certificate_number: string;
    institution_name: string;
    institution_logo?: string;
  };
  scale?: number;       // For thumbnail rendering (default 1)
  className?: string;
}
```

Rendering layers (absolute-positioned within a fixed-size container):
1. **Background layer** — if `template.canva_design_url` exists: `<img>` with `object-cover`. Otherwise: default gradient using brand colors (dark navy `#1E3A5F` → near-black `#0F172A`) with decorative SVG border pattern and GANSID logo watermark.
2. **Data fields layer** — each field from `template.layout_config.fields` rendered as an absolutely-positioned `<div>` with the configured position, font size, weight, color, and alignment. Template literal replacement: field key maps to `data[key]`.
3. **QR code** (if verification URL configured) — small QR in bottom corner linking to `/verify/{certificate_number}`.

Container size: `layout_config.width` x `layout_config.height` pixels, scaled by `scale` prop via CSS `transform: scale()`.

### 4.2 Default Certificate Design (No Canva)

When `canva_design_url` is null, the renderer produces a professional certificate using:
- Background: linear gradient `#1E3A5F` → `#0F172A`
- Decorative gold/red accent lines (SVG) as border
- GANSID logo centered at top
- "Certificate of Completion" header in white
- Data fields in configured positions (white/light text on dark background)
- Red `#DC2626` accent stripe at bottom with certificate number

This ships as the `is_default = true` template for GANSID institution.

### 4.3 PDF Generation

**Library:** `@react-pdf/renderer` — pure React-to-PDF, no browser/puppeteer dependency, works in serverless.

**API Route:** `/api/certificates/[id]/pdf/route.ts`

Flow:
1. Fetch certificate record with joined template and user/course data
2. Render a `@react-pdf/renderer` `<Document>` that replicates the `<CertificateRenderer>` layout:
   - `<Page size={[width, height]}>` in landscape
   - Background image via `<Image src={canva_design_url}>` or gradient via `<View>` with linear gradient styles
   - Data fields as `<Text>` elements with absolute positioning matching `layout_config`
3. Generate PDF buffer
4. Upload to Supabase Storage at `certificates/pdfs/{certificateId}.pdf`
5. Update `certificates.pdf_url`
6. Return PDF as `application/pdf` response (stream for download)

**Caching:** Once generated, `pdf_url` is set. Subsequent requests serve the stored PDF directly from Supabase Storage. If the template is updated, a regeneration flag clears cached PDFs for that template's certificates.

### 4.4 PDF Regeneration

When a template's Canva design or layout_config is updated:
- Set `pdf_url = NULL` on all `certificates` rows using that template
- Next time a user requests a PDF, it regenerates on demand
- Optional: background job to pre-regenerate (future enhancement)

---

## Part 5: Student Certificate Experience

### 5.1 Updated Student Certificates Page

`/student/certificates` enhancements:

- Certificate cards show actual rendered thumbnails via `<CertificateRenderer scale={0.3}>` instead of generic icons
- Card actions: View (full-screen modal), Download PDF, Print, Share
- "View" → full-screen modal with `<CertificateRenderer>` at full resolution
- "Download PDF" → `GET /api/certificates/{id}/pdf` → browser download
- "Share" → copies public verification URL to clipboard with toast confirmation
- Empty state: "Complete a course to earn your first certificate"

### 5.2 Course Completion Flow Update

Changes to `course-viewer.tsx` certificate insert logic:

```typescript
// Current: just inserts bare certificate row
// New flow:
1. Query course_certificate_templates for this course_id → get template_id
2. If no assignment → query certificate_templates where is_default = true AND institution_id matches
3. Insert certificate with: user_id, course_id, institution_id, template_id
   (certificate_number auto-generated by trigger)
4. Fire-and-forget: POST /api/certificates/{id}/pdf to pre-generate PDF
5. Toast: "Certificate earned! View it in your certificates page" with link
```

### 5.3 Completion Slide Enhancement

On the completion slide, if a certificate was just earned:
- Show a scaled-down certificate preview card (`<CertificateRenderer scale={0.25}>`)
- Two buttons below: "View Certificate" (opens modal) and "Download PDF"
- This replaces the current plain-text "Certificate Earned" message

---

## Part 6: Public Verification

### 6.1 Route: `/verify/[certificateNumber]`

Public page (no auth required). Not behind the tenant prefix — accessible at root.

Content:
- GANSID logo + "Certificate Verification" header
- Green checkmark badge: "This certificate is valid"
- Fields displayed: Student name, Course title, Date issued, Certificate number, Institution
- "Issued by GANSID Learning Management System" footer
- If certificate number not found: red X badge + "Certificate not found"

No PII beyond what's printed on the certificate itself.

### 6.2 QR Code

Generated client-side using a lightweight QR library (e.g. `qrcode.react`). The QR encodes the full verification URL: `https://{domain}/verify/{certificate_number}`. Rendered in the bottom-right corner of the certificate at ~80x80px.

---

## New Files Summary

| File | Purpose |
|---|---|
| `src/app/api/auth/canva/route.ts` | Canva OAuth initiation |
| `src/app/api/auth/canva/callback/route.ts` | Canva OAuth callback |
| `src/app/api/canva/designs/route.ts` | Create/fetch Canva designs |
| `src/app/api/canva/return/route.ts` | Handle Canva return redirect |
| `src/app/api/certificates/[id]/pdf/route.ts` | PDF generation endpoint |
| `src/app/admin/certificates/page.tsx` | Admin certificates page (server) |
| `src/app/admin/certificates/certificates-dashboard.tsx` | Admin certificates UI (client) |
| `src/app/verify/[certificateNumber]/page.tsx` | Public verification page |
| `src/components/certificates/certificate-renderer.tsx` | Certificate render component |
| `src/components/certificates/certificate-preview-modal.tsx` | Full-size preview modal |
| `src/components/certificates/template-editor.tsx` | Template creation/editing form |
| `src/components/certificates/award-certificate-modal.tsx` | Manual award modal |
| `src/lib/canva/auth.ts` | Canva token management |
| `src/lib/canva/api.ts` | Canva API helpers (designs, exports) |
| `src/lib/db/certificate-templates.ts` | Template CRUD |
| `src/lib/db/certificates.ts` | Enhanced certificate CRUD |
| `src/types/certificates.ts` | Certificate + template types |
| `supabase/migrations/022_canva_integration.sql` | Canva columns on users + slides |
| `supabase/migrations/023_certificate_templates.sql` | Templates + course assignments + cert enhancements |

---

## Environment Variables

New `.env.local` entries:
```
CANVA_CLIENT_ID=<from canva.dev app registration>
CANVA_CLIENT_SECRET=<from canva.dev app registration>
NEXT_PUBLIC_CANVA_RETURN_URL=http://localhost:3001/api/canva/return
```

---

## Dependencies

New npm packages:
- `@react-pdf/renderer` — PDF generation from React components
- `qrcode.react` — QR code rendering for verification URLs

No Canva SDK package needed — Connect API is plain REST.

---

## Out of Scope

- Canva Apps SDK (building plugins inside Canva) — not relevant
- Canva template marketplace browsing via API — not exposed
- Real-time collaboration via Canva — not available
- Bulk certificate generation background job — future enhancement
- Multi-tenant branding for default certificate — Phase 5
- Draggable field position editor — v1 uses numeric inputs, drag-to-position is a future enhancement
