# WYSIWYG Editor Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor canvas render slides identically to the student viewer — true WYSIWYG with no gap between "what you edit" and "what students see."

**Architecture:** Extract the student slide rendering into a shared `SlideFrame` component that both the student viewer and the editor preview consume. The editor wraps each block in interactive sortable wrappers but the visual output — padding, gaps, typography, title slide, progress bar, nav — is pixel-identical to the student view. Inspired by the SCAGO simulation editor pattern of rendering actual component nodes on the canvas (not mocks).

**Tech Stack:** React 19, Tailwind CSS 4, @dnd-kit, Zustand, existing block registry

---

## File Structure

### New Files
- `src/components/shared/slide-frame.tsx` — Shared slide frame that renders the exact student card layout (header with progress, content area with correct padding/gaps, bottom nav). Used by both student viewer and editor preview.
- `src/components/shared/title-slide.tsx` — The title slide rendering (gradient/image, centered text, GANSID branding). Extracted from course-viewer.tsx.
- `src/components/shared/completion-slide.tsx` — The completion slide rendering. Extracted from course-viewer.tsx.

### Modified Files
- `src/components/editor/slide-preview.tsx` — Replace custom block rendering with SlideFrame, wrap blocks in sortable/selectable overlays
- `src/components/editor/preview-panel.tsx` — Pass lesson context to SlidePreview for accurate title/progress rendering
- `src/components/student/course-viewer.tsx` — Consume SlideFrame instead of inline rendering
- `src/components/editor/course-editor-shell.tsx` — Pass lesson data to preview panel

---

## Task 1: Extract shared SlideFrame component

**Files:**
- Create: `src/components/shared/slide-frame.tsx`

This component renders the exact card layout from the student viewer: header with lesson title + progress bar, content area, and bottom nav shell. It accepts `children` for the content area so both the student viewer and editor can inject their own block rendering.

- [ ] **Step 1: Create slide-frame.tsx**

```tsx
'use client';

import type { ReactNode } from 'react';

export interface SlideFrameProps {
  /** Lesson title shown in the header */
  lessonTitle: string;
  /** 1-based current slide number */
  currentSlide: number;
  /** Total number of slides */
  totalSlides: number;
  /** The content area — blocks, title slide, or completion slide */
  children: ReactNode;
  /** Whether to show the bottom nav bar (false in editor) */
  showNav?: boolean;
  /** Previous/Next callbacks (only used when showNav=true) */
  onPrev?: () => void;
  onNext?: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  /** Hide next button (e.g., last slide) */
  hideNext?: boolean;
}

export function SlideFrame({
  lessonTitle,
  currentSlide,
  totalSlides,
  children,
  showNav = false,
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
  hideNext,
}: SlideFrameProps) {
  const progress = totalSlides > 0 ? ((currentSlide) / totalSlides) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header: lesson title + slide counter + progress bar */}
      <div className="px-6 pt-5 pb-4 shrink-0 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-black uppercase tracking-widest text-[#1E3A5F] truncate pr-4">
            {lessonTitle}
          </span>
          <span className="text-sm font-bold text-slate-500 shrink-0">
            {currentSlide} / {totalSlides}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-[#1E3A5F] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content area — exact student styling */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>

      {/* Bottom nav — only in student view */}
      {showNav && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onPrev}
            disabled={isPrevDisabled}
            className="inline-flex items-center px-4 py-2 text-sm font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {!hideNext && (
            <button
              onClick={onNext}
              disabled={isNextDisabled}
              className="inline-flex items-center px-4 py-2 text-sm font-bold bg-[#1E3A5F] hover:bg-[#0F172A] text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Wrapper for page/content slides — exact student padding and gap */
export function SlideContentArea({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-3 sm:px-6 sm:py-5 overflow-y-auto flex-1 flex flex-col gap-5">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/slide-frame.tsx
git commit -m "feat: extract shared SlideFrame component for WYSIWYG editor"
```

---

## Task 2: Extract TitleSlide and CompletionSlide

**Files:**
- Create: `src/components/shared/title-slide.tsx`
- Create: `src/components/shared/completion-slide.tsx`

- [ ] **Step 1: Create title-slide.tsx**

Extract the title slide rendering from course-viewer.tsx (lines 660-704):

```tsx
'use client';

interface TitleSlideProps {
  lessonTitle: string;
  lessonDescription?: string | null;
  titleImageUrl?: string | null;
  courseDate?: string | null;
}

export function TitleSlide({ lessonTitle, lessonDescription, titleImageUrl, courseDate }: TitleSlideProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0">
        {titleImageUrl ? (
          <img src={titleImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      {/* Centered content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 sm:px-12">
        <p className="text-white/60 text-xs sm:text-sm uppercase tracking-[0.2em] font-bold mb-4">GANSID Learning</p>
        <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-tight max-w-3xl">
          {lessonTitle}
        </h2>
        {lessonDescription && (
          <p className="text-white/70 text-sm sm:text-base lg:text-lg leading-relaxed mt-4 max-w-2xl">
            {lessonDescription}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black shrink-0">G</div>
          <div>
            <p className="text-sm font-bold text-white/90">GANSID</p>
            <p className="text-[11px] text-white/50">Global Action Network for Sickle Cell &amp; Inherited Blood Disorders</p>
          </div>
        </div>
        {courseDate && (
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-white/40">{courseDate}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create completion-slide.tsx**

```tsx
'use client';

import { Award } from 'lucide-react';

interface CompletionSlideProps {
  lessonTitle: string;
  /** In editor mode, don't show action buttons */
  editorMode?: boolean;
}

export function CompletionSlide({ lessonTitle, editorMode }: CompletionSlideProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-10 px-8 text-center gap-6 flex-1 overflow-y-auto">
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
        <Award className="h-10 w-10 text-green-500" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Lesson Complete</p>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{lessonTitle}</h3>
        <p className="text-slate-500 mt-2 text-base">
          {editorMode ? 'This is the completion slide students will see.' : "Congratulations! You've completed this lesson."}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/title-slide.tsx src/components/shared/completion-slide.tsx
git commit -m "feat: extract TitleSlide and CompletionSlide as shared components"
```

---

## Task 3: Rewrite editor SlidePreview to use SlideFrame

**Files:**
- Modify: `src/components/editor/slide-preview.tsx`

This is the key change. The current `slide-preview.tsx` renders blocks with `p-6 pl-10 space-y-3` which doesn't match the student view (`px-6 py-5 gap-5`). Replace with `SlideFrame` + `SlideContentArea` wrapping the sortable blocks.

- [ ] **Step 1: Rewrite slide-preview.tsx**

The new component:
- Uses `SlideFrame` for the card shell (header, progress bar)
- Renders title slides using `TitleSlide` for slide_type === 'title'
- Renders content slides using `SlideContentArea` with sortable blocks inside
- Renders completion slides using `CompletionSlide` for slide_type === 'completion'
- Blocks are still wrapped in `SortableBlock` for DnD
- Block selection rings and labels still work
- The `useDroppable` canvas drop zone is on the content area

Replace entire file content with:

```tsx
'use client';

import { Suspense } from 'react';
import { Trash2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { LessonBlockRenderer } from '@/components/lesson-block-renderer';
import { SlideFrame, SlideContentArea } from '@/components/shared/slide-frame';
import { TitleSlide } from '@/components/shared/title-slide';
import { CompletionSlide } from '@/components/shared/completion-slide';
import { useEditorStore } from './editor-store-context';
import { SortableBlock } from './dnd/sortable-block';
import type { Slide } from '@/types';

interface SlidePreviewProps {
  slide: Slide;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock?: (blockId: string) => void;
  selectedBlockId?: string;
  /** Lesson title for the header */
  lessonTitle?: string;
  /** Lesson description for title slide */
  lessonDescription?: string | null;
  /** Title image URL for title slide background */
  titleImageUrl?: string | null;
  /** Current slide index (1-based) */
  slideNumber?: number;
  /** Total slides in this lesson */
  totalSlides?: number;
}

export function SlidePreview({
  slide,
  onSelectBlock,
  onDeleteBlock,
  selectedBlockId,
  lessonTitle = 'Untitled Lesson',
  lessonDescription,
  titleImageUrl,
  slideNumber = 1,
  totalSlides = 1,
}: SlidePreviewProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'slide-canvas' });

  // Determine slide kind from slide_type
  const isTitle = slide.slide_type === 'title';
  const isCompletion = slide.slide_type === 'completion';

  return (
    <SlideFrame
      lessonTitle={lessonTitle}
      currentSlide={slideNumber}
      totalSlides={totalSlides}
    >
      {/* TITLE SLIDE */}
      {isTitle && (
        <TitleSlide
          lessonTitle={lessonTitle}
          lessonDescription={lessonDescription}
          titleImageUrl={titleImageUrl}
        />
      )}

      {/* COMPLETION SLIDE */}
      {isCompletion && (
        <CompletionSlide lessonTitle={lessonTitle} editorMode />
      )}

      {/* CONTENT SLIDE — blocks with sortable DnD */}
      {!isTitle && !isCompletion && (
        <div
          ref={setDropRef}
          className={`flex-1 overflow-y-auto transition-all duration-200 ${
            isOver ? 'ring-2 ring-inset ring-blue-300 rounded-b-xl' : ''
          }`}
        >
          <SlideContentArea>
            {blocks.length === 0 ? (
              <div className={`flex items-center justify-center h-40 border-2 border-dashed rounded-xl text-sm transition-all duration-200 ${
                isOver
                  ? 'border-blue-400 bg-blue-50/60 text-blue-500 scale-[1.01]'
                  : 'border-gray-200 text-gray-400'
              }`}>
                <div className="text-center">
                  <p className="font-medium">{isOver ? 'Drop here to add' : 'No blocks on this slide'}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {isOver ? 'Release to place the block' : 'Drag components from the panel or click to add'}
                  </p>
                </div>
              </div>
            ) : (
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    id={block.id}
                    blockType={block.block_type}
                    label={block.block_type.replace('_', ' ')}
                  >
                    <div
                      onClick={() => onSelectBlock(block.id)}
                      className={`relative group/block cursor-pointer rounded-xl transition-all duration-150 ${
                        selectedBlockId === block.id
                          ? 'ring-2 ring-[#1E3A5F] ring-offset-2 shadow-sm'
                          : 'hover:ring-2 hover:ring-blue-200 hover:ring-offset-1'
                      }`}
                    >
                      {/* Block type label + delete */}
                      <div
                        className={`absolute -top-6 left-0 flex items-center gap-1.5 transition-all duration-150 z-10 ${
                          selectedBlockId === block.id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover/block:opacity-100'
                        }`}
                      >
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase ${
                          selectedBlockId === block.id
                            ? 'bg-[#1E3A5F] text-white'
                            : 'bg-gray-600 text-white'
                        }`}>
                          {block.block_type.replace('_', ' ')}
                        </span>
                        {onDeleteBlock && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                            title="Delete block"
                            className="p-0.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Block content — rendered identically to student view */}
                      <div className="pointer-events-none">
                        <Suspense fallback={<div className="animate-pulse bg-gray-100 rounded-xl h-16" />}>
                          <LessonBlockRenderer
                            block={{
                              id: block.id,
                              institution_id: '',
                              lesson_id: '',
                              block_type: block.block_type,
                              data: block.data,
                              order_index: block.order_index,
                              is_visible: block.is_visible,
                              settings: {},
                              version: 1,
                              title: undefined,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString(),
                            }}
                            lessonTitle={lessonTitle}
                          />
                        </Suspense>
                      </div>
                    </div>
                  </SortableBlock>
                ))}
              </SortableContext>
            )}
          </SlideContentArea>
        </div>
      )}
    </SlideFrame>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/slide-preview.tsx
git commit -m "feat(editor): WYSIWYG preview using shared SlideFrame — matches student view"
```

---

## Task 4: Pass lesson context from editor shell to preview

**Files:**
- Modify: `src/components/editor/preview-panel.tsx`
- Modify: `src/components/editor/course-editor-shell.tsx`

The SlidePreview now needs lesson title, description, image URL, slide number, and total slides. These need to flow from the editor shell through the preview panel.

- [ ] **Step 1: Update PreviewPanel to accept and pass lesson context**

In `preview-panel.tsx`, update the props interface and pass lesson data to `SlidePreview`:

Add to `PreviewPanelProps`:
```typescript
export interface PreviewPanelProps {
  onAddBlock?: (slideId: string, blockType: string) => void;
  onDeleteBlock?: (blockId: string) => void;
}
```

Inside the component, resolve the lesson that owns the selected slide. Add after the `selectedSlide` resolution logic (after line ~60):

```typescript
// Resolve lesson context for the selected slide
let lessonTitle = 'Untitled Lesson';
let lessonDescription: string | null = null;
let titleImageUrl: string | null = null;

const lessons = useEditorStore((s) => s.lessons);

if (selectedSlide) {
  // Find which lesson owns this slide
  for (const [lessonId, slideList] of slides) {
    if (slideList.some(s => s.id === selectedSlide!.id)) {
      // Find the lesson data
      for (const lessonList of lessons.values()) {
        const lesson = lessonList.find(l => l.id === lessonId);
        if (lesson) {
          lessonTitle = lesson.title;
          lessonDescription = lesson.description ?? null;
          titleImageUrl = lesson.title_image_url ?? null;
          break;
        }
      }
      break;
    }
  }
}
```

Then update the `SlidePreview` render to pass these props:

```tsx
<SlidePreview
  slide={selectedSlide}
  selectedBlockId={selectedBlockId}
  onSelectBlock={(blockId) => selectEntity({ type: 'block', id: blockId })}
  onDeleteBlock={onDeleteBlock}
  lessonTitle={lessonTitle}
  lessonDescription={lessonDescription}
  titleImageUrl={titleImageUrl}
  slideNumber={slideIndex + 1}
  totalSlides={siblingSlides.length}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/preview-panel.tsx
git commit -m "feat(editor): pass lesson context to SlidePreview for accurate WYSIWYG rendering"
```

---

## Task 5: Update student course-viewer to use shared components

**Files:**
- Modify: `src/components/student/course-viewer.tsx`

Replace the inline title slide and completion slide rendering with the shared components. This ensures both editor and student view stay in sync going forward.

- [ ] **Step 1: Import shared components**

Add at top of course-viewer.tsx:
```typescript
import { TitleSlide } from '@/components/shared/title-slide';
import { CompletionSlide } from '@/components/shared/completion-slide';
```

- [ ] **Step 2: Replace title slide inline JSX (lines ~660-704)**

Replace the `{currentSlideData?.kind === 'title' && (...)}` block with:

```tsx
{currentSlideData?.kind === 'title' && (
  <TitleSlide
    lessonTitle={selectedLesson.title}
    lessonDescription={selectedLesson.description}
    titleImageUrl={selectedLesson.title_image_url}
    courseDate={course?.created_at ? new Date(course.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }) : null}
  />
)}
```

- [ ] **Step 3: Replace completion slide inline JSX (lines ~716-759)**

Replace the `{currentSlideData?.kind === 'completion' && (...)}` block with the shared `CompletionSlide` plus the action buttons that are student-specific (quiz, review, next lesson). The shared component handles the icon and text; the buttons stay inline since they depend on student-specific state.

```tsx
{currentSlideData?.kind === 'completion' && (
  <div className="relative flex flex-col items-center justify-center py-10 px-8 text-center gap-6 flex-1 overflow-y-auto">
    {showConfetti && <Confetti />}
    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center animate-bounce [animation-iteration-count:1] [animation-duration:0.8s]">
      <Award className="h-10 w-10 text-green-500" />
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Lesson Complete</p>
      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedLesson.title}</h3>
      <p className="text-slate-500 mt-2 text-base">Congratulations! You&apos;ve completed this lesson.</p>
    </div>
    <div className="flex flex-wrap gap-3 justify-center">
      {/* Student-specific action buttons stay here */}
      {lessonQuizzes[selectedLesson.id] && (
        <Button variant="outline"
          onClick={() => router.push(`/student/courses/${courseId}/lessons/${selectedLesson.id}/quiz`)}
          className="border-[#1E3A5F] text-[#1E3A5F] font-bold hover:bg-[#1E3A5F]/10">
          <Play className="mr-2 h-4 w-4" />Take Quiz
        </Button>
      )}
      {!previewMode && lessons.findIndex(l => l.id === selectedLesson.id) === lessons.length - 1 && (
        <Button variant="outline" onClick={openReviewModal}
          className="border-yellow-400 text-yellow-700 font-bold hover:bg-yellow-50">
          <Star className="mr-2 h-4 w-4" />Leave a Review
        </Button>
      )}
      {(() => {
        const idx = lessons.findIndex(l => l.id === selectedLesson.id);
        const next = lessons[idx + 1];
        return next ? (
          <Button onClick={() => selectLesson(next)}
            disabled={!allQuizzesComplete}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            Next Lesson<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => router.push('/gansid/student')}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold">
            Back to Dashboard
          </Button>
        );
      })()}
    </div>
  </div>
)}
```

Note: For this task, only extract the `TitleSlide` to the shared component. The completion slide in the student view has too much student-specific state (confetti, quiz buttons, review) to cleanly use the shared `CompletionSlide`. Keep the student completion inline but use `CompletionSlide` only in the editor.

- [ ] **Step 4: Commit**

```bash
git add src/components/student/course-viewer.tsx
git commit -m "refactor: student viewer uses shared TitleSlide component"
```

---

## Task 6: Verify build and test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No new errors (ignore pre-existing groups-tab.tsx errors).

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix any build issues from WYSIWYG editor refactor"
```

---

## Summary

| Area | Before | After |
|------|--------|-------|
| Content padding | `p-6 pl-10 space-y-3` (editor-only) | `px-6 py-5 gap-5` (matches student) |
| Block gap | `space-y-3` (12px) | `gap-5` (20px, matches student) |
| Slide header | None — just "Preview" label | Lesson title + slide counter + progress bar |
| Title slide | Not rendered in editor | Full gradient/image title slide with GANSID branding |
| Completion slide | Not rendered in editor | Award icon + "Lesson Complete" preview |
| Typography | No prose styling context | Blocks render inside same container as student view |
| Card styling | `rounded-2xl shadow-lg border-gray-100` | `border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)]` (matches student) |
| Code sharing | Editor and student have separate rendering | Shared `SlideFrame`, `TitleSlide`, `CompletionSlide` |
