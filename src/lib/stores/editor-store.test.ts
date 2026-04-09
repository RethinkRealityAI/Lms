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
      canvas_data: null,
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
        institutionId: 'inst-1',
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
        institutionId: 'inst-1',
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

    it('publishCourse sets publishError when institutionId is null', async () => {
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map(),
      });

      await store.getState().publishCourse();

      expect(store.getState().isPublishing).toBe(false);
      expect(store.getState().publishError).toBe('Institution not loaded. Please reload the editor.');
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

  describe('removeLesson', () => {
    it('removes the lesson from the correct module', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m1', { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m1', { id: 'l2', title: 'Lesson 2', module_id: 'm1', course_id: 'c1', order_index: 1 });

      store.getState().removeLesson('m1', 'l1');

      const lessons = store.getState().lessons.get('m1')!;
      expect(lessons).toHaveLength(1);
      expect(lessons[0].id).toBe('l2');
    });

    it('does not affect lessons in other modules', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().addModule({ id: 'm2', title: 'Module 2', course_id: 'c1', order_index: 1 });
      store.getState().addLesson('m1', { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m2', { id: 'l2', title: 'Lesson 2', module_id: 'm2', course_id: 'c1', order_index: 0 });

      store.getState().removeLesson('m1', 'l1');

      expect(store.getState().lessons.get('m2')).toHaveLength(1);
    });

    it('is undoable (undo restores the lesson)', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m1', { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 });

      store.getState().removeLesson('m1', 'l1');
      expect(store.getState().lessons.get('m1')).toHaveLength(0);

      store.getState().undo();
      expect(store.getState().lessons.get('m1')).toHaveLength(1);
      expect(store.getState().lessons.get('m1')![0].id).toBe('l1');
    });

    it('marks store as dirty', () => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m1', { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 });
      store.getState().markSaved();

      store.getState().removeLesson('m1', 'l1');
      expect(store.getState().isDirty).toBe(true);
    });
  });

  describe('updateLesson', () => {
    beforeEach(() => {
      store.getState().addModule({ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 });
      store.getState().addLesson('m1', { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 });
    });

    it('updates lesson title', () => {
      store.getState().updateLesson('m1', 'l1', { title: 'Updated Title' });
      const lesson = store.getState().lessons.get('m1')![0];
      expect(lesson.title).toBe('Updated Title');
    });

    it('updates lesson description', () => {
      store.getState().updateLesson('m1', 'l1', { description: 'New desc' });
      const lesson = store.getState().lessons.get('m1')![0];
      expect(lesson.description).toBe('New desc');
    });

    it('updates title_image_url', () => {
      store.getState().updateLesson('m1', 'l1', { title_image_url: 'https://example.com/bg.jpg' });
      const lesson = store.getState().lessons.get('m1')![0];
      expect(lesson.title_image_url).toBe('https://example.com/bg.jpg');
    });

    it('clears title_image_url when set to null', () => {
      store.getState().updateLesson('m1', 'l1', { title_image_url: 'https://example.com/bg.jpg' });
      store.getState().updateLesson('m1', 'l1', { title_image_url: null });
      const lesson = store.getState().lessons.get('m1')![0];
      expect(lesson.title_image_url).toBeNull();
    });

    it('marks store as dirty', () => {
      store.getState().markSaved();
      store.getState().updateLesson('m1', 'l1', { title: 'Changed' });
      expect(store.getState().isDirty).toBe(true);
    });

    it('is undoable', () => {
      store.getState().updateLesson('m1', 'l1', { title: 'Changed' });
      store.getState().undo();
      const lesson = store.getState().lessons.get('m1')![0];
      expect(lesson.title).toBe('Lesson 1');
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

  describe('moveSlideToLesson', () => {
    beforeEach(() => {
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [{ id: 'm1', title: 'Module 1', course_id: 'c1', order_index: 0 }],
        lessons: new Map([
          ['m1', [
            { id: 'l1', title: 'Lesson 1', module_id: 'm1', course_id: 'c1', order_index: 0 },
            { id: 'l2', title: 'Lesson 2', module_id: 'm1', course_id: 'c1', order_index: 1 },
          ]],
        ]),
        slides: new Map([
          ['l1', [
            { id: 's1', title: 'Slide 1', lesson_id: 'l1', order_index: 0, slide_type: 'content' } as any,
            { id: 's2', title: 'Slide 2', lesson_id: 'l1', order_index: 1, slide_type: 'content' } as any,
          ]],
          ['l2', [
            { id: 's3', title: 'Slide 3', lesson_id: 'l2', order_index: 0, slide_type: 'content' } as any,
          ]],
        ]),
        blocks: new Map(),
      });
    });

    it('moves a slide from one lesson to another', () => {
      store.getState().moveSlideToLesson('s1', 'l1', 'l2');
      const l1Slides = store.getState().slides.get('l1') ?? [];
      const l2Slides = store.getState().slides.get('l2') ?? [];
      expect(l1Slides).toHaveLength(1);
      expect(l1Slides[0].id).toBe('s2');
      expect(l2Slides).toHaveLength(2);
      expect(l2Slides.some(s => s.id === 's1')).toBe(true);
    });

    it('marks store as dirty', () => {
      store.getState().moveSlideToLesson('s1', 'l1', 'l2');
      expect(store.getState().isDirty).toBe(true);
    });

    it('reindexes source lesson slides', () => {
      store.getState().moveSlideToLesson('s1', 'l1', 'l2');
      const l1Slides = store.getState().slides.get('l1') ?? [];
      expect(l1Slides[0].order_index).toBe(0);
    });

    it('does nothing for non-existent slide', () => {
      store.getState().moveSlideToLesson('nonexistent', 'l1', 'l2');
      expect(store.getState().slides.get('l1')).toHaveLength(2);
    });

    it('is undoable', () => {
      store.getState().moveSlideToLesson('s1', 'l1', 'l2');
      store.getState().undo();
      expect(store.getState().slides.get('l1')).toHaveLength(2);
      expect(store.getState().slides.get('l2')).toHaveLength(1);
    });
  });

  describe('duplicateBlock', () => {
    beforeEach(() => {
      store.getState().loadCourse({
        courseId: 'c1',
        modules: [],
        lessons: new Map(),
        slides: new Map(),
        blocks: new Map([
          ['slide1', [
            { id: 'b1', slide_id: 'slide1', block_type: 'rich_text', data: { html: '<p>Hello</p>' }, order_index: 0, is_visible: true },
            { id: 'b2', slide_id: 'slide1', block_type: 'image_gallery', data: { url: 'img.jpg' }, order_index: 1, is_visible: true },
          ]],
        ]),
      });
    });

    it('inserts a duplicate block after the source', () => {
      store.getState().duplicateBlock('slide1', 'b1', 'b1-copy', { html: '<p>Hello</p>' });
      const blocks = store.getState().blocks.get('slide1') ?? [];
      expect(blocks).toHaveLength(3);
      expect(blocks[1].id).toBe('b1-copy');
      expect(blocks[1].data).toEqual({ html: '<p>Hello</p>' });
    });

    it('shifts subsequent blocks order_index', () => {
      store.getState().duplicateBlock('slide1', 'b1', 'b1-copy', { html: '<p>Hello</p>' });
      const blocks = store.getState().blocks.get('slide1') ?? [];
      expect(blocks[0].order_index).toBe(0); // b1
      expect(blocks[1].order_index).toBe(1); // b1-copy
      expect(blocks[2].order_index).toBe(2); // b2 (shifted)
    });

    it('selects the new block', () => {
      store.getState().duplicateBlock('slide1', 'b1', 'b1-copy', { html: '<p>Hello</p>' });
      expect(store.getState().selectedEntity).toEqual({ type: 'block', id: 'b1-copy' });
    });

    it('marks store as dirty', () => {
      store.getState().duplicateBlock('slide1', 'b1', 'b1-copy', {});
      expect(store.getState().isDirty).toBe(true);
    });

    it('does nothing for non-existent block', () => {
      store.getState().duplicateBlock('slide1', 'nonexistent', 'copy', {});
      expect(store.getState().blocks.get('slide1')).toHaveLength(2);
    });

    it('is undoable', () => {
      store.getState().duplicateBlock('slide1', 'b1', 'b1-copy', {});
      store.getState().undo();
      expect(store.getState().blocks.get('slide1')).toHaveLength(2);
    });
  });
});
