# Admin Course Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let admins preview any course exactly as a student sees it, accessible from both the editor toolbar and the course list dashboard.

**Architecture:** Extract the student course viewer into a reusable `CourseViewer` component (accepting `courseId` prop). The existing student page delegates to it unchanged. A new `/admin/courses/[id]/preview` page renders a full-screen fixed overlay (covering the admin nav) with a thin navy preview banner at the top and the `CourseViewer` below. Preview mode suppresses enrollment writes and progress tracking so admin browsing doesn't pollute student data.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Supabase client (anon key), lucide-react icons

---

### Task 1: Extract `CourseViewer` from the student course page

The current `StudentCoursePage` at `src/app/student/courses/[id]/page.tsx` is a monolithic client component. We need to pull the viewer logic into a shared component that accepts `courseId` and an optional `previewMode` flag.

**Files:**
- Create: `src/components/student/course-viewer.tsx`
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Read the full student course page to understand the component**

```bash
# Just read the file — no action yet
```

Open `src/app/student/courses/[id]/page.tsx` and note:
- All state declarations
- `fetchData` async function
- `selectLesson`, `handleMarkComplete`, keyboard nav `useEffect`
- The JSX return (slide viewer layout)

**Step 2: Create `src/components/student/course-viewer.tsx`**

Copy the ENTIRE body of `StudentCoursePage` into `CourseViewer`, changing only:
- The prop interface: accept `courseId: string` and `previewMode?: boolean` instead of `{ params: Promise<{ id: string }> }`
- Remove `const params = React.use(paramsPromise)` — use `courseId` prop directly
- Everywhere `params.id` is used, replace with `courseId`
- In `fetchData`, when `previewMode === true`:
  - Skip the auto-enroll insert: wrap the `supabase.from('course_enrollments').insert(...)` in `if (!previewMode)`
  - Still fetch and display course/lessons/blocks as normal
- In `handleMarkComplete`, when `previewMode === true`, skip the `progress` upsert: wrap it in `if (!previewMode)`
- The component signature:

```tsx
'use client';

interface CourseViewerProps {
  courseId: string;
  previewMode?: boolean;
}

export default function CourseViewer({ courseId, previewMode = false }: CourseViewerProps) {
  // ... all existing state and logic, using courseId instead of params.id
}
```

**Step 3: Update `src/app/student/courses/[id]/page.tsx` to delegate to `CourseViewer`**

Replace the entire component body with a thin wrapper:

```tsx
'use client';

import React from 'react';
import CourseViewer from '@/components/student/course-viewer';

export default function StudentCoursePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  return <CourseViewer courseId={params.id} />;
}
```

**Step 4: Verify the student course page still works**

Navigate to `http://localhost:3001/gansid/student/courses/6b4906f1-803b-40bb-8582-d591220e5d09` and confirm:
- Course loads normally
- Slides navigate with arrow keys
- Lessons selectable from sidebar

---

### Task 2: Create the admin preview page

**Files:**
- Create: `src/app/admin/courses/[id]/preview/page.tsx`

**Step 1: Create the preview page**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import CourseViewer from '@/components/student/course-viewer';

export default function AdminPreviewPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);

  return (
    // Fixed overlay covers the entire viewport including the admin nav
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Preview banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Admin Preview</span>
          <span className="text-white/40 text-sm hidden sm:inline">·</span>
          <span className="text-white/60 text-xs hidden sm:inline">Viewing as a student would see this course</span>
        </div>
        <Link
          href={`/gansid/admin/courses/${params.id}/editor`}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Link>
      </div>

      {/* Course viewer — fills remaining height below the banner */}
      <div className="flex-1 min-h-0">
        <CourseViewer courseId={params.id} previewMode />
      </div>
    </div>
  );
}
```

**Note on layout:** The `fixed inset-0 z-50` fully covers the admin nav and layout container. The `CourseViewer` inside needs to fill the remaining space. The viewer currently uses `h-[calc(100vh-6rem)]` to subtract the nav bar — inside the preview overlay, the nav is gone, replaced by the 3rem (`h-12`) preview banner. We handle this in Task 3.

---

### Task 3: Adjust `CourseViewer` height for preview mode

The viewer's outer div uses `h-[calc(100vh-6rem)]` to account for the 96px student nav bar. In preview mode the nav is hidden and replaced by the 48px (`3rem`) preview banner. Pass a `heightClass` prop or use a CSS variable.

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

**Step 1: Thread the height through `CourseViewer`**

In `CourseViewer`, find the outer wrapper div that has `h-[calc(100vh-6rem)]` and change it to use the prop:

```tsx
interface CourseViewerProps {
  courseId: string;
  previewMode?: boolean;
}

// Inside the component, derive the height class:
const outerHeightClass = previewMode
  ? 'h-[calc(100vh-3rem)]'   // 3rem = 48px preview banner
  : 'h-[calc(100vh-6rem)]';  // 6rem = 96px student nav

// Apply it:
<div className={`${outerHeightClass} flex flex-col overflow-hidden`}>
```

**Step 2: Verify preview layout**

Navigate to `http://localhost:3001/gansid/admin/courses/6b4906f1-803b-40bb-8582-d591220e5d09/preview` and confirm:
- The admin nav is hidden behind the preview overlay
- The navy preview banner spans the top
- "Back to Editor" link works
- The course slides fill the rest of the viewport with no scrollbar or cut-off

---

### Task 4: Wire the editor toolbar Preview button

The `Eye` button in `EditorToolbar` already exists but has no `onClick`. Wire it to navigate to the preview route.

**Files:**
- Modify: `src/components/editor/editor-toolbar.tsx`

**Step 1: Add `courseId` prop and navigation**

```tsx
import { useRouter } from 'next/navigation';

interface EditorToolbarProps {
  onSave?: () => void;
  courseId: string;  // add this
}

export function EditorToolbar({ onSave, courseId }: EditorToolbarProps) {
  const router = useRouter();
  // ...existing store selectors...

  // Wire the Eye button:
  <button
    onClick={() => router.push(`/gansid/admin/courses/${courseId}/preview`)}
    className="p-2 rounded hover:bg-gray-100 transition-colors"
    title="Preview as student"
  >
    <Eye className="w-4 h-4 text-gray-600" />
  </button>
```

**Step 2: Pass `courseId` from `EditorContent`**

In `src/components/editor/course-editor-shell.tsx`, `EditorContent` receives `courseId` as a prop. Pass it through to `EditorToolbar`:

```tsx
// In EditorContent JSX:
<EditorToolbar onSave={saveNow} courseId={courseId} />
```

**Step 3: Verify**

Open the editor for any course. Click the Eye icon. Confirm it navigates to the preview page. Confirm "Back to Editor" returns to the editor.

---

### Task 5: Add Preview button to admin course cards

Each course card on the admin dashboard (`/gansid/admin`) should have a small Preview icon button alongside the existing card link.

**Files:**
- Modify: `src/app/admin/page.tsx`

**Step 1: Update course cards to show a Preview button**

The cards are currently wrapped in a `<Link>` that goes to the editor. Restructure each card so the card body links to the editor but a separate Preview button opens the preview:

```tsx
import { Eye, Plus, BookOpen } from 'lucide-react';

// Replace the wrapping <Link> with a <div> containing two actions:
<div key={course.id} className="relative group">
  <Link href={`/gansid/admin/courses/${course.id}/editor`}>
    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
      {/* ... existing card content unchanged ... */}
    </Card>
  </Link>
  {/* Preview button — overlaid top-right on hover */}
  <Link
    href={`/gansid/admin/courses/${course.id}/preview`}
    onClick={(e) => e.stopPropagation()}
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-gray-200"
    title="Preview as student"
  >
    <Eye className="h-4 w-4 text-[#1E3A5F]" />
  </Link>
</div>
```

**Step 2: Verify**

Go to `/gansid/admin`. Hover over a course card — the Eye icon appears top-right. Click it — preview opens. Click the card body — editor opens.

---

### Task 6: Commit

```bash
git add \
  src/components/student/course-viewer.tsx \
  src/app/student/courses/[id]/page.tsx \
  src/app/admin/courses/[id]/preview/page.tsx \
  src/components/editor/editor-toolbar.tsx \
  src/components/editor/course-editor-shell.tsx \
  src/app/admin/page.tsx

git commit -m "feat: add admin course preview mode

- Extract CourseViewer from StudentCoursePage into shared component
- Preview mode suppresses enrollment and progress writes
- /admin/courses/[id]/preview renders full-screen overlay with nav banner
- Editor toolbar Eye button wires to preview route
- Admin course cards show hover Preview button"
```
