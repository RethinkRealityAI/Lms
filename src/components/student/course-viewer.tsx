'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, Circle, Play, Loader2, Star, Send,
  ChevronLeft, ChevronRight, ChevronDown, Award, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson, LessonBlock, Progress as ProgressType } from '@/types';
import { LessonBlockRenderer, createFallbackBlockFromLesson } from '@/components/lesson-block-renderer';
import { sortBlocks } from '@/lib/content/lesson-blocks';
import { TitleSlide } from '@/components/shared/title-slide';
import { SlideContentArea } from '@/components/shared/slide-frame';

// ---------------------------------------------------------------------------
// Slide types
// ---------------------------------------------------------------------------
interface SlideSettings {
  background?: string;
  background_image?: string;
  [key: string]: unknown;
}

type Slide =
  | { kind: 'title' }
  | { kind: 'page'; slideId: string; blocks: LessonBlock[]; settings?: SlideSettings }
  | { kind: 'completion' };

// ---------------------------------------------------------------------------
// Confetti celebration — pure CSS, no external deps
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = ['#DC2626', '#0099CA', '#1E3A5F', '#FFD700', '#22C55E'];

function Confetti({ count = 24 }: { count?: number }) {
  const pieces = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,           // % from left
      delay: Math.random() * 1.2,           // stagger start 0–1.2s
      duration: 1.8 + Math.random() * 1.2,  // 1.8–3s fall
      drift: (Math.random() - 0.5) * 60,    // px horizontal drift
      size: 4 + Math.random() * 4,          // 4–8px
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
      isCircle: Math.random() > 0.5,
    })),
  [count]);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { opacity: 1; transform: translateY(-10px) translateX(0px) rotate(0deg) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(calc(100vh - 120px)) translateX(var(--drift)) rotate(var(--rotate)) scale(0.5); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden="true">
        {pieces.map(p => (
          <div
            key={p.id}
            className={p.isCircle ? 'rounded-full' : 'rounded-sm'}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0,
              '--drift': `${p.drift}px`,
              '--rotate': `${p.rotate + 360}deg`,
              animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Slide background — matches editor's getSlideBackground (slide-preview.tsx)
// ---------------------------------------------------------------------------
function getSlideBackground(settings?: SlideSettings): React.CSSProperties {
  const bg = settings?.background;
  if (bg === 'gradient') return { background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)' };
  if (typeof bg === 'string' && bg.startsWith('#')) return { backgroundColor: bg };
  return { backgroundColor: '#FFFFFF' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CourseViewerProps {
  courseId: string;
  previewMode?: boolean;
}

export default function CourseViewer({ courseId, previewMode = false }: CourseViewerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressType>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<Record<string, LessonBlock[]>>({});
  const [lessonSlidesMap, setLessonSlidesMap] = useState<Record<string, Array<{ id: string; order_index: number; settings?: SlideSettings }>>>({});
  const [lessonQuizzes, setLessonQuizzes] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  // Slide viewer
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoCompleteFired, setAutoCompleteFired] = useState<Record<string, boolean>>({});
  // Confetti — track which lessons have already shown the animation
  const confettiFiredRef = useRef<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  // Inline quiz completion tracking — set of blockIds answered correctly per lesson
  const [correctQuizBlocks, setCorrectQuizBlocks] = useState<Record<string, Set<string>>>({});
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [courseId]);

  // ---------------------------------------------------------------------------
  // Lesson selection — always resets to slide 0
  // ---------------------------------------------------------------------------
  const selectLesson = useCallback((lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentSlide(0);
  }, []);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    setPageLoading(true);
    try {
      // Fetch course first — RLS allows reading published courses without auth,
      // so this never erroneously returns null due to session timing issues.
      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (courseData) setCourse(courseData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPageLoading(false); return; }

      const { data: enrollment } = await supabase.from('course_enrollments').select('*')
        .eq('user_id', user.id).eq('course_id', courseId).single();

      // Auto-enroll: if the student isn't enrolled yet, enroll them silently.
      if (!enrollment && courseData) {
        if (!previewMode) {
          await supabase.from('course_enrollments').insert([{ user_id: user.id, course_id: courseId }]);
        }
        setIsEnrolled(true);
      } else {
        setIsEnrolled(!!enrollment);
      }

      const { data: lessonsData } = await supabase.from('lessons').select('*')
        .eq('course_id', courseId).order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
        if (lessonsData.length > 0 && !selectedLesson) setSelectedLesson(lessonsData[0]);

        const lessonIds = lessonsData.map(l => l.id);
        if (lessonIds.length > 0) {
          const { data: blocksData } = await supabase.from('lesson_blocks').select('*')
            .in('lesson_id', lessonIds).order('order_index', { ascending: true });

          if (blocksData) {
            const grouped: Record<string, LessonBlock[]> = {};
            for (const block of blocksData as LessonBlock[]) {
              if (!grouped[block.lesson_id]) grouped[block.lesson_id] = [];
              grouped[block.lesson_id].push(block);
            }
            Object.keys(grouped).forEach(id => { grouped[id] = sortBlocks(grouped[id]); });
            setLessonBlocks(grouped);
          }

          // Fetch slides to know their order and settings within each lesson
          const { data: slidesData } = await supabase
            .from('slides')
            .select('id, lesson_id, order_index, settings')
            .in('lesson_id', lessonIds)
            .order('order_index', { ascending: true });

          if (slidesData) {
            const groupedSlides: Record<string, Array<{ id: string; order_index: number; settings?: SlideSettings }>> = {};
            for (const slide of slidesData as Array<{ id: string; lesson_id: string; order_index: number; settings?: SlideSettings }>) {
              if (!groupedSlides[slide.lesson_id]) groupedSlides[slide.lesson_id] = [];
              groupedSlides[slide.lesson_id].push({ id: slide.id, order_index: slide.order_index, settings: slide.settings });
            }
            setLessonSlidesMap(groupedSlides);
          }

          const { data: quizzesData } = await supabase.from('quizzes').select('lesson_id').in('lesson_id', lessonIds);
          if (quizzesData) {
            const qm: Record<string, boolean> = {};
            quizzesData.forEach(q => { qm[q.lesson_id] = true; });
            setLessonQuizzes(qm);
          }
        }
      }

      if (enrollment) {
        const lessonIds = (lessonsData ?? []).map(l => l.id);
        if (lessonIds.length > 0) {
          const { data: progressData } = await supabase.from('progress').select('*')
            .eq('user_id', user.id).in('lesson_id', lessonIds);
          if (progressData) {
            const pm: Record<string, ProgressType> = {};
            progressData.forEach(p => { pm[p.lesson_id] = p; });
            setProgress(pm);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setPageLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleMarkComplete = useCallback(async () => {
    if (!selectedLesson) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      // Always update local state so sidebar checkmarks appear even in preview mode
      const updatedProgress = { ...progress, [selectedLesson.id]: {
        id: '', user_id: user.id, lesson_id: selectedLesson.id,
        completed: true, completed_at: new Date().toISOString(),
      }};
      setProgress(updatedProgress);

      // Skip DB writes in preview mode
      if (!previewMode) {
        const { error } = await supabase.from('progress').upsert([{
          user_id: user.id, lesson_id: selectedLesson.id,
          completed: true, completed_at: new Date().toISOString(),
        }]);
        if (error) throw error;

        const allCompleted = lessons.every(l => updatedProgress[l.id]?.completed);
        if (allCompleted && lessons.length > 0) {
          const { data: existingCert } = await supabase.from('certificates').select('id')
            .eq('user_id', user.id).eq('course_id', courseId).single();
          if (!existingCert) {
            const { error: certError } = await supabase.from('certificates').insert([{
              user_id: user.id, course_id: courseId, issued_at: new Date().toISOString(),
            }]);
            if (!certError) {
              toast.success('Course Completed! 🎉', {
                description: 'A certificate has been issued. View it in your Certificates page.',
                duration: 6000,
              });
            }
          }
        }
        // Re-fetch progress silently (no jarring page refresh — local state already updated above)
        const lessonIds = lessons.map(l => l.id);
        if (lessonIds.length > 0) {
          const { data: progressData } = await supabase.from('progress').select('*')
            .eq('user_id', user.id).in('lesson_id', lessonIds);
          if (progressData) {
            const pm: Record<string, ProgressType> = {};
            progressData.forEach(p => { pm[p.lesson_id] = p; });
            setProgress(pm);
          }
        }
      }
    } catch (err: any) {
      toast.error('Failed to mark lesson as complete', { description: err.message });
    }
  }, [selectedLesson, progress, lessons, courseId, previewMode]);


  const openReviewModal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('course_reviews').select('id, rating, review_text')
      .eq('course_id', courseId).eq('user_id', user.id).single();
    if (data) {
      setExistingReviewId(data.id);
      setReviewRating(data.rating);
      setReviewText(data.review_text || '');
    } else {
      setExistingReviewId(null);
      setReviewRating(0);
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setReviewLoading(true);
    try {
      if (existingReviewId) {
        const { error } = await supabase.from('course_reviews').update({
          rating: reviewRating, review_text: reviewText, updated_at: new Date().toISOString(),
        }).eq('id', existingReviewId);
        if (error) throw error;
        toast.success('Review updated!');
      } else {
        const { error } = await supabase.from('course_reviews').insert([{
          course_id: courseId, user_id: user.id, rating: reviewRating, review_text: reviewText,
        }]);
        if (error) throw error;
        toast.success('Review submitted! Thank you.');
      }
      setShowReviewModal(false);
    } catch (err: any) {
      toast.error('Failed to submit review', { description: err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Slide helpers — group blocks by slide_id, ordered by slide order_index
  // ---------------------------------------------------------------------------
  const currentSlides: Slide[] = React.useMemo(() => {
    if (!selectedLesson) return [];

    const allBlocks = lessonBlocks[selectedLesson.id] ?? [];
    const filteredBlocks = allBlocks.filter(
      b => !(b.block_type === 'cta' && (b.data as Record<string, unknown>)?.action === 'complete_lesson'),
    );
    const slides = lessonSlidesMap[selectedLesson.id] ?? [];

    let pageSlides: Array<{ kind: 'page'; slideId: string; blocks: LessonBlock[]; settings?: SlideSettings }> = [];

    if (slides.length > 0 && filteredBlocks.some(b => b.slide_id)) {
      // Group blocks by slide_id, then order slides by their order_index
      const blocksBySlide: Record<string, LessonBlock[]> = {};
      for (const block of filteredBlocks) {
        const sid = block.slide_id ?? '__no_slide__';
        if (!blocksBySlide[sid]) blocksBySlide[sid] = [];
        blocksBySlide[sid].push(block);
      }
      const sortedSlides = [...slides].sort((a, b) => a.order_index - b.order_index);
      pageSlides = sortedSlides
        .filter(s => (blocksBySlide[s.id]?.length ?? 0) > 0)
        .map(s => ({ kind: 'page' as const, slideId: s.id, blocks: sortBlocks(blocksBySlide[s.id]), settings: s.settings }));

      // Any blocks without a slide_id get appended as a final page
      if (blocksBySlide['__no_slide__']?.length) {
        pageSlides.push({ kind: 'page' as const, slideId: '', blocks: sortBlocks(blocksBySlide['__no_slide__']) });
      }
    } else if (filteredBlocks.length > 0) {
      // No slide metadata — treat all blocks as a single page (legacy fallback)
      pageSlides = [{ kind: 'page' as const, slideId: '', blocks: sortBlocks(filteredBlocks) }];
    } else {
      // Absolute fallback — synthesise a block from lesson content
      pageSlides = [{ kind: 'page' as const, slideId: '', blocks: [createFallbackBlockFromLesson(selectedLesson)] }];
    }

    return [{ kind: 'title' }, ...pageSlides, { kind: 'completion' }];
  }, [selectedLesson, lessonBlocks, lessonSlidesMap]);

  const totalSlides = currentSlides.length;
  const currentSlideData = currentSlides[currentSlide] ?? null;
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === totalSlides - 1;

  // Quiz gating: count inline quiz blocks for current lesson and check if all answered correctly
  const handleQuizCorrect = useCallback((blockId: string) => {
    if (!selectedLesson) return;
    setCorrectQuizBlocks(prev => {
      const existing = prev[selectedLesson.id] ?? new Set();
      if (existing.has(blockId)) return prev;
      const next = new Set(existing);
      next.add(blockId);
      return { ...prev, [selectedLesson.id]: next };
    });
  }, [selectedLesson]);

  const currentLessonQuizBlockIds = React.useMemo(() => {
    if (!selectedLesson) return [];
    const blocks = lessonBlocks[selectedLesson.id] ?? [];
    return blocks.filter(b => b.block_type === 'quiz_inline').map(b => b.id);
  }, [selectedLesson, lessonBlocks]);

  const allQuizzesComplete = currentLessonQuizBlockIds.length === 0 ||
    currentLessonQuizBlockIds.every(id => correctQuizBlocks[selectedLesson?.id ?? '']?.has(id));

  // Gate: is the next slide the completion slide and quizzes aren't done?
  const nextSlideIsCompletion = currentSlides[currentSlide + 1]?.kind === 'completion';
  const nextBlocked = nextSlideIsCompletion && !allQuizzesComplete;

  const goNext = useCallback(() => {
    if (nextBlocked) return;
    setCurrentSlide(i => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides, nextBlocked]);
  const goPrev = useCallback(() => setCurrentSlide(i => Math.max(i - 1, 0)), []);

  // Keyboard navigation (goNext already respects nextBlocked)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedLesson) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLesson, goNext, goPrev]);

  // Auto-mark complete when completion slide reached (only if all quizzes done)
  useEffect(() => {
    if (!selectedLesson) return;
    if (currentSlideData?.kind !== 'completion') return;
    if (progress[selectedLesson.id]?.completed) return;
    if (autoCompleteFired[selectedLesson.id]) return;
    if (!allQuizzesComplete) return;
    setAutoCompleteFired(prev => ({ ...prev, [selectedLesson.id]: true }));
    handleMarkComplete();
  }, [currentSlide, selectedLesson?.id, allQuizzesComplete]);

  // Confetti when completion slide is first shown per lesson
  useEffect(() => {
    if (!selectedLesson) return;
    if (currentSlideData?.kind !== 'completion') {
      setShowConfetti(false);
      return;
    }
    if (confettiFiredRef.current[selectedLesson.id]) return;
    confettiFiredRef.current[selectedLesson.id] = true;
    setShowConfetti(true);
    // Auto-dismiss after animation completes (~3.5s max)
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [currentSlide, selectedLesson?.id, currentSlideData?.kind]);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  const outerHeightClass = previewMode
    ? 'h-[calc(100vh-3rem)]'   // 3rem = 48px preview banner (h-12)
    : 'h-[calc(100vh-6rem)]';  // 6rem = 96px student nav bar

  if (pageLoading) {
    return (
      <div className={`${outerHeightClass} flex flex-col overflow-hidden`}>
        <div className="shrink-0 h-16 bg-slate-200 animate-pulse" />
        <div className="flex-1 min-h-0 flex gap-3 p-3">
          <div className="hidden lg:flex flex-col gap-2 w-[260px] shrink-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-xl" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-xl" />
            <div className="flex-1 bg-slate-100 animate-pulse rounded-2xl" />
            <div className="shrink-0 flex justify-between">
              <div className="h-10 w-28 bg-slate-200 animate-pulse rounded-xl" />
              <div className="h-10 w-28 bg-slate-200 animate-pulse rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Course not found.</p>
          <Button onClick={() => router.push('/gansid/student')}>Back to Courses</Button>
        </CardContent></Card>
      </div>
    );
  }

  // Auto-enrollment is handled in fetchData; we never gate on enrollment here.

  // Only count progress for lessons in this course
  const lessonIdSet = new Set(lessons.map(l => l.id));
  const completedCount = Math.min(
    Object.entries(progress).filter(([id, p]) => p.completed && lessonIdSet.has(id)).length,
    lessons.length,
  );
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={`${outerHeightClass} flex flex-col overflow-hidden bg-[#F8FAFC]`}>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{existingReviewId ? 'Update Your Review' : 'Leave a Review'}</DialogTitle>
            <DialogDescription>Share your experience with &quot;{course.title}&quot;</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Your Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    className="cursor-pointer hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded">
                    <Star className={`h-7 w-7 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="What did you find most valuable? (optional)"
              value={reviewText} onChange={e => setReviewText(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={reviewLoading}>
              {reviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {existingReviewId ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dark header ────────────────────────────────────────────────────── */}
      <div className="bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-3 sm:py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-black text-white truncate">{course.title}</h2>
            <p className="text-slate-400 text-xs mt-0.5 line-clamp-1 hidden sm:block">{course.description}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex-1 bg-white/20 rounded-full h-1.5"
            role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}
            aria-label="Overall course progress">
            <div className="bg-[#0099CA] h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-white shrink-0">{progressPercent}%</span>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 sm:p-4 overflow-hidden">

        {/* Mobile lesson dropdown */}
        <div className="lg:hidden shrink-0 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500">
              Lesson {lessons.findIndex(l => l.id === selectedLesson?.id) + 1} of {lessons.length}
            </span>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {completedCount}/{lessons.length} completed
            </span>
          </div>
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              aria-label="Select lesson"
              value={selectedLesson?.id || ''}
              onChange={e => {
                const lesson = lessons.find(l => l.id === e.target.value);
                if (lesson) selectLesson(lesson);
              }}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-3 text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {lessons.map(lesson => (
                <option key={lesson.id} value={lesson.id}>
                  {progress[lesson.id]?.completed ? '✓ ' : ''}{lesson.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* "Show Lessons" toggle — desktop only, when sidebar collapsed */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            aria-label="Show lessons sidebar"
            className="hidden lg:flex items-center gap-1.5 shrink-0 self-start mt-1 text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded">
            <ChevronRight className="h-4 w-4" />Lessons
          </button>
        )}

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:flex flex-col shrink-0 min-h-0" style={{ width: '260px' }}>
            <Card className="flex flex-col h-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white">
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-slate-100 shrink-0">
                <CardTitle className="text-base font-black text-slate-900">Lessons</CardTitle>
                <button onClick={() => setSidebarOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors rounded focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2" aria-label="Collapse sidebar">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div role="list" aria-label="Course lessons" className="h-full overflow-y-auto divide-y divide-slate-100">
                  {lessons.map(lesson => (
                    <button key={lesson.id} role="listitem" onClick={() => selectLesson(lesson)}
                      aria-current={selectedLesson?.id === lesson.id ? 'true' : undefined}
                      aria-label={`${lesson.title}${progress[lesson.id]?.completed ? ' (completed)' : ''}`}
                      className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-blue-50 text-[#1E3A5F] border-l-2 border-[#1E3A5F]'
                          : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                      }`}
                    >
                      {progress[lesson.id]?.completed
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                      <span className="text-sm font-medium leading-snug">{lesson.title}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Slide viewer */}
        <div className="flex-1 min-h-0">
          <Card className="flex flex-col h-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white overflow-hidden">
            {selectedLesson ? (
              <div className="flex flex-col h-full">

                {/* Top bar: lesson label + counter + progress bar */}
                <div className="px-6 pt-5 pb-0 shrink-0 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-black uppercase tracking-widest text-[#1E3A5F] truncate pr-4">
                      {selectedLesson.title}
                    </span>
                    <span className="text-sm font-bold text-slate-500 shrink-0">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5"
                    role="progressbar" aria-valuenow={Math.round(((currentSlide + 1) / totalSlides) * 100)} aria-valuemin={0} aria-valuemax={100}
                    aria-label="Slide progress">
                    <div className="bg-[#1E3A5F] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }} />
                  </div>
                </div>

                {/* Slide content — fills remaining, scrolls internally */}
                <div
                  key={`${selectedLesson.id}-${currentSlide}`}
                  role="region" aria-label="Slide content"
                  className="flex-1 overflow-hidden flex flex-col"
                  style={{ animation: 'slideIn 0.25s ease-out' }}
                >

                  {/* TITLE SLIDE — full-height, non-scrollable */}
                  {currentSlideData?.kind === 'title' && (
                    <TitleSlide
                      lessonTitle={selectedLesson.title}
                      lessonDescription={selectedLesson.description}
                      titleImageUrl={selectedLesson.title_image_url}
                      courseDate={course?.created_at ? new Date(course.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }) : null}
                    />
                  )}

                  {/* CONTENT SLIDE — matches editor slide-preview.tsx rendering */}
                  {currentSlideData?.kind === 'page' && (() => {
                    const bgStyle = getSlideBackground(currentSlideData.settings);
                    const backgroundImage = typeof currentSlideData.settings?.background_image === 'string'
                      ? currentSlideData.settings.background_image : null;
                    return (
                      <div className="relative flex-1 overflow-y-auto" style={bgStyle}>
                        {backgroundImage && (
                          <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                          >
                            <div className="absolute inset-0 bg-black/20" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <SlideContentArea>
                            {currentSlideData.blocks.map(block => (
                              <LessonBlockRenderer key={block.id} block={block} lessonTitle={selectedLesson.title} onQuizCorrect={handleQuizCorrect} />
                            ))}
                          </SlideContentArea>
                        </div>
                      </div>
                    );
                  })()}

                  {/* COMPLETION SLIDE */}
                  {currentSlideData?.kind === 'completion' && (
                    <div className="relative flex flex-col items-center justify-center py-10 px-8 text-center gap-6 flex-1 overflow-y-auto">
                      {showConfetti && <Confetti />}
                      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center animate-bounce [animation-iteration-count:1] [animation-duration:0.8s]">
                        <Award className="h-10 w-10 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Lesson Complete</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedLesson.title}</h3>
                        <p className="text-slate-500 mt-2 text-base">Congratulations! You&apos;ve completed this lesson.</p>
                      </div>
                      <div className="flex flex-wrap gap-3 justify-center">
                        {lessonQuizzes[selectedLesson.id] && (
                          <Button variant="outline"
                            onClick={() => router.push(`/student/courses/${courseId}/lessons/${selectedLesson.id}/quiz`)}
                            className="border-[#1E3A5F] text-[#1E3A5F] font-bold hover:bg-[#1E3A5F]/10">
                            <Play className="mr-2 h-4 w-4" />Take Quiz
                          </Button>
                        )}
                        {!previewMode && lessons.findIndex(l => l.id === selectedLesson.id) === lessons.length - 1 && (
                          <Button variant="outline" onClick={openReviewModal}
                            className="border-yellow-400 text-yellow-700 font-bold hover:bg-yellow-50">
                            <Star className="mr-2 h-4 w-4" />Leave a Review
                          </Button>
                        )}
                        {(() => {
                          const idx = lessons.findIndex(l => l.id === selectedLesson.id);
                          const next = lessons[idx + 1];
                          return next ? (
                            <Button onClick={() => selectLesson(next)}
                              disabled={!allQuizzesComplete}
                              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                              Next Lesson<ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button onClick={() => router.push('/gansid/student')}
                              className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold">
                              Back to Dashboard
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom navigation — always visible, never moves */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
                  <Button variant="outline" onClick={goPrev} disabled={isFirstSlide}
                    aria-label="Previous slide"
                    className="border-slate-200 text-slate-600 font-bold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2">
                    <ChevronLeft className="h-4 w-4 mr-1.5" />Previous
                  </Button>
                  {!isLastSlide && (
                    <Button onClick={goNext}
                      disabled={nextBlocked}
                      aria-label="Next slide"
                      className="bg-[#1E3A5F] hover:bg-[#0F172A] text-white font-bold focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed">
                      Next<ChevronRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-700 mb-2">Ready to Learn?</h3>
                <p className="text-slate-400 font-medium text-sm max-w-xs text-center">
                  Select a lesson from the sidebar to start this module.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
