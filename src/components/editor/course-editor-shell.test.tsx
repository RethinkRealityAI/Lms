'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// All vi.mock factories must not reference module-level variables (they are hoisted)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      // The editor shell queries institutions to resolve institution_id from the tenant slug
      if (table === 'institutions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'inst-1' }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/gansid/admin/courses/course-1/editor'),
}));

vi.mock('@/lib/db/users', () => ({
  getUserInstitutionId: vi.fn().mockResolvedValue('inst-1'),
}));

vi.mock('@/lib/db/editor', () => ({
  loadEditorCourseData: vi.fn().mockResolvedValue({
    course: {
      id: 'course-1',
      title: 'Test Course',
      description: null,
      theme_settings: {},
      status: 'draft',
      institution_id: 'inst-1',
    },
    modules: [{ id: 'mod-1', title: 'Module 1', course_id: 'course-1', order_index: 0 }],
    lessonsByModule: new Map([['mod-1', [{ id: 'lesson-1', title: 'Lesson 1', module_id: 'mod-1', course_id: 'course-1', order_index: 0 }]]]),
    slidesByLesson: new Map([['lesson-1', [{
      id: 'slide-1',
      lesson_id: 'lesson-1',
      slide_type: 'content',
      title: 'Slide One',
      order_index: 0,
      status: 'draft',
      settings: {},
      deleted_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }]]]),
    blocksBySlide: new Map([['slide-1', [{
      id: 'block-1',
      slide_id: 'slide-1',
      block_type: 'rich_text',
      data: { html: '<p>Hello</p>' },
      order_index: 0,
      is_visible: true,
    }]]]),
  }),
}));

vi.mock('@/lib/db/slides', () => ({
  updateSlide: vi.fn().mockResolvedValue(undefined),
  createSlide: vi.fn().mockResolvedValue({ id: 'new-slide-id' }),
  deleteSlide: vi.fn().mockResolvedValue(undefined),
  reorderSlides: vi.fn().mockResolvedValue(undefined),
  getSlidesByLesson: vi.fn().mockResolvedValue([]),
  getSlideTemplates: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/modules', () => ({
  createModule: vi.fn().mockResolvedValue({ id: 'new-mod-id', title: 'New Module', course_id: 'course-1', order_index: 0 }),
  deleteModule: vi.fn().mockResolvedValue(undefined),
  getModulesByCourse: vi.fn().mockResolvedValue([]),
  updateModule: vi.fn().mockResolvedValue(undefined),
  getModulesWithLessonsByCourse: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/lessons', () => ({
  createLesson: vi.fn().mockResolvedValue({ id: 'new-les-id', title: 'New Lesson', module_id: 'mod-1', order_index: 0 }),
  deleteLesson: vi.fn().mockResolvedValue(undefined),
  getLessonsByCourse: vi.fn().mockResolvedValue([]),
  updateLesson: vi.fn().mockResolvedValue(undefined),
  getLessonById: vi.fn().mockResolvedValue(null),
  getBlocksByLesson: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/blocks', () => ({
  createBlock: vi.fn().mockResolvedValue({ id: 'new-block-id' }),
  updateBlock: vi.fn().mockResolvedValue(undefined),
  deleteBlock: vi.fn().mockResolvedValue(undefined),
}));

// Capture the editor store instance so tests can make an edit before saving
// (the save is now SELECTIVE — it only writes entities that changed vs the
// load-time baseline, so an unedited save is intentionally a no-op).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedStore: any;
vi.mock('@/lib/stores/editor-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stores/editor-store')>();
  return {
    ...actual,
    createEditorStore: () => {
      const s = actual.createEditorStore();
      capturedStore = s;
      return s;
    },
  };
});

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    publishCourse: vi.fn().mockResolvedValue(undefined),
    updateSlide: vi.fn().mockResolvedValue(undefined),
    updateBlock: vi.fn().mockResolvedValue(undefined),
    deleteBlock: vi.fn().mockResolvedValue(undefined),
    createModule: vi.fn().mockResolvedValue({ id: 'new-mod-id', title: 'New Module', course_id: 'course-1', order_index: 0 }),
    deleteModule: vi.fn().mockResolvedValue(undefined),
    createLesson: vi.fn().mockResolvedValue({ id: 'new-les-id', title: 'New Lesson', module_id: 'mod-1', order_index: 0 }),
    deleteLesson: vi.fn().mockResolvedValue(undefined),
  };
});

// Capture the onSave callback so we can invoke it directly in tests
let capturedOnSave: (() => Promise<void>) | undefined;

vi.mock('@/lib/hooks/use-auto-save', () => ({
  useAutoSave: vi.fn().mockImplementation((_isDirty: boolean, onSave: () => Promise<void>) => {
    capturedOnSave = onSave;
    return { saveNow: onSave };
  }),
}));

vi.mock('@/lib/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CourseEditorShell } from './course-editor-shell';

describe('CourseEditorShell handleSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSave = undefined;
  });

  it('persists a CHANGED slide when handleSave is invoked', async () => {
    const { updateSlide } = await import('@/lib/db/slides');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    expect(capturedOnSave).toBeDefined();
    expect(capturedStore).toBeDefined();

    // Edit the slide so it differs from the load-time baseline.
    await act(async () => {
      capturedStore.getState().updateSlide('lesson-1', 'slide-1', { title: 'Slide One EDITED' });
    });

    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateSlide).toHaveBeenCalledWith(
      expect.anything(),
      'slide-1',
      expect.objectContaining({ title: 'Slide One EDITED' }),
      'inst-1',
    );
  });

  it('does NOT re-save unchanged entities (selective save)', async () => {
    const { updateSlide } = await import('@/lib/db/slides');
    const { updateBlock } = await import('@/lib/db/blocks');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    // No edits made — a save right after load must write nothing (the old code
    // re-saved the whole course here, which is what flooded the browser).
    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateSlide).not.toHaveBeenCalled();
    expect(updateBlock).not.toHaveBeenCalled();
  });

  it('does not leave loading state when course data is loaded', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    expect(screen.queryByText('Loading editor...')).toBeNull();
    expect(screen.queryByText('Failed to load course')).toBeNull();
  });

  it('persists a CHANGED block when handleSave is invoked', async () => {
    const { updateBlock } = await import('@/lib/db/blocks');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    expect(capturedStore).toBeDefined();
    await act(async () => {
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { html: '<p>Changed</p>' } });
    });

    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateBlock).toHaveBeenCalledWith(
      expect.anything(),
      'block-1',
      expect.objectContaining({ data: { html: '<p>Changed</p>' } }),
      'inst-1',
    );
  });

  it('flips a published slide to draft INSTANTLY on edit, before any save', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });
    expect(capturedStore).toBeDefined();

    // Mark the slide published (a status-only change must NOT be treated as an edit).
    await act(async () => {
      capturedStore.getState().updateSlide('lesson-1', 'slide-1', { status: 'published' });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterPublish = capturedStore.getState().slides.get('lesson-1').find((s: any) => s.id === 'slide-1');
    expect(afterPublish.status).toBe('published'); // not unpublished by its own status change

    // Now edit a block — no save invoked.
    await act(async () => {
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { html: '<p>Edited</p>' } });
    });

    // The subscription should have flipped it to draft immediately.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterEdit = capturedStore.getState().slides.get('lesson-1').find((s: any) => s.id === 'slide-1');
    expect(afterEdit.status).toBe('draft');
  });

  it('does NOT unpublish a slide when only a block grid dimension changes (auto-fit/resize)', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });
    await act(async () => {
      capturedStore.getState().updateSlide('lesson-1', 'slide-1', { status: 'published' });
    });

    // Simulate auto-fit / resize: change ONLY a grid geometry field on the block.
    await act(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blk = capturedStore.getState().blocks.get('slide-1')[0] as any;
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { ...blk.data, gridH: 99 } });
    });

    // Layout-only change must NOT unpublish the slide.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slide = capturedStore.getState().slides.get('lesson-1').find((s: any) => s.id === 'slide-1');
    expect(slide.status).toBe('published');
  });

  it('re-publishes a slide when the edit that drafted it is UNDONE', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });
    await act(async () => {
      capturedStore.getState().updateSlide('lesson-1', 'slide-1', { status: 'published' });
    });

    // Edit the block → subscription flips the slide to draft.
    await act(async () => {
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { html: '<p>Edited</p>' } });
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drafted = capturedStore.getState().slides.get('lesson-1').find((s: any) => s.id === 'slide-1');
    expect(drafted.status).toBe('draft');

    // Undo the edit. It reverts the block content to the published version, so the
    // slide must go back to published — the subscription must NOT re-draft the restore.
    await act(async () => {
      capturedStore.getState().undo();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restored = capturedStore.getState().slides.get('lesson-1').find((s: any) => s.id === 'slide-1');
    expect(restored.status).toBe('published');
    expect(capturedStore.getState().isRestoring).toBe(false); // flag cleared after restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restoredBlock = capturedStore.getState().blocks.get('slide-1').find((b: any) => b.id === 'block-1');
    expect(restoredBlock.data.html).not.toBe('<p>Edited</p>'); // content reverted too
  });

  it('reverts a published slide to draft when its content is edited', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });
    expect(capturedStore).toBeDefined();

    // Simulate a previously-published slide, then edit a block on it.
    await act(async () => {
      capturedStore.getState().updateSlide('lesson-1', 'slide-1', { status: 'published' });
    });
    await act(async () => {
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { html: '<p>Edited</p>' } });
    });

    await act(async () => {
      await capturedOnSave!();
    });

    // Editing published content unpublishes that slide until the next Publish.
    const slide = capturedStore.getState().slides.get('lesson-1')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((s: any) => s.id === 'slide-1');
    expect(slide.status).toBe('draft');
  });

  it('does not call markSaved when a DB update fails, and retries the failed entity', async () => {
    const { updateBlock } = await import('@/lib/db/blocks');
    const { toast } = await import('sonner');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    // Edit the block so it's dirty, then make the first save of it fail.
    await act(async () => {
      capturedStore.getState().updateBlock('slide-1', 'block-1', { data: { html: '<p>Changed</p>' } });
    });
    vi.mocked(updateBlock).mockRejectedValueOnce(new Error('DB write failed'));

    await act(async () => {
      await capturedOnSave!();
    });

    // Error toast should have fired
    expect(toast.error).toHaveBeenCalledWith(
      'Some changes failed to save',
      expect.objectContaining({ description: expect.stringContaining('could not be saved') }),
    );

    // markSaved was NOT called and the failed block's baseline was NOT updated, so a
    // second save retries exactly that block (proving it's still considered dirty).
    vi.mocked(updateBlock).mockClear();

    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateBlock).toHaveBeenCalledWith(
      expect.anything(),
      'block-1',
      expect.anything(),
      'inst-1',
    );
  });
});
