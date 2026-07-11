import { createStore } from 'zustand/vanilla';
import type { Slide, EntitySelection, EditorAction, CourseStatus } from '@/types';
import type { CourseThemeSettings } from '@/lib/content/course-theme';
import type { InstitutionTheme as InstitutionDbTheme } from '@/lib/tenant/institution-theme';
import { publishCourse as dbPublishCourse } from '@/lib/db';
import { getBlockGridLayout, GRID_COLS } from '@/lib/content/gridConstants';

export interface ModuleData {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  description?: string;
}

import type { TitleSlideSettings } from '@/lib/content/title-slide-settings';

export interface LessonData {
  id: string;
  title: string;
  module_id?: string;
  course_id: string;
  order_index: number;
  description?: string;
  title_image_url?: string | null;
  title_slide_settings?: TitleSlideSettings | null;
}

export interface BlockData {
  id: string;
  slide_id: string;
  block_type: string;
  data: Record<string, unknown>;
  order_index: number;
  is_visible: boolean;
}

interface Snapshot {
  modules: ModuleData[];
  lessons: Map<string, LessonData[]>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, BlockData[]>;
  themeSettings: CourseThemeSettings;
}

export interface EditorState {
  courseId: string | null;
  /** Course (a.k.a. module) display title — shown as the title-slide eyebrow in the editor preview. */
  courseTitle: string | null;
  institutionId: string | null;
  courseStatus: CourseStatus;
  isPublishing: boolean;
  publishError: string | null;
  modules: ModuleData[];
  lessons: Map<string, LessonData[]>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, BlockData[]>;
  themeSettings: CourseThemeSettings;
  /** Institution-wide theme loaded from `institutions.theme` — used as cascade layer below course settings. */
  institutionTheme: InstitutionDbTheme;
  selectedEntity: EntitySelection | null;
  previewSlideIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  /** True only while undo/redo is restoring a snapshot — lets the editor's
   *  edit→draft subscription ignore the restore (undo/redo is not an edit). */
  isRestoring: boolean;
  lastSaveError: string | null;
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  setCourseStatus: (status: CourseStatus) => void;
  publishCourse: () => Promise<void>;
  selectEntity: (entity: EntitySelection | null) => void;
  /** Global course settings (header colours, default block style + background) — courses.theme_settings */
  updateThemeSettings: (changes: Partial<CourseThemeSettings>) => void;
  /** Set the institution theme after async fetch — no undo entry, not a dirty change. */
  setInstitutionTheme: (theme: InstitutionDbTheme) => void;
  addModule: (module: ModuleData) => void;
  updateModule: (moduleId: string, changes: Partial<Pick<ModuleData, 'title' | 'description'>>) => void;
  removeModule: (moduleId: string) => void;
  addLesson: (moduleId: string, lesson: LessonData) => void;
  updateLesson: (moduleId: string, lessonId: string, changes: Partial<Pick<LessonData, 'title' | 'description' | 'title_image_url' | 'title_slide_settings'>>) => void;
  removeLesson: (moduleId: string, lessonId: string) => void;
  addSlide: (lessonId: string, slide: Slide) => void;
  removeSlide: (lessonId: string, slideId: string) => void;
  /** Re-insert a restored (un-trashed) slide at `index` with its blocks. No undo
   *  entry — it IS the Undo — and not a dirty change (the DB already matches). */
  restoreSlide: (lessonId: string, slide: Slide, index: number, blocks: BlockData[]) => void;
  reorderSlides: (lessonId: string, slideIds: string[]) => void;
  updateSlide: (lessonId: string, slideId: string, changes: Partial<Slide>) => void;
  moveSlideToLesson: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  addBlock: (slideId: string, block: BlockData) => void;
  updateBlock: (slideId: string, blockId: string, changes: Partial<BlockData>) => void;
  /** Auto-fit a block's grid height to its content and push blocks below it down/up (atomic, no undo entry) */
  fitBlockHeight: (slideId: string, blockId: string, gridH: number) => void;
  /** Move a block up (-1) or down (+1) one slot in visual order, then compact (single undo entry) */
  moveBlockVertical: (slideId: string, blockId: string, dir: -1 | 1) => void;
  /** Set a block's grid width (columns), clamp its x to stay on-grid, then compact (single undo entry) */
  setBlockWidth: (slideId: string, blockId: string, gridW: number, align?: 'left' | 'center' | 'right') => void;
  removeBlock: (slideId: string, blockId: string) => void;
  reorderBlocks: (slideId: string, blockIds: string[]) => void;
  duplicateBlock: (slideId: string, blockId: string, newBlockId: string, newData: Record<string, unknown>) => void;
  switchBlockType: (slideId: string, blockId: string, newType: string, newData: Record<string, unknown>) => void;
  selectedBlockIds: Set<string>;
  toggleBlockSelection: (blockId: string) => void;
  clearBlockSelection: () => void;
  deleteSelectedBlocks: (slideId: string) => void;
  duplicateSelectedBlocks: (slideId: string) => void;
  alignBlocks: (slideId: string, alignment: 'left' | 'right' | 'top' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
  setPreviewSlideIndex: (index: number) => void;
  devicePreview: 'desktop' | 'tablet' | 'mobile';
  setDevicePreview: (d: 'desktop' | 'tablet' | 'mobile') => void;
  /** Flip the given slides from 'published' back to 'draft' (edit-then-republish
   *  workflow). No-op for slides that are already draft. No undo entry — it's a
   *  side-effect of editing, applied by the save layer. */
  markSlidesDraft: (slideIds: string[]) => void;
  markSaved: () => void;
  setSaveError: (error: string | null) => void;
  undo: () => void;
  redo: () => void;
  loadCourse: (data: {
    courseId: string;
    courseTitle?: string | null;
    institutionId?: string;
    courseStatus?: CourseStatus;
    /** Course-level theme (courses.theme_settings) — populates `themeSettings`. */
    themeSettings?: Record<string, unknown>;
    modules: ModuleData[];
    lessons: Map<string, LessonData[]>;
    slides: Map<string, Slide[]>;
    blocks: Map<string, BlockData[]>;
  }) => void;
}

/**
 * Vertical compaction — the same algorithm react-grid-layout uses for
 * `compactType="vertical"`. Pulls every block up to the lowest gridY where it
 * doesn't collide with an already-placed block sharing any horizontal span.
 *
 * This is the single source of truth for block positions: it fills gaps left by
 * deletes/resizes, removes overlaps from drags, and guarantees the editor canvas
 * and the student CSS-grid viewer (which reads gridY directly) always agree.
 * gridX/gridW (the column) are preserved; only gridY changes. Unchanged blocks
 * keep their identity so React re-renders stay minimal.
 */
function compactBlocksVertical(blocks: BlockData[]): BlockData[] {
  // Place in visual order: top-to-bottom, then left-to-right.
  const order = blocks
    .map((b) => ({ b, g: getBlockGridLayout((b.data ?? {}) as Record<string, unknown>) }))
    .sort((a, z) => a.g.gridY - z.g.gridY || a.g.gridX - z.g.gridX);

  const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
  const newYById = new Map<string, number>();

  for (const { b, g } of order) {
    // Start at the top and push down past every placed block that overlaps this
    // block's horizontal span. Loop until no collision remains (handles cascades).
    let y = 0;
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of placed) {
        const xOverlap = g.gridX < p.x + p.w && g.gridX + g.gridW > p.x;
        const yOverlap = y < p.y + p.h && y + g.gridH > p.y;
        if (xOverlap && yOverlap) {
          y = p.y + p.h;
          changed = true;
        }
      }
    }
    placed.push({ x: g.gridX, y, w: g.gridW, h: g.gridH });
    newYById.set(b.id, y);
  }

  let mutated = false;
  const result = blocks.map((b) => {
    const g = getBlockGridLayout((b.data ?? {}) as Record<string, unknown>);
    const newY = newYById.get(b.id);
    if (newY == null || newY === g.gridY) return b;
    mutated = true;
    return { ...b, data: { ...((b.data ?? {}) as Record<string, unknown>), gridY: newY } };
  });

  return mutated ? result : blocks;
}

function snapshot(state: EditorState): Snapshot {
  return {
    modules: [...state.modules],
    lessons: new Map(Array.from(state.lessons.entries()).map(([k, v]) => [k, [...v]])),
    slides: new Map(Array.from(state.slides.entries()).map(([k, v]) => [k, [...v]])),
    blocks: new Map(state.blocks),
    themeSettings: { ...state.themeSettings },
  };
}

function push(
  state: EditorState,
  snap: Snapshot,
  type: string,
  entityId: string,
): Partial<EditorState> {
  return {
    undoStack: [
      ...state.undoStack,
      {
        type,
        entityType: 'editor',
        entityId,
        previousState: snap,
        newState: null,
        timestamp: Date.now(),
      },
    ],
    redoStack: [],
    isDirty: true,
  };
}

function restoreSnapshot(snap: Snapshot): Partial<EditorState> {
  return {
    modules: snap.modules,
    lessons: snap.lessons,
    slides: snap.slides,
    blocks: snap.blocks,
    themeSettings: snap.themeSettings,
    isDirty: true,
    // Tag this state change as an undo/redo restore so the editor's edit→draft
    // subscription ignores it. Undo restores the slide's exact prior status
    // (including `published`); without this, the subscription would see the
    // reverted content as a fresh edit and re-flip the slide to draft, leaving
    // published content unpublished even though it matches what students see.
    // undo()/redo() clear this flag on the very next set().
    isRestoring: true,
  };
}

export function createEditorStore() {
  return createStore<EditorState>((set, get) => ({
    courseId: null,
    courseTitle: null,
    institutionId: null,
    courseStatus: 'draft',
    isPublishing: false,
    publishError: null,
    modules: [],
    lessons: new Map(),
    slides: new Map(),
    blocks: new Map(),
    themeSettings: {},
    institutionTheme: {},
    selectedEntity: null,
    previewSlideIndex: 0,
    isDirty: false,
    isSaving: false,
    isRestoring: false,
    lastSaveError: null,
    selectedBlockIds: new Set<string>(),
    undoStack: [],
    redoStack: [],
    devicePreview: 'desktop',

    setCourseStatus: (status) => set({ courseStatus: status }),

    publishCourse: async () => {
      const { courseId, institutionId } = get();
      if (!courseId) return;
      if (!institutionId) {
        set({ publishError: 'Institution not loaded. Please reload the editor.' });
        return;
      }
      set({ isPublishing: true, publishError: null });
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        await dbPublishCourse(supabase, courseId, institutionId);
        // dbPublishCourse flipped every live slide to 'published' in the DB —
        // mirror that locally so Draft badges clear without a reload. Not a
        // dirty change (the DB already holds exactly this state) and no undo entry.
        set((s) => {
          const nextSlides = new Map<string, Slide[]>();
          for (const [lessonId, list] of s.slides) {
            nextSlides.set(
              lessonId,
              list.map((sl) => (sl.status === 'published' ? sl : { ...sl, status: 'published' as const })),
            );
          }
          return { slides: nextSlides, courseStatus: 'published', isPublishing: false };
        });
      } catch (error) {
        set({ isPublishing: false, publishError: error instanceof Error ? error.message : 'Failed to publish' });
      }
    },

    selectEntity: (entity) => set({ selectedEntity: entity }),

    updateThemeSettings: (changes) => {
      const snap = snapshot(get());
      set((s) => ({
        themeSettings: { ...s.themeSettings, ...changes },
        ...push(s, snap, 'updateThemeSettings', 'course'),
      }));
    },

    setInstitutionTheme: (theme) => set({ institutionTheme: theme }),

    addModule: (module) => {
      const snap = snapshot(get());
      set((s) => ({
        modules: [...s.modules, module],
        ...push(s, snap, 'addModule', module.id),
      }));
    },

    updateModule: (moduleId, changes) => {
      const snap = snapshot(get());
      set((s) => ({
        modules: s.modules.map((m) => m.id === moduleId ? { ...m, ...changes } : m),
        ...push(s, snap, 'updateModule', moduleId),
      }));
    },

    removeModule: (moduleId) => {
      const snap = snapshot(get());
      set((s) => ({
        modules: s.modules.filter((m) => m.id !== moduleId),
        ...push(s, snap, 'removeModule', moduleId),
      }));
    },

    addLesson: (moduleId, lesson) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.lessons.get(moduleId) ?? [];
        const next = new Map(s.lessons);
        next.set(moduleId, [...existing, lesson]);
        return { lessons: next, ...push(s, snap, 'addLesson', lesson.id) };
      });
    },

    updateLesson: (moduleId, lessonId, changes) => {
      const snap = snapshot(get());
      set((s) => {
        const next = new Map(s.lessons);
        const lessons = next.get(moduleId) ?? [];
        next.set(
          moduleId,
          lessons.map((l) => {
            if (l.id !== lessonId) return l;
            const merged = { ...l, ...changes };
            if (changes.title_slide_settings !== undefined) {
              merged.title_slide_settings = {
                ...(l.title_slide_settings ?? {}),
                ...(changes.title_slide_settings ?? {}),
              };
            }
            return merged;
          }),
        );
        return { lessons: next, ...push(s, snap, 'updateLesson', lessonId) };
      });
    },

    removeLesson: (moduleId, lessonId) => {
      const snap = snapshot(get());
      set((s) => {
        const next = new Map(s.lessons);
        const lessons = next.get(moduleId) ?? [];
        next.set(moduleId, lessons.filter((l) => l.id !== lessonId));
        return { lessons: next, ...push(s, snap, 'removeLesson', lessonId) };
      });
    },

    addSlide: (lessonId, slide) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.slides.get(lessonId) ?? [];
        const next = new Map(s.slides);
        next.set(lessonId, [...existing, slide]);
        return { slides: next, ...push(s, snap, 'addSlide', slide.id) };
      });
    },

    removeSlide: (lessonId, slideId) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.slides.get(lessonId) ?? [];
        const next = new Map(s.slides);
        next.set(lessonId, existing.filter((sl) => sl.id !== slideId));
        return { slides: next, ...push(s, snap, 'removeSlide', slideId) };
      });
    },

    restoreSlide: (lessonId, slide, index, blocks) => {
      set((s) => {
        const list = [...(s.slides.get(lessonId) ?? [])];
        const at = Math.min(Math.max(0, index), list.length);
        list.splice(at, 0, slide);
        const nextSlides = new Map(s.slides);
        nextSlides.set(lessonId, list);
        const nextBlocks = new Map(s.blocks);
        nextBlocks.set(slide.id, blocks);
        return { slides: nextSlides, blocks: nextBlocks };
      });
    },

    reorderSlides: (lessonId, slideIds) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.slides.get(lessonId) ?? [];
        const reordered = slideIds
          .map((id) => existing.find((sl) => sl.id === id))
          .filter(Boolean) as Slide[];
        const next = new Map(s.slides);
        next.set(
          lessonId,
          reordered.map((sl, i) => ({ ...sl, order_index: i })),
        );
        return { slides: next, ...push(s, snap, 'reorderSlides', lessonId) };
      });
    },

    updateSlide: (lessonId, slideId, changes) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.slides.get(lessonId) ?? [];
        const next = new Map(s.slides);
        next.set(
          lessonId,
          existing.map((sl) => (sl.id === slideId ? { ...sl, ...changes } : sl)),
        );
        return { slides: next, ...push(s, snap, 'updateSlide', slideId) };
      });
    },

    moveSlideToLesson: (slideId, fromLessonId, toLessonId) => {
      const state = get();
      const snap = snapshot(state);

      const fromSlides = [...(state.slides.get(fromLessonId) ?? [])];
      const toSlides = [...(state.slides.get(toLessonId) ?? [])];

      const slideIndex = fromSlides.findIndex(s => s.id === slideId);
      if (slideIndex === -1) return;

      const [slide] = fromSlides.splice(slideIndex, 1);
      const movedSlide = { ...slide, lesson_id: toLessonId, order_index: toSlides.length };
      toSlides.push(movedSlide);

      // Reindex source
      fromSlides.forEach((s, i) => { s.order_index = i; });

      const newSlides = new Map(state.slides);
      newSlides.set(fromLessonId, fromSlides);
      newSlides.set(toLessonId, toSlides);

      set({ slides: newSlides, ...push(state, snap, 'moveSlide', slideId) });
    },

    addBlock: (slideId, block) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        // Shift existing blocks at or after the insert position, then insert sorted
        const updated = existing.map((b) =>
          b.order_index >= block.order_index
            ? { ...b, order_index: b.order_index + 1 }
            : b
        );
        const merged = [...updated, block].sort((a, b) => a.order_index - b.order_index);
        // Compact so the new block settles into the stack with no gap/overlap,
        // keeping the student CSS-grid view (which reads gridY) consistent.
        next.set(slideId, compactBlocksVertical(merged));
        return { blocks: next, ...push(s, snap, 'addBlock', block.id) };
      });
    },

    updateBlock: (slideId, blockId, changes) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        next.set(
          slideId,
          existing.map((b) => (b.id === blockId ? { ...b, ...changes } : b)),
        );
        return { blocks: next, ...push(s, snap, 'updateBlock', blockId) };
      });
    },

    fitBlockHeight: (slideId, blockId, gridH) => {
      set((s) => {
        const blocks = s.blocks.get(slideId) ?? [];
        const target = blocks.find((b) => b.id === blockId);
        if (!target) return {} as Partial<EditorState>;
        const td = (target.data ?? {}) as Record<string, unknown>;
        const old = getBlockGridLayout(td);
        if (gridH === old.gridH) return {} as Partial<EditorState>;
        // Apply the new height, then vertically compact so blocks below settle
        // (grow → push down, shrink → pull up) with no gaps or overlaps. Replaces
        // the old manual single-direction shift, which couldn't handle multi-column
        // layouts or shrink-with-gap-fill and fought the canvas compaction.
        const resized = blocks.map((b) => (b.id === blockId ? { ...b, data: { ...td, gridH } } : b));
        const compacted = compactBlocksVertical(resized);
        const next = new Map(s.blocks);
        next.set(slideId, compacted);
        // mark dirty so it persists, but don't pollute the undo stack with auto-fits
        return { blocks: next, isDirty: true } as Partial<EditorState>;
      });
    },

    moveBlockVertical: (slideId, blockId, dir) => {
      const snap = snapshot(get());
      set((s) => {
        const blocks = s.blocks.get(slideId) ?? [];
        if (blocks.length < 2) return {} as Partial<EditorState>;
        // Visual order: top-to-bottom, then left-to-right.
        const order = blocks
          .map((b) => ({ b, g: getBlockGridLayout((b.data ?? {}) as Record<string, unknown>) }))
          .sort((a, z) => a.g.gridY - z.g.gridY || a.g.gridX - z.g.gridX);
        const pos = order.findIndex((x) => x.b.id === blockId);
        if (pos === -1) return {} as Partial<EditorState>;
        const targetPos = pos + dir;
        if (targetPos < 0 || targetPos >= order.length) return {} as Partial<EditorState>;

        // Swap the two neighbours' gridY. Compaction only uses gridY for ordering
        // (it re-stacks each block from the top), so swapping the order keys and
        // compacting guarantees a clean reorder with no gaps — including reaching
        // the very bottom, which the old manual swap couldn't do reliably.
        const a = order[pos];
        const b = order[targetPos];
        const ay = a.g.gridY;
        const by = b.g.gridY;
        const swapped = blocks.map((blk) => {
          const bd = (blk.data ?? {}) as Record<string, unknown>;
          if (blk.id === a.b.id) return { ...blk, data: { ...bd, gridY: by } };
          if (blk.id === b.b.id) return { ...blk, data: { ...bd, gridY: ay } };
          return blk;
        });
        const compacted = compactBlocksVertical(swapped);
        // Keep order_index aligned with the new visual order so the structure tree matches.
        const reindexed = compacted
          .map((blk) => ({ blk, g: getBlockGridLayout((blk.data ?? {}) as Record<string, unknown>) }))
          .sort((x, z) => x.g.gridY - z.g.gridY || x.g.gridX - z.g.gridX)
          .map((x, i) => (x.blk.order_index === i ? x.blk : { ...x.blk, order_index: i }));
        const next = new Map(s.blocks);
        next.set(slideId, reindexed);
        return { blocks: next, ...push(s, snap, 'moveBlockVertical', blockId) };
      });
    },

    setBlockWidth: (slideId, blockId, gridW, align) => {
      const snap = snapshot(get());
      set((s) => {
        const blocks = s.blocks.get(slideId) ?? [];
        const target = blocks.find((b) => b.id === blockId);
        if (!target) return {} as Partial<EditorState>;
        const td = (target.data ?? {}) as Record<string, unknown>;
        const w = Math.max(1, Math.min(GRID_COLS, Math.round(gridW)));
        // Resolve horizontal position. Default keeps the current x but clamps it so
        // the block never overflows the grid; align lets the UI snap left/center/right.
        const curX = typeof td.gridX === 'number' ? (td.gridX as number) : 0;
        let x: number;
        if (align === 'center') x = Math.floor((GRID_COLS - w) / 2);
        else if (align === 'right') x = GRID_COLS - w;
        else if (align === 'left') x = 0;
        else x = Math.min(Math.max(0, curX), GRID_COLS - w);
        const resized = blocks.map((b) =>
          b.id === blockId ? { ...b, data: { ...td, gridW: w, gridX: x } } : b,
        );
        // Compact so a widened block that now overlaps a side-by-side neighbour
        // pushes it cleanly below (editor canvas + student CSS-grid stay in sync).
        const compacted = compactBlocksVertical(resized);
        const next = new Map(s.blocks);
        next.set(slideId, compacted);
        return { blocks: next, ...push(s, snap, 'setBlockWidth', blockId) };
      });
    },

    removeBlock: (slideId, blockId) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        // Remove, then compact so blocks below pull up to fill the gap.
        const compacted = compactBlocksVertical(existing.filter((b) => b.id !== blockId));
        const next = new Map(s.blocks);
        next.set(slideId, compacted);
        return { blocks: next, ...push(s, snap, 'removeBlock', blockId) };
      });
    },

    reorderBlocks: (slideId, blockIds) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const reordered = blockIds
          .map((id) => existing.find((b) => b.id === id))
          .filter(Boolean) as BlockData[];
        const next = new Map(s.blocks);
        next.set(
          slideId,
          reordered.map((b, i) => ({ ...b, order_index: i })),
        );
        return { blocks: next, ...push(s, snap, 'reorderBlocks', slideId) };
      });
    },

    duplicateBlock: (slideId, blockId, newBlockId, newData) => {
      const state = get();
      const snap = snapshot(state);

      const blocks = [...(state.blocks.get(slideId) ?? [])];
      const sourceIndex = blocks.findIndex(b => b.id === blockId);
      if (sourceIndex === -1) return;

      const source = blocks[sourceIndex];
      const newBlock = {
        ...source,
        id: newBlockId,
        data: newData,
        order_index: source.order_index + 1,
      };

      // Shift subsequent blocks
      for (let i = sourceIndex + 1; i < blocks.length; i++) {
        blocks[i] = { ...blocks[i], order_index: blocks[i].order_index + 1 };
      }

      blocks.splice(sourceIndex + 1, 0, newBlock);

      const newBlocks = new Map(state.blocks);
      newBlocks.set(slideId, blocks);

      set({
        blocks: newBlocks,
        isDirty: true,
        selectedEntity: { type: 'block', id: newBlockId },
        ...push(state, snap, 'duplicateBlock', blockId),
      });
    },

    switchBlockType: (slideId, blockId, newType, newData) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        next.set(
          slideId,
          existing.map((b) => b.id === blockId ? { ...b, block_type: newType, data: newData } : b),
        );
        return { blocks: next, ...push(s, snap, 'switchBlockType', blockId) };
      });
    },

    setPreviewSlideIndex: (index) => set({ previewSlideIndex: index }),

    setDevicePreview: (d) => set({ devicePreview: d }),

    markSlidesDraft: (slideIds) => {
      if (slideIds.length === 0) return;
      const idSet = new Set(slideIds);
      set((s) => {
        let changed = false;
        const next = new Map(s.slides);
        for (const [lessonId, list] of s.slides) {
          let listChanged = false;
          const updated = list.map((sl) => {
            if (idSet.has(sl.id) && sl.status === 'published') {
              listChanged = true;
              changed = true;
              return { ...sl, status: 'draft' as const };
            }
            return sl;
          });
          if (listChanged) next.set(lessonId, updated);
        }
        return changed ? { slides: next } : ({} as Partial<EditorState>);
      });
    },

    markSaved: () => set({ isDirty: false, isSaving: false, lastSaveError: null }),

    setSaveError: (error) => set({ lastSaveError: error }),

    toggleBlockSelection: (blockId) => {
      set((s) => {
        const next = new Set(s.selectedBlockIds);
        if (next.has(blockId)) { next.delete(blockId); } else { next.add(blockId); }
        return { selectedBlockIds: next };
      });
    },

    clearBlockSelection: () => set({ selectedBlockIds: new Set() }),

    deleteSelectedBlocks: (slideId) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        next.set(slideId, existing.filter(b => !s.selectedBlockIds.has(b.id)));
        return { blocks: next, selectedBlockIds: new Set(), ...push(s, snap, 'deleteSelectedBlocks', slideId) };
      });
    },

    duplicateSelectedBlocks: (slideId) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = [...(s.blocks.get(slideId) ?? [])];
        const selected = existing.filter(b => s.selectedBlockIds.has(b.id));
        const clones = selected.map((b, i) => ({
          ...b,
          id: crypto.randomUUID(),
          order_index: existing.length + i,
          data: JSON.parse(JSON.stringify(b.data)),
        }));
        const next = new Map(s.blocks);
        next.set(slideId, [...existing, ...clones]);
        const newIds = new Set(clones.map(c => c.id));
        return { blocks: next, selectedBlockIds: newIds, ...push(s, snap, 'duplicateSelectedBlocks', slideId) };
      });
    },

    alignBlocks: (slideId, alignment) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const selected = existing.filter(b => s.selectedBlockIds.has(b.id));
        if (selected.length < 2) return {};

        const getGrid = (b: typeof selected[0]) => {
          const d = (b.data ?? {}) as Record<string, unknown>;
          return {
            gridX: (d.gridX as number) ?? 0,
            gridY: (d.gridY as number) ?? 0,
            gridW: (d.gridW as number) ?? 12,
            gridH: (d.gridH as number) ?? 2,
          };
        };

        const grids = selected.map(b => ({ id: b.id, ...getGrid(b) }));
        const updates: Record<string, { gridX?: number; gridY?: number }> = {};

        switch (alignment) {
          case 'left': {
            const minX = Math.min(...grids.map(g => g.gridX));
            grids.forEach(g => { updates[g.id] = { gridX: minX }; });
            break;
          }
          case 'right': {
            const maxRight = Math.max(...grids.map(g => g.gridX + g.gridW));
            grids.forEach(g => { updates[g.id] = { gridX: maxRight - g.gridW }; });
            break;
          }
          case 'top': {
            const minY = Math.min(...grids.map(g => g.gridY));
            grids.forEach(g => { updates[g.id] = { gridY: minY }; });
            break;
          }
          case 'bottom': {
            const maxBottom = Math.max(...grids.map(g => g.gridY + g.gridH));
            grids.forEach(g => { updates[g.id] = { gridY: maxBottom - g.gridH }; });
            break;
          }
          case 'distribute-h': {
            const sorted = [...grids].sort((a, b) => a.gridX - b.gridX);
            const first = sorted[0].gridX;
            const last = sorted[sorted.length - 1].gridX;
            const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
            sorted.forEach((g, i) => { updates[g.id] = { gridX: Math.round(first + step * i) }; });
            break;
          }
          case 'distribute-v': {
            const sorted = [...grids].sort((a, b) => a.gridY - b.gridY);
            const first = sorted[0].gridY;
            const last = sorted[sorted.length - 1].gridY;
            const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
            sorted.forEach((g, i) => { updates[g.id] = { gridY: Math.round(first + step * i) }; });
            break;
          }
        }

        const next = new Map(s.blocks);
        next.set(slideId, existing.map(b => {
          const u = updates[b.id];
          if (!u) return b;
          const d = { ...(b.data as Record<string, unknown>) };
          if (u.gridX !== undefined) d.gridX = u.gridX;
          if (u.gridY !== undefined) d.gridY = u.gridY;
          return { ...b, data: d };
        }));
        return { blocks: next, ...push(s, snap, 'alignBlocks', slideId) };
      });
    },

    undo: () => {
      const { undoStack, redoStack } = get();
      if (undoStack.length === 0) return;
      const last = undoStack[undoStack.length - 1];
      const currentSnap = snapshot(get());
      const prevSnap = last.previousState as Snapshot;
      set({
        ...restoreSnapshot(prevSnap),
        undoStack: undoStack.slice(0, -1),
        redoStack: [
          ...redoStack,
          { ...last, previousState: currentSnap, timestamp: Date.now() },
        ],
      });
      // Clear the restore flag. This set touches neither `blocks` nor `slides`,
      // so the edit→draft subscription short-circuits and cannot re-flip.
      set({ isRestoring: false });
    },

    redo: () => {
      const { undoStack, redoStack } = get();
      if (redoStack.length === 0) return;
      const last = redoStack[redoStack.length - 1];
      const currentSnap = snapshot(get());
      const redoSnap = last.previousState as Snapshot;
      set({
        ...restoreSnapshot(redoSnap),
        redoStack: redoStack.slice(0, -1),
        undoStack: [
          ...undoStack,
          { ...last, previousState: currentSnap, timestamp: Date.now() },
        ],
      });
      // Clear the restore flag (see undo()).
      set({ isRestoring: false });
    },

    loadCourse: (data) =>
      set({
        courseId: data.courseId,
        courseTitle: data.courseTitle ?? null,
        institutionId: data.institutionId ?? null,
        courseStatus: data.courseStatus ?? 'draft',
        modules: data.modules,
        lessons: data.lessons,
        slides: data.slides,
        blocks: data.blocks,
        themeSettings: (data.themeSettings ?? {}) as CourseThemeSettings,
        isDirty: false,
        isSaving: false,
        isPublishing: false,
        publishError: null,
        undoStack: [],
        redoStack: [],
        selectedEntity: null,
        previewSlideIndex: 0,
      }),
  }));
}

export type EditorStore = ReturnType<typeof createEditorStore>;
