# Navigation Footer Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move slide navigation out of CTA blocks and into a consistent viewer footer bar. Add slide-level navigation settings to the editor properties panel.

**Architecture:** Navigation becomes viewer chrome (always bottom-right footer), not block content. Slide settings (`slides.settings` jsonb) gains navigation fields. CTA block is simplified to content-only (external links).

**Tech Stack:** React 19, Next.js 16, Supabase (existing `slides.settings` jsonb), Zustand editor store, Tailwind CSS

---

## File Map

### Modified Files

| File | Change |
|---|---|
| `src/components/student/course-viewer.tsx` | Redesign nav buttons into footer bar, use slide settings for labels |
| `src/components/editor/properties-panel.tsx` | Add navigation settings section when slide is selected |
| `src/components/editor/theme-editor/slide-style-editor.tsx` | Add nav settings: button label, slide role (content/completion) |
| `src/components/blocks/cta/viewer.tsx` | Simplify to content links only, remove complete_lesson/next_lesson actions |
| `src/lib/content/blocks/cta/schema.ts` | Remove `complete_lesson` and `next_lesson` from action enum |
| `src/lib/content/slide-templates.ts` | Remove CTA default blocks from templates, remove `cta` slide type template |
| `src/components/shared/completion-slide.tsx` | Remove action buttons (they move to footer) |

---

## Task 1: Redesign Viewer Navigation Footer

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

- [ ] **Step 1: Read the current navigation code**

Read `src/components/student/course-viewer.tsx` fully, focusing on:
- Lines 777-792: Current Previous/Next buttons
- Lines 731-774: Completion slide rendering with action buttons
- Lines 393-394: `isFirstSlide` / `isLastSlide` logic
- Lines 418-425: `nextBlocked`, `goNext`, `goPrev`
- The slide type union (line 30-39)

- [ ] **Step 2: Create a unified navigation footer**

Replace the current separate Previous/Next buttons (lines 777-792) and the completion slide's action buttons (lines 759-768) with a single, consistent footer bar that appears on ALL slides.

The footer should be:
- Positioned at the bottom of the slide area, right-aligned
- Always visible (Previous on left side, primary action on right)
- Context-aware based on slide position and settings:

```tsx
// Footer bar — always renders at bottom of slide area
<div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
  {/* Left: Previous */}
  <button
    onClick={goPrev}
    disabled={isFirstSlide}
    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
    <ChevronLeft className="h-4 w-4" />
    Previous
  </button>

  {/* Right: Context-dependent primary action */}
  <div className="flex items-center gap-3">
    {/* Quiz button if on completion slide with quizzes */}
    {isCompletionSlide && hasQuiz && !allQuizzesComplete && (
      <Button variant="outline" onClick={goToQuiz}>Take Quiz</Button>
    )}

    {/* Primary nav button */}
    {isCompletionSlide ? (
      hasNextLesson ? (
        <Button onClick={goToNextLesson} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
          {navLabel || 'Next Lesson'} <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={goToDashboard} className="bg-[#0F172A] hover:bg-[#1e293b]">
          Back to Dashboard
        </Button>
      )
    ) : isLastContentSlide ? (
      <Button onClick={goNext} disabled={nextBlocked} className="bg-[#DC2626] hover:bg-[#991B1B]">
        {navLabel || 'Complete Lesson'} <ChevronRight className="ml-1.5 h-4 w-4" />
      </Button>
    ) : (
      <Button onClick={goNext} disabled={nextBlocked} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
        {navLabel || 'Next'} <ChevronRight className="ml-1.5 h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```

Key logic:
- `isLastContentSlide` = the slide before the completion slide (index === totalSlides - 2)
- `isCompletionSlide` = current slide is the completion slide
- `navLabel` = read from `currentSlideData.settings?.nav_label` if available, otherwise use defaults
- Previous button always visible but disabled on first slide
- The completion slide still shows its animation/content, but the action buttons (Next Lesson, Back to Dashboard) are now in the footer instead of centered in the card

- [ ] **Step 3: Remove action buttons from completion slide rendering**

In the completion slide rendering section (~lines 731-774), remove:
- "Next Lesson" button (lines 759-764)
- "Back to Dashboard" button (lines 766-768)
- Keep: Award icon, "Lesson Complete" header, confetti animation, "Leave a Review" button, "Take Quiz" button

The "Take Quiz" can stay in the completion slide content OR move to the footer — put it in the footer for consistency.

- [ ] **Step 4: Read nav settings from slide data**

When building `currentSlides` in the memo, the `settings` field is already included. The footer reads `settings.nav_label` for button text overrides:

```typescript
const navLabel = currentSlideData?.kind === 'page'
  ? (currentSlideData.settings?.nav_label as string | undefined)
  : undefined;
```

- [ ] **Step 5: Verify keyboard navigation still works**

The existing keyboard handler (← / → arrows) calls `goPrev`/`goNext`. This should still work since we're only changing button placement, not the navigation functions.

- [ ] **Step 6: Verify preview mode still works**

`previewMode` suppresses DB writes. The footer buttons should respect this — `handleMarkComplete` already checks `previewMode`. No changes needed here.

- [ ] **Step 7: Commit**

```bash
git add src/components/student/course-viewer.tsx
git commit -m "feat: move slide navigation into consistent bottom footer bar"
```

---

## Task 2: Add Navigation Settings to Slide Properties

**Files:**
- Modify: `src/components/editor/theme-editor/slide-style-editor.tsx`
- Modify: `src/components/editor/properties-panel.tsx`

- [ ] **Step 1: Read current SlideStyleEditor**

Read `src/components/editor/theme-editor/slide-style-editor.tsx` to understand how settings are read/written.

- [ ] **Step 2: Add navigation settings section**

Add a "Navigation" section to `SlideStyleEditor` below the existing background settings:

```tsx
{/* Navigation Settings */}
<div className="space-y-3 pt-4 border-t border-gray-100">
  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</p>

  {/* Button label override */}
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">Button Label</label>
    <input
      type="text"
      value={(settings.nav_label as string) ?? ''}
      onChange={(e) => updateSettings({ nav_label: e.target.value || undefined })}
      placeholder="Auto (Next / Complete Lesson)"
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
    />
    <p className="mt-1 text-xs text-gray-400">Leave empty for automatic labels</p>
  </div>

  {/* External link (optional — navigates away instead of next slide) */}
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">External Link (optional)</label>
    <input
      type="url"
      value={(settings.nav_url as string) ?? ''}
      onChange={(e) => updateSettings({ nav_url: e.target.value || undefined })}
      placeholder="https://..."
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
    />
    <p className="mt-1 text-xs text-gray-400">If set, button opens this URL instead of navigating</p>
  </div>
</div>
```

The `updateSettings` function should merge into the existing `slides.settings` object via the store's `updateSlide`:

```typescript
const updateSettings = (changes: Record<string, unknown>) => {
  const newSettings = { ...currentSettings, ...changes };
  // Remove undefined values to keep settings clean
  for (const key of Object.keys(newSettings)) {
    if (newSettings[key] === undefined) delete newSettings[key];
  }
  store.getState().updateSlide(lessonId, slideId, { settings: newSettings });
};
```

- [ ] **Step 3: Show slide role in properties**

In `properties-panel.tsx`, where the slide type is displayed (~line 334), make it more descriptive and show the navigation context:

```tsx
<p className="text-sm font-medium text-gray-700 capitalize">
  {slideData?.slide_type ?? 'Unknown type'}
  {isLastSlideInLesson && ' (completion trigger)'}
</p>
```

This is informational only — the completion behavior is automatic (last content slide triggers completion).

- [ ] **Step 4: Verify settings persist through save**

The `handleSave` in `course-editor-shell.tsx` already saves `slide.settings` via `dbUpdateSlide`. New fields in `settings` (nav_label, nav_url) will be persisted automatically since `settings` is a jsonb column.

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/theme-editor/slide-style-editor.tsx src/components/editor/properties-panel.tsx
git commit -m "feat: add navigation settings (button label, external link) to slide properties"
```

---

## Task 3: Simplify CTA Block to Content-Only

**Files:**
- Modify: `src/lib/content/blocks/cta/schema.ts`
- Modify: `src/components/blocks/cta/viewer.tsx`
- Modify: `src/components/blocks/cta/editor.tsx` (if it exists)
- Modify: `src/lib/content/slide-templates.ts`
- Modify: `src/components/student/course-viewer.tsx` (remove CTA filter)

- [ ] **Step 1: Update CTA schema**

In `src/lib/content/blocks/cta/schema.ts`, simplify the action enum to only `external_url`:

```typescript
export const ctaDataSchema = z.object({
  text: z.string().default(''),
  button_label: z.string().default('Click Here'),
  url: z.string().url().optional(),
});

export type CtaData = z.infer<typeof ctaDataSchema>;
```

Remove the `action` field entirely — CTA blocks are now just styled link buttons. If `url` is set, the button opens it. If not, it's a non-functional placeholder (editor will show a warning).

- [ ] **Step 2: Update CTA viewer**

In `src/components/blocks/cta/viewer.tsx`, simplify to render a link button:

```tsx
export default function CtaViewer({ data }: BlockViewerProps<CtaData>) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {data.text && <p className="text-base text-gray-700">{data.text}</p>}
      {data.url ? (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white font-semibold rounded-xl hover:bg-[#162d4a] transition-colors"
        >
          {data.button_label || 'Click Here'}
          <ExternalLink className="h-4 w-4" />
        </a>
      ) : (
        <div className="px-6 py-3 bg-gray-100 text-gray-400 rounded-xl text-sm">
          {data.button_label || 'Click Here'} (no URL set)
        </div>
      )}
    </div>
  );
}
```

Remove the `onComplete` prop handling — CTA blocks no longer trigger lesson completion.

- [ ] **Step 3: Update CTA editor**

Read `src/components/blocks/cta/editor.tsx`. Remove the `action` dropdown (complete_lesson, next_lesson, external_url). Keep only:
- Text field (descriptive text above button)
- Button label field
- URL field

- [ ] **Step 4: Remove CTA slide template**

In `src/lib/content/slide-templates.ts`, remove the `cta` slide template entirely. The CTA block can still be added manually from the block palette, but there's no reason for a dedicated "CTA slide" template now that navigation is built into the viewer.

- [ ] **Step 5: Remove CTA filter from course-viewer**

In `src/components/student/course-viewer.tsx`, remove the filter that strips `complete_lesson` CTA blocks (~line 356-358):

```typescript
// REMOVE THIS:
const filteredBlocks = allBlocks.filter(
  b => !(b.block_type === 'cta' && (b.data as Record<string, unknown>)?.action === 'complete_lesson'),
);
```

Since CTA blocks no longer have `complete_lesson` action, there's nothing to filter.

- [ ] **Step 6: Handle backwards compatibility**

Existing CTA blocks in the DB may still have `action: 'complete_lesson'` or `action: 'next_lesson'`. The simplified viewer should handle these gracefully:
- If `action` field exists but is `complete_lesson` or `next_lesson`, render nothing (these were navigation CTAs, now handled by the footer)
- If `action` is `external_url` or missing, render as a link button

```tsx
// In CTA viewer, at the top:
const action = (data as Record<string, unknown>).action as string | undefined;
if (action === 'complete_lesson' || action === 'next_lesson') {
  return null; // Legacy navigation CTA — now handled by viewer footer
}
```

- [ ] **Step 7: Update CTA auto-creation for canvas blocks**

In `src/components/editor/preview-panel.tsx`, the `getDefaultCanvasBlockData` function has a `cta` case. Update it to match the simplified schema:

```typescript
case 'cta':
  return { text: 'Learn more', button_label: 'Visit Link', url: 'https://example.com' };
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/content/blocks/cta/ src/components/blocks/cta/ src/lib/content/slide-templates.ts src/components/student/course-viewer.tsx src/components/editor/preview-panel.tsx
git commit -m "refactor: simplify CTA block to content links only, remove navigation actions"
```

---

## Task 4: Update Completion Slide Component

**Files:**
- Modify: `src/components/shared/completion-slide.tsx`

- [ ] **Step 1: Read current completion slide component**

Read `src/components/shared/completion-slide.tsx` to understand what it renders.

- [ ] **Step 2: Remove action buttons, keep visual content**

The completion slide should keep:
- Award icon with animation
- "Lesson Complete" header with lesson title
- Confetti animation trigger

Remove from the completion slide content:
- "Next Lesson" button (now in footer)
- "Back to Dashboard" button (now in footer)
- "Take Quiz" button (now in footer)

The "Leave a Review" button can stay in the completion slide content since it's not navigation — it opens a modal.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/completion-slide.tsx src/components/student/course-viewer.tsx
git commit -m "refactor: move completion slide action buttons to viewer footer"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Test suite**

```bash
npm test -- --run
```

- [ ] **Step 4: Manual verification checklist**

1. Student view: navigate through a lesson
   - Footer shows Previous/Next on every content slide
   - Last content slide shows "Complete Lesson" in red
   - Completion slide shows animation + "Leave a Review"
   - Footer shows "Next Lesson" or "Back to Dashboard"
   - Keyboard nav (← →) still works
2. Editor: create a new slide
   - No CTA block auto-created
   - Slide properties show Navigation section
   - Custom button label persists after save
3. Editor: add a CTA block manually
   - Shows as a content link button (no action dropdown)
   - Renders correctly in student view
4. Admin preview: canvas and block-based slides both work
5. Existing lessons with old CTA blocks: `complete_lesson` CTAs render as nothing

- [ ] **Step 5: Fix issues and commit**

```bash
git add -A
git commit -m "fix: polish navigation footer after e2e verification"
```

---

## Task Summary

| Task | Description | Complexity |
|---|---|---|
| 1 | Redesign viewer navigation into footer bar | Medium |
| 2 | Add navigation settings to slide properties | Low |
| 3 | Simplify CTA block to content-only | Medium |
| 4 | Update completion slide component | Low |
| 5 | End-to-end verification | Low |
