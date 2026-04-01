import { createStore } from 'zustand/vanilla';
import type { Slide, EntitySelection, EditorAction, InstitutionTheme, CourseStatus } from '@/types';
import { publishCourse as dbPublishCourse } from '@/lib/db';

export interface ModuleData {
  id: string;
  title: string;
  course_id: string;
  order_index: number;
  description?: string;
}

export interface LessonData {
  id: string;
  title: string;
  module_id?: string;
  course_id: string;
  order_index: number;
  description?: string;
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
  courseTheme: Record<string, unknown>;
}

export interface EditorState {
  courseId: string | null;
  institutionId: string | null;
  courseStatus: CourseStatus;
  isPublishing: boolean;
  publishError: string | null;
  modules: ModuleData[];
  lessons: Map<string, LessonData[]>;
  slides: Map<string, Slide[]>;
  blocks: Map<string, BlockData[]>;
  courseTheme: Record<string, unknown>;
  selectedEntity: EntitySelection | null;
  previewSlideIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  undoStack: EditorAction[];
  redoStack: EditorAction[];

  setCourseStatus: (status: CourseStatus) => void;
  publishCourse: () => Promise<void>;
  selectEntity: (entity: EntitySelection | null) => void;
  updateCourseTheme: (changes: Partial<InstitutionTheme>) => void;
  addModule: (module: ModuleData) => void;
  updateModule: (moduleId: string, changes: Partial<Pick<ModuleData, 'title' | 'description'>>) => void;
  removeModule: (moduleId: string) => void;
  addLesson: (moduleId: string, lesson: LessonData) => void;
  updateLesson: (moduleId: string, lessonId: string, changes: Partial<Pick<LessonData, 'title' | 'description'>>) => void;
  removeLesson: (moduleId: string, lessonId: string) => void;
  addSlide: (lessonId: string, slide: Slide) => void;
  removeSlide: (lessonId: string, slideId: string) => void;
  reorderSlides: (lessonId: string, slideIds: string[]) => void;
  updateSlide: (lessonId: string, slideId: string, changes: Partial<Slide>) => void;
  addBlock: (slideId: string, block: BlockData) => void;
  updateBlock: (slideId: string, blockId: string, changes: Partial<BlockData>) => void;
  removeBlock: (slideId: string, blockId: string) => void;
  setPreviewSlideIndex: (index: number) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
  loadCourse: (data: {
    courseId: string;
    institutionId?: string;
    courseStatus?: CourseStatus;
    modules: ModuleData[];
    lessons: Map<string, LessonData[]>;
    slides: Map<string, Slide[]>;
    blocks: Map<string, BlockData[]>;
  }) => void;
}

function snapshot(state: EditorState): Snapshot {
  return {
    modules: [...state.modules],
    lessons: new Map(Array.from(state.lessons.entries()).map(([k, v]) => [k, [...v]])),
    slides: new Map(Array.from(state.slides.entries()).map(([k, v]) => [k, [...v]])),
    blocks: new Map(state.blocks),
    courseTheme: { ...state.courseTheme },
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
    courseTheme: snap.courseTheme,
    isDirty: true,
  };
}

export function createEditorStore() {
  return createStore<EditorState>((set, get) => ({
    courseId: null,
    institutionId: null,
    courseStatus: 'draft',
    isPublishing: false,
    publishError: null,
    modules: [],
    lessons: new Map(),
    slides: new Map(),
    blocks: new Map(),
    courseTheme: {},
    selectedEntity: null,
    previewSlideIndex: 0,
    isDirty: false,
    isSaving: false,
    undoStack: [],
    redoStack: [],

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
        set({ courseStatus: 'published', isPublishing: false });
      } catch (error) {
        set({ isPublishing: false, publishError: error instanceof Error ? error.message : 'Failed to publish' });
      }
    },

    selectEntity: (entity) => set({ selectedEntity: entity }),

    updateCourseTheme: (changes) => {
      const snap = snapshot(get());
      set((s) => ({
        courseTheme: { ...s.courseTheme, ...changes },
        ...push(s, snap, 'updateCourseTheme', 'course'),
      }));
    },

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
        next.set(moduleId, lessons.map((l) => l.id === lessonId ? { ...l, ...changes } : l));
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

    addBlock: (slideId, block) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        next.set(slideId, [...existing, block]);
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

    removeBlock: (slideId, blockId) => {
      const snap = snapshot(get());
      set((s) => {
        const existing = s.blocks.get(slideId) ?? [];
        const next = new Map(s.blocks);
        next.set(slideId, existing.filter((b) => b.id !== blockId));
        return { blocks: next, ...push(s, snap, 'removeBlock', blockId) };
      });
    },

    setPreviewSlideIndex: (index) => set({ previewSlideIndex: index }),

    markSaved: () => set({ isDirty: false, isSaving: false }),

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
    },

    loadCourse: (data) =>
      set({
        courseId: data.courseId,
        institutionId: data.institutionId ?? null,
        courseStatus: data.courseStatus ?? 'draft',
        modules: data.modules,
        lessons: data.lessons,
        slides: data.slides,
        blocks: data.blocks,
        courseTheme: {},
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
