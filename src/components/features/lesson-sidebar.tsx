'use client';

import { CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Module, Lesson, Progress } from '@/types';
import { calculateLessonProgress } from '@/lib/utils/completion';

interface Props {
  modules: (Module & { lessons: Lesson[] })[];
  progress: Progress[];
  activeLessonId?: string;
  onSelectLesson: (lesson: Lesson) => void;
}

export function LessonSidebar({ modules, progress, activeLessonId, onSelectLesson }: Props) {
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));

  return (
    <nav className="w-72 shrink-0 space-y-2 overflow-y-auto pr-2">
      {modules.map((mod) => (
        <ModuleSection
          key={mod.id}
          module={mod}
          completedIds={completedIds}
          activeLessonId={activeLessonId}
          onSelectLesson={onSelectLesson}
        />
      ))}
    </nav>
  );
}

function ModuleSection({
  module,
  completedIds,
  activeLessonId,
  onSelectLesson,
}: {
  module: Module & { lessons: Lesson[] };
  completedIds: Set<string>;
  activeLessonId?: string;
  onSelectLesson: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(true);
  const lessonsWithProgress = module.lessons.map((l) => ({
    ...l,
    completed: completedIds.has(l.id),
  }));
  const { percentage } = calculateLessonProgress(lessonsWithProgress);

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{module.title}</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {open ? <ChevronDown className="ml-2 h-4 w-4 shrink-0" /> : <ChevronRight className="ml-2 h-4 w-4 shrink-0" />}
      </button>

      {open && (
        <ul className="border-t pb-1">
          {module.lessons.map((lesson) => {
            const done = completedIds.has(lesson.id);
            const active = lesson.id === activeLessonId;
            return (
              <li key={lesson.id}>
                <button
                  onClick={() => onSelectLesson(lesson)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                    active && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  {done ? (
                    <CheckCircle aria-label="Lesson completed" className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className="truncate">{lesson.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
