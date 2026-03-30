import { describe, it, expect } from 'vitest';
import {
  calculateCompletionPercentage,
  calculateLessonProgress,
  calculateCourseProgress,
} from './completion';

describe('calculateCompletionPercentage', () => {
  it('returns 0 when none completed', () => {
    expect(calculateCompletionPercentage(0, 10)).toBe(0);
  });

  it('returns 100 when all completed', () => {
    expect(calculateCompletionPercentage(10, 10)).toBe(100);
  });

  it('returns 50 for half completed', () => {
    expect(calculateCompletionPercentage(5, 10)).toBe(50);
  });

  it('returns 0 when total is 0', () => {
    expect(calculateCompletionPercentage(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculateCompletionPercentage(1, 3)).toBe(33);
  });
});

describe('calculateLessonProgress', () => {
  it('returns completed true when all required lessons done', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: true, is_required: true },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it('ignores optional lessons in completion calculation', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: false, is_required: false },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(true);
  });

  it('returns completed false when required lesson not done', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: true },
      { id: 'b', completed: false, is_required: true },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(false);
    expect(result.percentage).toBe(50);
  });

  it('returns false when lesson list is empty', () => {
    const result = calculateLessonProgress([]);
    expect(result.completed).toBe(false);
    expect(result.percentage).toBe(0);
  });

  it('treats is_required: undefined as required', () => {
    const lessons = [
      { id: 'a', completed: true, is_required: undefined },
      { id: 'b', completed: false, is_required: undefined },
    ];
    const result = calculateLessonProgress(lessons);
    expect(result.completed).toBe(false);
    expect(result.totalCount).toBe(2);
  });
});

describe('calculateCourseProgress', () => {
  it('sums lesson completion across modules', () => {
    const modules = [
      { id: 'm1', completedLessons: 2, totalLessons: 4 },
      { id: 'm2', completedLessons: 4, totalLessons: 4 },
    ];
    const result = calculateCourseProgress(modules);
    expect(result.percentage).toBe(75);
    expect(result.completed).toBe(false);
  });

  it('returns completed true when all modules done', () => {
    const modules = [
      { id: 'm1', completedLessons: 4, totalLessons: 4 },
    ];
    const result = calculateCourseProgress(modules);
    expect(result.completed).toBe(true);
    expect(result.percentage).toBe(100);
  });

  it('returns 0 for empty module list', () => {
    const result = calculateCourseProgress([]);
    expect(result.completed).toBe(false);
    expect(result.percentage).toBe(0);
  });
});
