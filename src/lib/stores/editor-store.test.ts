import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStore, type EditorStore } from './editor-store';

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
  });
});
