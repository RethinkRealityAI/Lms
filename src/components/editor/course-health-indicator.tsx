'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AlertTriangle, EyeOff, HelpCircle, Unlink, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCourseQuizHealth, type CourseQuizHealth } from '@/lib/db/quiz-health';
import { useEditorStore } from './editor-store-context';

const EMPTY_HEALTH: CourseQuizHealth = { problematic: [], stranded: [] };

interface DraftSlideIssue {
  slideId: string;
  lessonId: string;
  lessonTitle: string;
  slideNumber: number;
  slideTitle: string;
}

/**
 * Compact content-health chip for the editor toolbar. Shows an amber count of
 * issues in the CURRENT course — draft slides (invisible to students), broken
 * quizzes, and quiz blocks stranded on deleted slides — with a popover that
 * lists each one and jumps the editor selection to it. Draft slides are derived
 * live from the store; quiz issues re-fetch after each save/publish completes.
 */
export function CourseHealthIndicator() {
  const courseId = useEditorStore((s) => s.courseId);
  const slides = useEditorStore((s) => s.slides);
  const lessons = useEditorStore((s) => s.lessons);
  const isSaving = useEditorStore((s) => s.isSaving);
  const isPublishing = useEditorStore((s) => s.isPublishing);
  const selectEntity = useEditorStore((s) => s.selectEntity);

  const [open, setOpen] = useState(false);
  const [quizHealth, setQuizHealth] = useState<CourseQuizHealth>(EMPTY_HEALTH);
  const rootRef = useRef<HTMLDivElement>(null);

  const lessonTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of lessons.values()) {
      for (const lesson of list) map.set(lesson.id, lesson.title);
    }
    return map;
  }, [lessons]);

  // Draft slides come straight from the store, so the list is always current
  // (new slides, publishes, deletes) without any extra fetching.
  const draftSlides = useMemo(() => {
    const out: DraftSlideIssue[] = [];
    for (const [lessonId, list] of slides) {
      list.forEach((slide, index) => {
        if (slide.status === 'published') return;
        out.push({
          slideId: slide.id,
          lessonId,
          lessonTitle: lessonTitleById.get(lessonId) ?? 'Untitled lesson',
          slideNumber: index + 1,
          slideTitle: slide.title || slide.slide_type,
        });
      });
    }
    return out;
  }, [slides, lessonTitleById]);

  const refreshQuizHealth = useCallback(async () => {
    if (!courseId) return;
    try {
      const supabase = createClient();
      setQuizHealth(await getCourseQuizHealth(supabase, courseId));
    } catch (err) {
      // Leave the previous result in place — never blank the panel on a failed
      // fetch (a failed query must not masquerade as "all healthy").
      console.error('Failed to load course content health:', err);
    }
  }, [courseId]);

  // Initial fetch, then recompute whenever a save or publish finishes.
  useEffect(() => {
    refreshQuizHealth();
  }, [refreshQuizHealth]);

  const wasBusyRef = useRef(false);
  useEffect(() => {
    const busy = isSaving || isPublishing;
    if (wasBusyRef.current && !busy) refreshQuizHealth();
    wasBusyRef.current = busy;
  }, [isSaving, isPublishing, refreshQuizHealth]);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const issueCount = draftSlides.length + quizHealth.problematic.length + quizHealth.stranded.length;
  if (issueCount === 0) return null;

  function jumpToSlide(slideId: string) {
    selectEntity({ type: 'slide', id: slideId });
    setOpen(false);
  }

  function jumpToLesson(lessonId: string) {
    selectEntity({ type: 'lesson', id: lessonId });
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-colors"
        title="Content health — issues in this course"
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        {issueCount} issue{issueCount !== 1 ? 's' : ''}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 max-h-[26rem] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-[80] py-2">
          <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-700">Content health</span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {draftSlides.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 px-4 pb-1 text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                <EyeOff className="w-3 h-3" />
                Draft slides — hidden from students ({draftSlides.length})
              </div>
              {draftSlides.map((issue) => (
                <button
                  key={issue.slideId}
                  onClick={() => jumpToSlide(issue.slideId)}
                  className="w-full text-left px-4 py-1.5 hover:bg-amber-50 transition-colors"
                >
                  <span className="block text-xs text-gray-700 truncate">
                    Slide {issue.slideNumber} · {issue.slideTitle}
                  </span>
                  <span className="block text-[10px] text-gray-400 truncate">{issue.lessonTitle}</span>
                </button>
              ))}
            </div>
          )}

          {quizHealth.problematic.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 px-4 pb-1 text-[10px] font-semibold text-red-600 uppercase tracking-wider">
                <HelpCircle className="w-3 h-3" />
                Broken quizzes ({quizHealth.problematic.length})
              </div>
              {quizHealth.problematic.map((quiz) => (
                <button
                  key={quiz.blockId}
                  onClick={() => (quiz.slideId ? jumpToSlide(quiz.slideId) : jumpToLesson(quiz.lessonId))}
                  className="w-full text-left px-4 py-1.5 hover:bg-red-50 transition-colors"
                >
                  <span className="block text-xs text-gray-700 truncate">
                    {quiz.question || 'Untitled question'}
                  </span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {quiz.lessonTitle} — {quiz.problem}
                    {quiz.blocksCompletion ? ' · blocks completion' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {quizHealth.stranded.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 px-4 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                <Unlink className="w-3 h-3" />
                Quizzes on deleted slides ({quizHealth.stranded.length})
              </div>
              {quizHealth.stranded.map((quiz) => (
                <button
                  key={quiz.blockId}
                  onClick={() => jumpToLesson(quiz.lessonId)}
                  className="w-full text-left px-4 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="block text-xs text-gray-700 truncate">
                    {quiz.question || 'Untitled question'}
                  </span>
                  <span className="block text-[10px] text-gray-400 truncate">
                    {quiz.lessonTitle} — slide was deleted; the quiz block never renders
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
