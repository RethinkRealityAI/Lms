export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

interface LessonProgressInput {
  id: string;
  completed: boolean;
  is_required?: boolean;
}

export function calculateLessonProgress(lessons: LessonProgressInput[]) {
  const required = lessons.filter((l) => l.is_required !== false);
  const completedRequired = required.filter((l) => l.completed);
  const percentage = calculateCompletionPercentage(completedRequired.length, required.length);
  return {
    completed: completedRequired.length === required.length && required.length > 0,
    percentage,
    completedCount: completedRequired.length,
    totalCount: required.length,
  };
}

interface ModuleProgressInput {
  id: string;
  completedLessons: number;
  totalLessons: number;
}

export function calculateCourseProgress(modules: ModuleProgressInput[]) {
  const total = modules.reduce((sum, m) => sum + m.totalLessons, 0);
  const completed = modules.reduce((sum, m) => sum + m.completedLessons, 0);
  const percentage = calculateCompletionPercentage(completed, total);
  return {
    completed: percentage === 100 && total > 0,
    percentage,
    completedLessons: completed,
    totalLessons: total,
  };
}
