# Slide-Based Lesson Viewer Implementation Plan

> **Status: ✅ COMPLETE** (implemented 2026-03-30)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the scrolling block list in the lesson content area with a paginated slide viewer — title slide, one-block-per-slide content pages, and a completion slide.

**Architecture:** All changes are self-contained to `src/app/student/courses/[id]/page.tsx`. New React state (`currentSlide`, `sidebarOpen`) drives the slide index. Slides are computed as `[TITLE_SLIDE, ...blocks, COMPLETION_SLIDE]`. The sidebar becomes collapsible via a toggle chevron in the card header.

**Tech Stack:** React 19 (useState, useEffect, useCallback, useKeydown), Tailwind CSS 4, shadcn/ui, lucide-react

## Post-Implementation Additions (beyond original plan)

- **Viewport-locked layout** (`h-[calc(100vh-6rem)]`) — no page scroll; slide area scrolls internally
- **Mobile lesson selector** — native `<select>` dropdown (`lg:hidden`) replaces sidebar on small screens
- **Auto-mark-complete** — `useEffect` fires `handleMarkComplete()` on completion slide, guarded by `autoCompleteFired` ref
- **Leave a Review modal** — `LeaveReviewButton` component (`src/components/leave-review-button.tsx`) on completion slide; also added to enrolled course cards in `student/page.tsx` for completed courses
- **Brand colour updates** — red (`#DC2626`) for active lesson + progress bar; dark navy (`#1E3A5F`) for primary action buttons; `prose-xl` for rich text; larger quiz text and buttons

---

### Task 1: Add slide state + collapsible sidebar state

**Files:**
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Add new state variables** (after existing `lessonQuizzes` state at ~line 41)

```tsx
const [currentSlide, setCurrentSlide] = useState(0);
const [sidebarOpen, setSidebarOpen] = useState(true);
```

**Step 2: Reset slide to 0 whenever selectedLesson changes**

Add inside or after the `setSelectedLesson` call sites — wrap selection in a helper:

```tsx
const selectLesson = (lesson: Lesson) => {
  setSelectedLesson(lesson);
  setCurrentSlide(0);
};
```

Replace all `setSelectedLesson(lesson)` calls with `selectLesson(lesson)`.

**Step 3: Add `ChevronLeft`, `ChevronRight`, `ChevronDown`, `ChevronUp`, `Award` to lucide imports**

Existing import line already has some chevrons from quiz work — just ensure all five are imported.

**Step 4: No test needed — UI state only. Verify visually after Task 3.**

---

### Task 2: Collapsible sidebar UI

**Files:**
- Modify: `src/app/student/courses/[id]/page.tsx` (the grid + sidebar Card section ~line 513)

**Step 1: Make grid responsive to `sidebarOpen`**

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-1"
  style={{ gridTemplateColumns: sidebarOpen ? undefined : '1fr' }}
>
```

Use a conditional class approach instead:

```tsx
<div className={`grid grid-cols-1 gap-6 ${sidebarOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
```

**Step 2: Replace the sidebar `<Card>` with collapsible version**

```tsx
{/* Sidebar */}
<div className={sidebarOpen ? 'lg:col-span-1' : 'hidden lg:hidden'}>
  <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white">
    <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b">
      <CardTitle className="text-base font-black text-slate-900">Lessons</CardTitle>
      <button
        onClick={() => setSidebarOpen(false)}
        className="text-slate-400 hover:text-slate-700 transition-colors"
        aria-label="Collapse sidebar"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </CardHeader>
    <CardContent className="p-0">
      <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-50">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => selectLesson(lesson)}
            className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors ${
              selectedLesson?.id === lesson.id
                ? 'bg-blue-50 text-[#2563EB]'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            {progress[lesson.id]?.completed ? (
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-slate-300 shrink-0" />
            )}
            <span className="text-sm font-medium leading-snug">{lesson.title}</span>
          </button>
        ))}
      </div>
    </CardContent>
  </Card>
</div>
```

**Step 3: Add floating re-open button when sidebar is collapsed (place before the grid)**

```tsx
{!sidebarOpen && (
  <button
    onClick={() => setSidebarOpen(true)}
    className="mb-4 flex items-center gap-2 text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
  >
    <ChevronRight className="h-4 w-4" />
    Show Lessons
  </button>
)}
```

**Step 4: Update content card `col-span` to fill when sidebar is hidden**

```tsx
<div className={sidebarOpen ? 'lg:col-span-2' : 'lg:col-span-1'}>
```

---

### Task 3: Compute slides array + slide counter + progress bar

**Files:**
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Define slide types as a constant above the return**

```tsx
const SLIDE_TITLE = 'title' as const;
const SLIDE_COMPLETION = 'completion' as const;

type Slide =
  | { kind: typeof SLIDE_TITLE }
  | { kind: 'block'; block: LessonBlock }
  | { kind: typeof SLIDE_COMPLETION };
```

**Step 2: Compute slides array from selectedLesson (after `getLessonBlocks`)**

```tsx
const currentSlides: Slide[] = selectedLesson
  ? [
      { kind: SLIDE_TITLE },
      ...getLessonBlocks(selectedLesson).map(block => ({ kind: 'block' as const, block })),
      { kind: SLIDE_COMPLETION },
    ]
  : [];

const totalSlides = currentSlides.length;
const currentSlideData = currentSlides[currentSlide] ?? null;
const isFirstSlide = currentSlide === 0;
const isLastSlide = currentSlide === totalSlides - 1;
```

**Step 3: Add `goNext` / `goPrev` helpers**

```tsx
const goNext = useCallback(() => {
  setCurrentSlide(i => Math.min(i + 1, totalSlides - 1));
}, [totalSlides]);

const goPrev = useCallback(() => {
  setCurrentSlide(i => Math.max(i - 1, 0));
}, []);
```

**Step 4: Add keyboard navigation effect**

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (!selectedLesson) return;
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [selectedLesson, goNext, goPrev]);
```

**Step 5: Replace content `<Card>` body with slide viewer**

Inside the content card (replacing the `selectedLesson ? <> ... </> : ...` block):

```tsx
<Card className={`border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white ${sidebarOpen ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
  {selectedLesson ? (
    <div className="flex flex-col">
      {/* Top bar: progress + counter */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            {selectedLesson.title}
          </span>
          <span className="text-xs font-bold text-slate-500">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
        {/* Thin progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1">
          <div
            className="bg-[#2563EB] h-1 rounded-full transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
          />
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 min-h-[460px] flex flex-col justify-between">
        {/* ... slide render (Task 4) */}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={isFirstSlide}
          className="border-slate-200 text-slate-600 font-bold"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        {!isLastSlide && (
          <Button
            onClick={goNext}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  ) : (
    <CardContent className="py-20 text-center text-slate-400 font-medium">
      Select a lesson from the sidebar to begin
    </CardContent>
  )}
</Card>
```

---

### Task 4: Title slide, content slide, and completion slide components

**Files:**
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Title slide JSX** (inside `{/* slide render */}`)

```tsx
{currentSlideData?.kind === 'title' && (
  <div className="flex flex-col">
    {/* Hero image placeholder */}
    <div className="w-full aspect-video bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <div className="text-center px-8">
        <p className="text-white/50 text-xs uppercase tracking-widest font-bold mb-3">GANSID Learning</p>
        <h2 className="text-white text-2xl sm:text-3xl font-black leading-tight">{selectedLesson.title}</h2>
      </div>
    </div>
    {/* Info */}
    <div className="px-6 py-6 flex-1">
      {selectedLesson.description && (
        <p className="text-slate-600 text-base leading-relaxed mb-6">{selectedLesson.description}</p>
      )}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
        <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-black shrink-0">G</div>
        <div>
          <p className="text-sm font-bold text-slate-800">GANSID</p>
          <p className="text-xs text-slate-400">Global Action Network for Sickle Cell &amp; Inherited Blood Disorders</p>
        </div>
      </div>
    </div>
  </div>
)}
```

**Step 2: Content slide JSX**

```tsx
{currentSlideData?.kind === 'block' && (
  <div className="px-6 py-6 overflow-y-auto max-h-[520px]">
    <LessonBlockRenderer
      block={currentSlideData.block}
      lessonTitle={selectedLesson.title}
    />
  </div>
)}
```

**Step 3: Completion slide JSX**

```tsx
{currentSlideData?.kind === 'completion' && (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-5">
    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
      <Award className="h-10 w-10 text-green-500" />
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Lesson Complete</p>
      <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedLesson.title}</h3>
      <p className="text-slate-500 mt-2">Congratulations! You&apos;ve completed this lesson.</p>
    </div>
    {/* Auto-mark complete + actions */}
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {!progress[selectedLesson.id]?.completed && (
        <Button
          onClick={handleMarkComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Mark Complete
        </Button>
      )}
      {lessonQuizzes[selectedLesson.id] && (
        <Button
          variant="outline"
          onClick={() => router.push(`/student/courses/${params.id}/lessons/${selectedLesson.id}/quiz`)}
          className="border-[#2563EB] text-[#2563EB] font-bold hover:bg-blue-50"
        >
          <Play className="mr-2 h-4 w-4" />
          Take Quiz
        </Button>
      )}
      {/* Next lesson button */}
      {(() => {
        const idx = lessons.findIndex(l => l.id === selectedLesson.id);
        const next = lessons[idx + 1];
        return next ? (
          <Button
            onClick={() => selectLesson(next)}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
          >
            Next Lesson
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => router.push('/student')}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
          >
            Back to Dashboard
          </Button>
        );
      })()}
    </div>
  </div>
)}
```

---

### Task 5: Auto-mark complete on reaching completion slide

**Files:**
- Modify: `src/app/student/courses/[id]/page.tsx`

**Step 1: Add effect that marks lesson complete when completion slide is reached**

```tsx
useEffect(() => {
  if (!selectedLesson) return;
  if (currentSlideData?.kind !== 'completion') return;
  if (progress[selectedLesson.id]?.completed) return;
  // Auto-mark complete when student reaches the final slide
  handleMarkComplete();
}, [currentSlide, selectedLesson?.id]);
```

Note: `handleMarkComplete` is already defined — just call it from this effect. Ensure it is stable (no deps that change on render).

---

### Final: Remove old `handleMarkComplete` button from content area

The old "Mark as Complete" + "Take Quiz" buttons were at the bottom of the scrolling block list. They are now replaced by the completion slide. Ensure the old `<div className="flex gap-4 pt-4 border-t">` button row is removed.

---

### Verification Checklist

1. Navigate to a course → select a lesson → see title slide with hero image, description, attribution
2. Click Next → see first content block on its own slide
3. Counter shows `2 / N` and progress bar advances
4. Reach last content block → click Next → see completion slide
5. Completion slide shows Mark Complete (if not done), Take Quiz (if quiz exists), Next Lesson button
6. Click Next Lesson → jumps to next lesson at slide 0
7. Keyboard ← / → arrows navigate slides
8. Click "collapse" chevron in sidebar header → sidebar hides, content card expands full-width
9. "Show Lessons" button re-opens sidebar
10. On mobile (≤768px): sidebar stacks above content, both cards full width
