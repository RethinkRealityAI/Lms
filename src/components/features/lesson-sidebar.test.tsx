import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LessonSidebar } from './lesson-sidebar';
import type { Module, Lesson, Progress } from '@/types';

const makeLesson = (id: string, title: string): Lesson => ({
  id,
  title,
  description: '',
  course_id: 'course-1',
  module_id: 'mod-1',
  order_index: 0,
  content_type: 'video',
  content_url: '',
  is_required: true,
  created_at: '',
});

const makeModule = (id: string, title: string, lessons: Lesson[]): Module & { lessons: Lesson[] } => ({
  id,
  title,
  course_id: 'course-1',
  order_index: 0,
  is_published: true,
  created_at: '',
  updated_at: '',
  lessons,
});

describe('LessonSidebar', () => {
  it('renders module titles', () => {
    const modules = [makeModule('m1', 'Module One', [makeLesson('l1', 'Lesson A')])];
    render(
      <LessonSidebar
        modules={modules}
        progress={[]}
        onSelectLesson={() => {}}
      />
    );
    expect(screen.getByText('Module One')).toBeInTheDocument();
    expect(screen.getByText('Lesson A')).toBeInTheDocument();
  });

  it('shows completed check for completed lessons', () => {
    const lesson = makeLesson('l1', 'Lesson A');
    const modules = [makeModule('m1', 'Mod', [lesson])];
    const progress: Progress[] = [{ id: 'p1', user_id: 'u1', lesson_id: 'l1', completed: true, completed_at: '' }];
    render(
      <LessonSidebar
        modules={modules}
        progress={progress}
        onSelectLesson={() => {}}
      />
    );
    expect(screen.getByLabelText('Lesson completed')).toBeInTheDocument();
  });
});
