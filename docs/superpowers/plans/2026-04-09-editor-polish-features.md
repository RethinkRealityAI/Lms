# Editor Polish Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five polish features to the course editor: undo/redo toast feedback, block presets/templates, empty state coaching illustrations, lesson preview from editor, and keyboard shortcuts overlay.

**Architecture:** Each feature is independent — a new component or a small modification to an existing one. All features read from the existing Zustand editor store. No database migrations required. Block presets extend the existing `AVAILABLE_BLOCKS` palette with pre-configured data payloads. Lesson preview reuses the existing `CourseViewer` component with `previewMode`. The keyboard shortcuts overlay is a pure UI component triggered by a toolbar button or `?` key.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Zustand, shadcn/ui, lucide-react, sonner (toasts), Next.js App Router

---

## File Map

| Feature | Files | Action |
|---------|-------|--------|
| 1. Undo/Redo toasts | `src/components/editor/editor-toolbar.tsx` | Modify |
| 2. Block presets | `src/lib/content/block-presets.ts` | Create |
| 2. Block presets | `src/components/editor/properties-panel.tsx` | Modify |
| 3. Empty states | `src/components/editor/structure-panel.tsx` | Modify |
| 3. Empty states | `src/components/editor/module-node.tsx` | Modify |
| 3. Empty states | `src/components/editor/slide-preview.tsx` | Modify |
| 4. Lesson preview | `src/components/editor/lesson-preview-dialog.tsx` | Create |
| 4. Lesson preview | `src/components/editor/editor-toolbar.tsx` | Modify |
| 4. Lesson preview | `src/components/editor/course-editor-shell.tsx` | Modify |
| 5. Shortcuts overlay | `src/components/editor/keyboard-shortcuts-dialog.tsx` | Create |
| 5. Shortcuts overlay | `src/components/editor/editor-toolbar.tsx` | Modify |
| 5. Shortcuts overlay | `src/lib/hooks/use-keyboard-shortcuts.ts` | Modify |

---

### Task 1: Undo/Redo Toast Feedback

**Files:**
- Modify: `src/components/editor/editor-toolbar.tsx`

When the user clicks undo/redo (or uses keyboard shortcuts), show a brief sonner toast describing the action. The undo stack already stores the action `type` and `entityId`. Read the last action's type after undo/redo and show a human-readable message.

- [ ] **Step 1: Add toast import and undo/redo wrapper in editor-toolbar.tsx**

Add `import { toast } from 'sonner'` at the top. Create wrapper functions that call undo/redo then show a toast with the action description.

```tsx
// In editor-toolbar.tsx, after existing imports:
import { toast } from 'sonner';

// Inside the component, before the return:
const lastUndoAction = useEditorStore((s) => s.undoStack.at(-1));
const lastRedoAction = useEditorStore((s) => s.redoStack.at(-1));

function describeAction(type: string): string {
  const labels: Record<string, string> = {
    addModule: 'add module',
    removeModule: 'delete module',
    updateModule: 'module edit',
    addLesson: 'add lesson',
    removeLesson: 'delete lesson',
    updateLesson: 'lesson edit',
    addSlide: 'add slide',
    removeSlide: 'delete slide',
    updateSlide: 'slide edit',
    addBlock: 'add block',
    removeBlock: 'delete block',
    updateBlock: 'block edit',
    reorderBlocks: 'reorder blocks',
    duplicateBlock: 'duplicate block',
    switchBlockType: 'change block type',
    deleteSelectedBlocks: 'delete blocks',
    reorderSlides: 'reorder slides',
  };
  return labels[type] ?? type;
}

function handleUndo() {
  const action = lastUndoAction;
  undo();
  if (action) {
    toast('Undone', {
      description: describeAction(action.type),
      duration: 1500,
      position: 'bottom-center',
    });
  }
}

function handleRedo() {
  const action = lastRedoAction;
  redo();
  if (action) {
    toast('Redone', {
      description: describeAction(action.type),
      duration: 1500,
      position: 'bottom-center',
    });
  }
}
```

- [ ] **Step 2: Wire the new handlers to the undo/redo buttons**

Replace `onClick={undo}` with `onClick={handleUndo}` and `onClick={redo}` with `onClick={handleRedo}` on the two toolbar buttons.

- [ ] **Step 3: Verify — click undo/redo and confirm toast appears**

Run dev server (`npm run dev -- -p 3001`), open the editor, make a change, click Undo. A small toast should appear at the bottom saying "Undone — block edit" (or similar).

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/editor-toolbar.tsx
git commit -m "feat: undo/redo toast feedback in editor toolbar"
```

---

### Task 2: Block Presets / Templates

**Files:**
- Create: `src/lib/content/block-presets.ts`
- Modify: `src/components/editor/properties-panel.tsx`

Add a "Presets" section below the Components grid in the properties panel. Each preset is a named block type + pre-filled data payload. Clicking a preset calls the same `onAddBlock` handler.

- [ ] **Step 1: Create block-presets.ts with preset definitions**

```ts
// src/lib/content/block-presets.ts
import type { LucideIcon } from 'lucide-react';
import {
  Columns,
  Lightbulb,
  HelpCircle,
  ListChecks,
  Quote,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';

export interface BlockPreset {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  blockType: string;
  data: Record<string, unknown>;
}

export const BLOCK_PRESETS: BlockPreset[] = [
  {
    id: 'key-takeaway',
    label: 'Key Takeaway',
    description: 'Highlighted learning point',
    icon: Lightbulb,
    color: 'text-amber-500 bg-amber-50',
    blockType: 'callout',
    data: { variant: 'info', title: 'Key Takeaway', html: '<p>The main point your learners should remember...</p>' },
  },
  {
    id: 'warning-note',
    label: 'Warning',
    description: 'Important caution or disclaimer',
    icon: AlertTriangle,
    color: 'text-red-500 bg-red-50',
    blockType: 'callout',
    data: { variant: 'warning', title: 'Important', html: '<p>Please be aware that...</p>' },
  },
  {
    id: 'true-false',
    label: 'True / False',
    description: 'Quick knowledge check',
    icon: HelpCircle,
    color: 'text-green-500 bg-green-50',
    blockType: 'quiz_inline',
    data: {
      question_type: 'multiple_choice',
      question: 'Is this statement true or false?',
      options: ['True', 'False'],
      correct_answer: 'True',
      show_feedback: true,
    },
  },
  {
    id: 'multi-choice-4',
    label: '4-Option Quiz',
    description: 'Standard multiple choice',
    icon: ListChecks,
    color: 'text-orange-500 bg-orange-50',
    blockType: 'quiz_inline',
    data: {
      question_type: 'multiple_choice',
      question: 'Which of the following is correct?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A',
      show_feedback: true,
    },
  },
  {
    id: 'pull-quote',
    label: 'Pull Quote',
    description: 'Emphasized quotation',
    icon: Quote,
    color: 'text-indigo-500 bg-indigo-50',
    blockType: 'rich_text',
    data: {
      html: '<blockquote><p>"Add an impactful quote here that reinforces the lesson content."</p><p>— Attribution</p></blockquote>',
    },
  },
  {
    id: 'image-with-caption',
    label: 'Image + Caption',
    description: 'Single image with description',
    icon: ImageIcon,
    color: 'text-teal-500 bg-teal-50',
    blockType: 'image_gallery',
    data: {
      mode: 'gallery',
      images: [{ url: '', alt: '', caption: 'Describe this image...' }],
    },
  },
];
```

- [ ] **Step 2: Add preset grid to properties-panel.tsx Components tab**

In `properties-panel.tsx`, import `BLOCK_PRESETS` and add a "Presets" section below the existing block grid inside `renderContent` when `activeTab === 'components'`:

```tsx
import { BLOCK_PRESETS } from '@/lib/content/block-presets';

// Inside the components tab render, after the AVAILABLE_BLOCKS grid:
<div className="mt-5 space-y-3">
  <div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Presets</p>
    <p className="text-[11px] text-gray-400 mt-0.5">Pre-filled templates — click to add</p>
  </div>
  <div className="space-y-1.5">
    {BLOCK_PRESETS.map((preset) => (
      <button
        key={preset.id}
        onClick={() => onAddBlock?.(activeSlideId!, preset.blockType, undefined, preset.data)}
        disabled={!activeSlideId}
        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 bg-white
          shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5
          active:scale-[0.98] transition-all duration-150 text-left
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className={`p-2 rounded-lg shrink-0 ${preset.color}`}>
          <preset.icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{preset.label}</p>
          <p className="text-[10px] text-gray-400 truncate">{preset.description}</p>
        </div>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Update onAddBlock signature to accept optional preset data**

In `PropertiesPanelProps` and `EditorDndContextProps`, extend `onAddBlock` to accept an optional `data` override:

```ts
onAddBlock?: (slideId: string, blockType: string, insertIndex?: number, presetData?: Record<string, unknown>) => void;
```

Update `handleAddBlock` in `course-editor-shell.tsx` to use `presetData ?? getDefaultBlockData(blockType)` instead of always calling `getDefaultBlockData`.

- [ ] **Step 4: Verify — switch to Components tab, see Presets section, click "Key Takeaway"**

A callout block should appear on the canvas with "Key Takeaway" title and placeholder text pre-filled.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/block-presets.ts src/components/editor/properties-panel.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: block presets in editor palette — Key Takeaway, True/False, Pull Quote, etc."
```

---

### Task 3: Empty State Coaching

**Files:**
- Modify: `src/components/editor/structure-panel.tsx`
- Modify: `src/components/editor/module-node.tsx`
- Modify: `src/components/editor/slide-preview.tsx`

Replace the minimal empty states with illustrated coaching messages that guide the user through the course creation flow.

- [ ] **Step 1: Improve empty modules state in structure-panel.tsx**

Replace the current `modules.length === 0` block (lines 138-150) with a richer empty state:

```tsx
{modules.length === 0 ? (
  <div className="text-center py-12 px-5">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3A5F]/10 to-[#2563EB]/10 flex items-center justify-center mx-auto mb-4">
      <FolderPlus className="w-7 h-7 text-[#1E3A5F]" />
    </div>
    <p className="text-sm font-semibold text-gray-700 mb-1">Start building your course</p>
    <p className="text-xs text-gray-400 mb-4 leading-relaxed">
      Modules organize your course into sections.<br />
      Each module contains lessons with slides.
    </p>
    <button
      onClick={() => setShowAddModule(true)}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] transition-colors shadow-sm"
    >
      <Plus className="w-4 h-4" />
      Add first module
    </button>
  </div>
) : ( ... )}
```

Add `FolderPlus` to the lucide-react import.

- [ ] **Step 2: Improve empty lessons state in module-node.tsx**

Replace the inline `+ Add first lesson` text (lines 98-104) with:

```tsx
{lessons.length === 0 ? (
  <div className="ml-4 py-3 px-3">
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-blue-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">No lessons yet</p>
        <button
          onClick={() => setShowAddLesson(true)}
          className="text-xs text-[#1E3A5F] font-medium hover:underline mt-0.5"
        >
          + Add a lesson to get started
        </button>
      </div>
    </div>
  </div>
) : ( ... )}
```

Add `FileText` to the lucide-react import.

- [ ] **Step 3: Improve empty slide canvas in slide-preview.tsx**

Replace the dashed border empty state (lines 182-195) with a more inviting one:

```tsx
<SlideContentArea>
  <div className={`flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-sm transition-all duration-200 ${
    isOver
      ? 'border-blue-400 bg-blue-50/60 text-blue-500 scale-[1.01]'
      : 'border-gray-200 text-gray-400'
  }`}>
    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
      <Layers className="w-6 h-6 text-gray-300" />
    </div>
    <p className="font-medium text-gray-500">
      {isOver ? 'Drop here to add' : 'Empty slide'}
    </p>
    <p className="text-xs mt-1.5 max-w-[220px] text-center leading-relaxed text-gray-400">
      {isOver
        ? 'Release to place the block'
        : 'Drag components from the right panel, or click a component to add it here'}
    </p>
  </div>
</SlideContentArea>
```

Add `Layers` to the lucide-react import.

- [ ] **Step 4: Verify — open an empty course, confirm all three empty states look polished**

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/structure-panel.tsx src/components/editor/module-node.tsx src/components/editor/slide-preview.tsx
git commit -m "feat: polished empty state coaching in editor panels"
```

---

### Task 4: Lesson Preview from Editor

**Files:**
- Create: `src/components/editor/lesson-preview-dialog.tsx`
- Modify: `src/components/editor/editor-toolbar.tsx`
- Modify: `src/components/editor/course-editor-shell.tsx`

Add a "Play" button to the toolbar that opens a full-screen modal showing the current lesson's slides in the student viewer. Reuses `CourseViewer` with `previewMode`.

- [ ] **Step 1: Create lesson-preview-dialog.tsx**

```tsx
// src/components/editor/lesson-preview-dialog.tsx
'use client';

import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import { CourseViewer } from '@/components/student/course-viewer';

interface LessonPreviewDialogProps {
  courseId: string;
  onClose: () => void;
}

export function LessonPreviewDialog({ courseId, onClose }: LessonPreviewDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Play className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Lesson Preview</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
        >
          <span>Back to Editor</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Course viewer */}
      <div className="flex-1 min-h-0">
        <CourseViewer courseId={courseId} previewMode />
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Add Play button to editor-toolbar.tsx**

Add a `Play` icon import and a `onPreviewLesson` callback prop. Place the button next to the existing Eye (preview) button:

```tsx
// New prop:
onPreviewLesson?: () => void;

// Button (after the Eye button):
<button
  onClick={onPreviewLesson}
  className="p-2 rounded hover:bg-gray-100 transition-colors"
  title="Preview lesson (student view)"
>
  <Play className="w-4 h-4 text-gray-600" />
</button>
```

- [ ] **Step 3: Wire state in course-editor-shell.tsx**

Add `lessonPreviewOpen` state and pass the handler to the toolbar. Render `LessonPreviewDialog` when open.

```tsx
const [lessonPreviewOpen, setLessonPreviewOpen] = useState(false);

// In JSX:
<EditorToolbar
  onSave={saveNow}
  courseId={courseId}
  devicePreview={devicePreview}
  onDevicePreviewChange={setDevicePreview}
  onPreviewLesson={() => setLessonPreviewOpen(true)}
/>

{lessonPreviewOpen && (
  <LessonPreviewDialog
    courseId={courseId}
    onClose={() => setLessonPreviewOpen(false)}
  />
)}
```

- [ ] **Step 4: Verify — click Play in toolbar, confirm full-screen student view opens, close returns to editor**

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/lesson-preview-dialog.tsx src/components/editor/editor-toolbar.tsx src/components/editor/course-editor-shell.tsx
git commit -m "feat: lesson preview button in editor toolbar"
```

---

### Task 5: Keyboard Shortcuts Overlay

**Files:**
- Create: `src/components/editor/keyboard-shortcuts-dialog.tsx`
- Modify: `src/components/editor/editor-toolbar.tsx`
- Modify: `src/lib/hooks/use-keyboard-shortcuts.ts`

A modal overlay showing all available keyboard shortcuts. Triggered by `?` key or a toolbar button.

- [ ] **Step 1: Create keyboard-shortcuts-dialog.tsx**

```tsx
// src/components/editor/keyboard-shortcuts-dialog.tsx
'use client';

import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'S'], description: 'Save changes' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Delete'], description: 'Delete selected' },
      { keys: ['?'], description: 'Show shortcuts' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['\u2190'], description: 'Previous slide' },
      { keys: ['\u2192'], description: 'Next slide' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['Click'], description: 'Select block' },
      { keys: ['Shift', 'Click'], description: 'Multi-select blocks' },
      { keys: ['Right-click'], description: 'Context menu' },
      { keys: ['Double-click'], description: 'Rename (slides)' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-md shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                {group.title}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-300 text-xs">+</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center">
            Press <Kbd>?</Kbd> anytime to toggle this overlay
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Add `?` key handler to use-keyboard-shortcuts.ts**

Add `onShowShortcuts` to the `ShortcutHandlers` interface and handle the `?` key:

```ts
// In ShortcutHandlers interface:
onShowShortcuts?: () => void;

// In the keydown handler, before the editable target check:
if (e.key === '?' && handlers.onShowShortcuts) {
  e.preventDefault();
  handlers.onShowShortcuts();
  return;
}
```

- [ ] **Step 3: Add toolbar button and state wiring in editor-toolbar.tsx**

Import `Keyboard` icon. Add `onShowShortcuts` prop. Place button after device preview group:

```tsx
<button
  onClick={onShowShortcuts}
  className="p-2 rounded hover:bg-gray-100 transition-colors"
  title="Keyboard shortcuts (?)"
>
  <Keyboard className="w-4 h-4 text-gray-600" />
</button>
```

- [ ] **Step 4: Wire state in course-editor-shell.tsx**

```tsx
const [shortcutsOpen, setShortcutsOpen] = useState(false);

// Pass to toolbar:
onShowShortcuts={() => setShortcutsOpen(true)}

// Pass to useKeyboardShortcuts:
onShowShortcuts: () => setShortcutsOpen((v) => !v),

// Render dialog:
{shortcutsOpen && (
  <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />
)}
```

- [ ] **Step 5: Verify — press `?` key, confirm overlay appears. Press again or click X to close. Click toolbar button to open.**

- [ ] **Step 6: Commit**

```bash
git add src/components/editor/keyboard-shortcuts-dialog.tsx src/components/editor/editor-toolbar.tsx src/lib/hooks/use-keyboard-shortcuts.ts src/components/editor/course-editor-shell.tsx
git commit -m "feat: keyboard shortcuts overlay (? key + toolbar button)"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --pretty
```
Expected: No errors.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 3: Manual smoke test in browser**

Open `http://localhost:3001/gansid/admin/courses/<id>/editor`:
1. Undo/redo: make a change, Ctrl+Z — toast appears
2. Block presets: Components tab → scroll to Presets → click "Key Takeaway" — callout block added
3. Empty states: create new module, confirm coaching illustration. Open a slide with no blocks, confirm coaching text.
4. Lesson preview: click Play button in toolbar — full-screen student view opens
5. Shortcuts: press `?` — overlay appears. Press `?` again — closes. Click toolbar keyboard icon — opens.
