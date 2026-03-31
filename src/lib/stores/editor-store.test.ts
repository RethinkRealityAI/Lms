import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEditorStore, type EditorStore } from './editor-store';

import { publishCourse as mockDbPublishCourse } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  publishCourse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { institution_id: 'inst-1' }, error: null }),
        }),
      }),
    }),
  })),
}));

describe('EditorStore', () => {
  let store: EditorStore;

  beforeEach(() => {
    store = createEditorStore();
  });

  describe('initial state', () => {
    it('starts with no selection', () => {
      expect(store.getState().selectedEntity).toBeNull();
    });

    it('starts with empty modules', () => {
      expect(store.getState().modules).toEqual([]);
    });

    it('starts with empty undo/redo stacks', () => {
      expect(store.getState().undoStack).toEqual([]);
      expect(store.getState().redoStack).toEqual([]);
    });

    it('starts not dirty', () => {
      expect(store.getState().isDirty).toBe(false);
    });
  });

  describe('selectEntity', () => {
    it('selects an entity', () => {
      store.getState().selectEntity({ type: 'course', id: 'c1' });
      expect(store.getState().selectedEntity).toEqual({ type: 'course', id: 'c1' });
    });

    it('clears selection with null', () => {
      store.getState().selectEntity({ type: 'course', id: 'c1' });
      store.getState().selectEntity(null);
      expect(store.getState().selectedEntity).toBeNull();
    });
  });

  describe('addModule', () => {
    it('adds a module', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().modules).toHaveLength(1);
      expect(store.getState().modules[0].title).toBe('Module 1');
    });

    it('marks store as dirty', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().isDirty).toBe(true);
    });

    it('pushes to undo stack', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().undoStack).toHaveLength(1);
    });
  });

  describe('undo/redo', () => {
    it('undo reverts addModule', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      expect(store.getState().modules).toHaveLength(1);
      store.getState().undo();
      expect(store.getState().modules).toHaveLength(0);
    });

    it('redo re-applies undone change', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().undo();
      store.getState().redo();
      expect(store.getState().modules).toHaveLength(1);
    });

    it('undo does nothing when stack is empty', () => {
      expect(() => store.getState().undo()).not.toThrow();
    });

    it('redo does nothing when stack is empty', () => {
      expect(() => store.getState().redo()).not.toThrow();
    });

    it('new mutation clears redo stack', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().undo();
      expect(store.getState().redoStack).toHaveLength(1);
      store.getState().addModule({ id: 'm2', title: 'Module 2', course_id: 'c1', order_index: 1 });
      expect(store.getState().redoStack).toHaveLength(0);
    });
  });

  describe('slides', () => {
    const makeSlide = (id: string, order: number) => ({
      id,
      lesson_id: 'l1',
      slide_type: 'content' as const,
      title: `Slide ${id}`,
      order_index: order,
      status: 'draft' as const,
      settings: {},
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it('adds a slide to a lesson', () => {
      store.getState().addSlide('l1', makeSlide('s1', 0));
      expect(store.getState().slides.get('l1')).toHaveLength(1);
    });

    it('removes a slide from a lesson', () => {
      store.getState().addSlide('l1', makeSlide('s1', 0));
      store.getState().removeSlide('l1', 's1');
      expect(store.getState().slides.get('l1')).toHaveLength(0);
    });

    it('reorders slides', () => {
      store.getState().addSlide('l1', makeSlide('s1', 0));
      store.getState().addSlide('l1', makeSlide('s2', 1));
      store.getState().reorderSlides('l1', ['s2', 's1']);
      const slides = store.getState().slides.get('l1')!;
      expect(slides[0].id).toBe('s2');
      expect(slides[1].id).toBe('s1');
    });

    it('updates slide properties', () => {
      store.getState().addSlide('l1', makeSlide('s1', 0));
      store.getState().updateSlide('l1', 's1', { title: 'Updated Title' });
      const slide = store.getState().slides.get('l1')![0];
      expect(slide.title).toBe('Updated Title');
    });
  });

  describe('updateBlock', () => {
    it('updates a block in a slide', () => {
      // Load blocks via loadCourse so we can verify the update
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map([
          ['slide1', [{ id: 'block1', slide_id: 'slide1', block_type: 'rich_text', data: { html: '<p>Original</p>' }, order_index: 0, is_visible: true }]],
        ]),
      });
      store.getState().updateBlock('slide1', 'block1', { data: { html: '<p>Updated</p>' } });
      const block = store.getState().blocks.get('slide1')![0];
      expect(block.data).toEqual({ html: '<p>Updated</p>' });
    });

    it('marks store as dirty', () => {
      store.getState().updateBlock('slide1', 'block1', {});
      expect(store.getState().isDirty).toBe(true);
    });

    it('does not throw when block is not found', () => {
      expect(() => store.getState().updateBlock('slide1', 'nonexistent', {})).not.toThrow();
    });
  });

  describe('loadCourse', () => {
    it('loads initial data and resets dirty/history', () => {
      store.getState().addModule({ id: 'm0', title: 'Old', course_id: 'c0', order_index: 0 });
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [{ id: 'm1', title: 'New Module', course_id: 'c1', order_index: 0 }],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });
      expect(store.getState().modules).toHaveLength(1);
      expect(store.getState().modules[0].title).toBe('New Module');
      expect(store.getState().isDirty).toBe(false);
      expect(store.getState().undoStack).toHaveLength(0);
    });

    it('resets courseTheme on load', () => {
      store.getState().updateCourseTheme({ primaryColor: '#FF0000' });
      expect(store.getState().courseTheme).toMatchObject({ primaryColor: '#FF0000' });
      store.getState().loadCourse({
        courseId: 'c2',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });
      expect(store.getState().courseTheme).toEqual({});
    });
  });

  describe('courseStatus and publish workflow', () => {
    it('starts with courseStatus draft', () => {
      expect(store.getState().courseStatus).toBe('draft');
    });

    it('setCourseStatus updates courseStatus', () => {
      store.getState().setCourseStatus('published');
      expect(store.getState().courseStatus).toBe('published');
    });

    it('loadCourse sets courseStatus from loaded data', () => {
      store.getState().loadCourse({
        courseId: 'c1',
        courseStatus: 'published',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });
      expect(store.getState().courseStatus).toBe('published');
    });

    it('loadCourse defaults courseStatus to draft when not provided', () => {
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });
      expect(store.getState().courseStatus).toBe('draft');
    });

    it('starts with isPublishing false', () => {
      expect(store.getState().isPublishing).toBe(false);
    });

    it('publishCourse sets isPublishing true then false and updates courseStatus', async () => {
      // Mock the db module
      const { publishCourse: mockPublishCourse } = await import('@/lib/db');
      vi.mocked(mockPublishCourse).mockResolvedValue(undefined);

      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });

      await store.getState().publishCourse();

      expect(store.getState().isPublishing).toBe(false);
      expect(store.getState().courseStatus).toBe('published');
    });

    it('publishCourse sets isPublishing true while in-flight before resolving', async () => {
      const { publishCourse: mockPublishCourse } = await import('@/lib/db');
      vi.mocked(mockPublishCourse).mockResolvedValue(undefined);

      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });

      // publishCourse calls set({ isPublishing: true }) synchronously before any awaits,
      // so immediately after starting the action (not awaiting) it should be true.
      const publishPromise = store.getState().publishCourse();
      expect(store.getState().isPublishing).toBe(true);

      // Await completion and confirm settled state
      await publishPromise;

      expect(store.getState().isPublishing).toBe(false);
      expect(store.getState().courseStatus).toBe('published');
    });

    it('publishCourse sets publishError and resets isPublishing when db call rejects', async () => {
      vi.mocked(mockDbPublishCourse).mockRejectedValueOnce(new Error('Network failure'));

      store.getState().loadCourse({
        courseId: 'c1',
        institutionId: 'inst-1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });

      await store.getState().publishCourse();

      expect(store.getState().isPublishing).toBe(false);
      expect(store.getState().publishError).toBe('Network failure');
    });

    it('publishCourse clears publishError at the start of a new attempt', async () => {
      vi.mocked(mockDbPublishCourse).mockRejectedValueOnce(new Error('First failure'));

      store.getState().loadCourse({
        courseId: 'c1',
        institutionId: 'inst-1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });

      await store.getState().publishCourse();
      expect(store.getState().publishError).toBe('First failure');

      // Second attempt — succeeds; error should be cleared
      vi.mocked(mockDbPublishCourse).mockResolvedValueOnce(undefined);
      await store.getState().publishCourse();
      expect(store.getState().publishError).toBeNull();
    });

    it('starts with publishError null', () => {
      expect(store.getState().publishError).toBeNull();
    });
  });

  describe('updateCourseTheme', () => {
    it('merges theme changes into courseTheme', () => {
      store.getState().updateCourseTheme({ primaryColor: '#DC2626' });
      expect(store.getState().courseTheme).toMatchObject({ primaryColor: '#DC2626' });
    });

    it('merges multiple updates additively', () => {
      store.getState().updateCourseTheme({ primaryColor: '#DC2626' });
      store.getState().updateCourseTheme({ accentColor: '#0099CA' });
      expect(store.getState().courseTheme).toMatchObject({
        primaryColor: '#DC2626',
        accentColor: '#0099CA',
      });
    });

    it('marks store as dirty', () => {
      store.getState().updateCourseTheme({ primaryColor: '#DC2626' });
      expect(store.getState().isDirty).toBe(true);
    });

    it('pushes to undo stack', () => {
      store.getState().updateCourseTheme({ primaryColor: '#DC2626' });
      expect(store.getState().undoStack).toHaveLength(1);
    });

    it('undo reverts theme change', () => {
      store.getState().updateCourseTheme({ primaryColor: '#DC2626' });
      store.getState().undo();
      expect(store.getState().courseTheme).toEqual({});
    });
  });
});
