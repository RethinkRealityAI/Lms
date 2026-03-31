'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// All vi.mock factories must not reference module-level variables (they are hoisted)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn(),
  })),
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
      theme_overrides: {},
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
  getModulesWithLessonsByCourse: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/lessons', () => ({
  createLesson: vi.fn().mockResolvedValue({ id: 'new-les-id', title: 'New Lesson', module_id: 'mod-1', order_index: 0 }),
  deleteLesson: vi.fn().mockResolvedValue(undefined),
  getLessonsByCourse: vi.fn().mockResolvedValue([]),
  getLessonById: vi.fn().mockResolvedValue(null),
  getBlocksByLesson: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db/blocks', () => ({
  updateBlock: vi.fn().mockResolvedValue(undefined),
  deleteBlock: vi.fn().mockResolvedValue(undefined),
}));

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

import { CourseEditorShell } from './course-editor-shell';

describe('CourseEditorShell handleSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSave = undefined;
  });

  it('calls updateSlide for each slide in the store when handleSave is invoked', async () => {
    const { updateSlide } = await import('@/lib/db/slides');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    // Invoke handleSave directly via the captured callback
    expect(capturedOnSave).toBeDefined();
    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateSlide).toHaveBeenCalledWith(
      expect.anything(),
      'slide-1',
      expect.objectContaining({ title: 'Slide One' }),
      'inst-1',
    );
  });

  it('does not leave loading state when course data is loaded', async () => {
    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    expect(screen.queryByText('Loading editor...')).toBeNull();
    expect(screen.queryByText('Failed to load course')).toBeNull();
  });

  it('calls updateBlock for each block in the store when handleSave is invoked', async () => {
    const { updateBlock } = await import('@/lib/db/blocks');

    await act(async () => {
      render(<CourseEditorShell courseId="course-1" />);
    });

    expect(capturedOnSave).toBeDefined();
    await act(async () => {
      await capturedOnSave!();
    });

    expect(updateBlock).toHaveBeenCalledWith(
      expect.anything(),
      'block-1',
      expect.objectContaining({ data: { html: '<p>Hello</p>' } }),
      'inst-1',
    );
  });
});
