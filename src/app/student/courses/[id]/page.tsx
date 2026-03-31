'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, Circle, Play, LogOut, Loader2, Star, Send,
  ChevronLeft, ChevronRight, ChevronDown, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson, LessonBlock, Progress as ProgressType } from '@/types';
import { LessonBlockRenderer, createFallbackBlockFromLesson } from '@/components/lesson-block-renderer';
import { sortBlocks } from '@/lib/content/lesson-blocks';

// ---------------------------------------------------------------------------
// Slide types
// ---------------------------------------------------------------------------
type Slide =
  | { kind: 'title' }
  | { kind: 'block'; block: LessonBlock }
  | { kind: 'completion' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StudentCoursePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressType>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<Record<string, LessonBlock[]>>({});
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [lessonQuizzes, setLessonQuizzes] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  // Slide viewer
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoCompleteFired, setAutoCompleteFired] = useState<Record<string, boolean>>({});
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { fetchData(); }, [params.id]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPageLoading(false); return; }

      const { data: courseData } = await supabase.from('courses').select('*').eq('id', params.id).single();
      if (courseData) setCourse(courseData);

      const { data: enrollment } = await supabase.from('course_enrollments').select('*')
        .eq('user_id', user.id).eq('course_id', params.id).single();
      setIsEnrolled(!!enrollment);

      const { data: lessonsData } = await supabase.from('lessons').select('*')
        .eq('course_id', params.id).order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
        if (lessonsData.length > 0 && !selectedLesson) setSelectedLesson(lessonsData[0]);

        const lessonIds = lessonsData.map(l => l.id);
        if (lessonIds.length > 0) {
          // TODO: When migrating to slide-based content, filter by slides.status = 'published'
          // before fetching lesson_blocks via slide_id.
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

          const { data: quizzesData } = await supabase.from('quizzes').select('lesson_id').in('lesson_id', lessonIds);
          if (quizzesData) {
            const qm: Record<string, boolean> = {};
            quizzesData.forEach(q => { qm[q.lesson_id] = true; });
            setLessonQuizzes(qm);
          }
        }
      }

      if (enrollment) {
        const { data: progressData } = await supabase.from('progress').select('*').eq('user_id', user.id);
        if (progressData) {
          const pm: Record<string, ProgressType> = {};
          progressData.forEach(p => { pm[p.lesson_id] = p; });
          setProgress(pm);
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
  const handleEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from('course_enrollments').insert([{ user_id: user.id, course_id: params.id }]);
      if (error) throw error;
      toast.success('Enrolled successfully!');
      setIsEnrolled(true);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to enroll', { description: err.message });
    }
  };

  const handleMarkComplete = useCallback(async () => {
    if (!selectedLesson) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { error } = await supabase.from('progress').upsert([{
        user_id: user.id, lesson_id: selectedLesson.id,
        completed: true, completed_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      toast.success('Lesson completed!', { description: 'Great job! Keep learning.' });

      const updatedProgress = { ...progress, [selectedLesson.id]: {
        id: '', user_id: user.id, lesson_id: selectedLesson.id,
        completed: true, completed_at: new Date().toISOString(),
      }};

      const allCompleted = lessons.every(l => updatedProgress[l.id]?.completed);
      if (allCompleted && lessons.length > 0) {
        const { data: existingCert } = await supabase.from('certificates').select('id')
          .eq('user_id', user.id).eq('course_id', params.id).single();
        if (!existingCert) {
          const { error: certError } = await supabase.from('certificates').insert([{
            user_id: user.id, course_id: params.id, issued_at: new Date().toISOString(),
          }]);
          if (!certError) {
            toast.success('Course Completed! 🎉', {
              description: 'A certificate has been issued. View it in your Certificates page.',
              duration: 6000,
            });
          }
        }
      }
      fetchData();
    } catch (err: any) {
      toast.error('Failed to mark lesson as complete', { description: err.message });
    }
  }, [selectedLesson, progress, lessons, params.id]);

  const handleUnenroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase.from('course_enrollments').delete()
        .eq('user_id', user.id).eq('course_id', params.id);
      if (error) throw error;
      const lessonIds = lessons.map(l => l.id);
      if (lessonIds.length > 0) {
        await supabase.from('progress').delete().eq('user_id', user.id).in('lesson_id', lessonIds);
      }
      toast.success('Unenrolled successfully');
      router.push('/student');
    } catch (err: any) {
      toast.error('Failed to unenroll', { description: err.message });
    } finally {
      setUnenrolling(false);
      setShowUnenrollDialog(false);
    }
  };

  const openReviewModal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('course_reviews').select('id, rating, review_text')
      .eq('course_id', params.id).eq('user_id', user.id).single();
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
          course_id: params.id, user_id: user.id, rating: reviewRating, review_text: reviewText,
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
  // Slide helpers
  // ---------------------------------------------------------------------------
  const getLessonBlocks = (lesson: Lesson): LessonBlock[] => {
    const blocks = lessonBlocks[lesson.id];
    if (blocks && blocks.length > 0) {
      return blocks.filter(b => !(b.block_type === 'cta' && (b.data as Record<string, unknown>)?.action === 'complete_lesson'));
    }
    return [createFallbackBlockFromLesson(lesson)];
  };

  const currentSlides: Slide[] = selectedLesson
    ? [{ kind: 'title' }, ...getLessonBlocks(selectedLesson).map(block => ({ kind: 'block' as const, block })), { kind: 'completion' }]
    : [];

  const totalSlides = currentSlides.length;
  const currentSlideData = currentSlides[currentSlide] ?? null;
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === totalSlides - 1;

  const goNext = useCallback(() => setCurrentSlide(i => Math.min(i + 1, totalSlides - 1)), [totalSlides]);
  const goPrev = useCallback(() => setCurrentSlide(i => Math.max(i - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedLesson) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLesson, goNext, goPrev]);

  // Auto-mark complete when completion slide reached
  useEffect(() => {
    if (!selectedLesson) return;
    if (currentSlideData?.kind !== 'completion') return;
    if (progress[selectedLesson.id]?.completed) return;
    if (autoCompleteFired[selectedLesson.id]) return;
    setAutoCompleteFired(prev => ({ ...prev, [selectedLesson.id]: true }));
    handleMarkComplete();
  }, [currentSlide, selectedLesson?.id]);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Course not found.</p>
          <Button onClick={() => router.push('/student')}>Back to Courses</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardHeader><CardTitle>{course.title}</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4 text-slate-600">{course.description}</p>
            <Button onClick={handleEnroll}>Enroll in this course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden bg-[#F8FAFC]">

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unenroll from Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to unenroll from &quot;{course.title}&quot;? Your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnenrollDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Unenroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    className="cursor-pointer hover:scale-110 transition-transform">
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
          <Button variant="outline" size="sm" onClick={() => setShowUnenrollDialog(true)}
            className="shrink-0 border-white/30 text-white hover:bg-white/10 hover:text-white text-xs">
            <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Unenroll</span>
          </Button>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex-1 bg-white/20 rounded-full h-1.5">
            <div className="bg-[#0099CA] h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-bold text-white shrink-0">{progressPercent}%</span>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 sm:p-4 overflow-hidden">

        {/* Mobile lesson dropdown */}
        <div className="lg:hidden shrink-0">
          <div className="relative">
            <select
              value={selectedLesson?.id || ''}
              onChange={e => {
                const lesson = lessons.find(l => l.id === e.target.value);
                if (lesson) selectLesson(lesson);
              }}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
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
            className="hidden lg:flex items-center gap-1.5 shrink-0 self-start mt-1 text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
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
                  className="text-slate-400 hover:text-slate-700 transition-colors" aria-label="Collapse sidebar">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto divide-y divide-slate-100">
                  {lessons.map(lesson => (
                    <button key={lesson.id} onClick={() => selectLesson(lesson)}
                      className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-red-50 text-[#DC2626] border-l-2 border-[#DC2626]'
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
                    <span className="text-sm font-black uppercase tracking-widest text-[#DC2626] truncate pr-4">
                      {selectedLesson.title}
                    </span>
                    <span className="text-sm font-bold text-slate-500 shrink-0">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-[#DC2626] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }} />
                  </div>
                </div>

                {/* Slide content — fills remaining, scrolls internally */}
                <div className="flex-1 overflow-hidden flex flex-col">

                  {/* TITLE SLIDE */}
                  {currentSlideData?.kind === 'title' && (
                    <div className="flex flex-col flex-1 overflow-y-auto">
                      <div className="w-full aspect-video bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 opacity-10"
                          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        <div className="text-center px-8 relative z-10">
                          <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-2">GANSID Learning</p>
                          <h2 className="text-white text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
                            {selectedLesson.title}
                          </h2>
                        </div>
                      </div>
                      <div className="px-7 py-7 flex-1">
                        {selectedLesson.description && (
                          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-6">
                            {selectedLesson.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 pt-5 border-t border-slate-100">
                          <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-sm font-black shrink-0">G</div>
                          <div>
                            <p className="text-base font-bold text-slate-800">GANSID</p>
                            <p className="text-sm text-slate-400">Global Action Network for Sickle Cell &amp; Inherited Blood Disorders</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTENT SLIDE */}
                  {currentSlideData?.kind === 'block' && (
                    <div className="px-8 py-8 overflow-y-auto flex-1 flex flex-col">
                      <LessonBlockRenderer block={currentSlideData.block} lessonTitle={selectedLesson.title} />
                    </div>
                  )}

                  {/* COMPLETION SLIDE */}
                  {currentSlideData?.kind === 'completion' && (
                    <div className="flex flex-col items-center justify-center py-10 px-8 text-center gap-6 flex-1 overflow-y-auto">
                      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
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
                            onClick={() => router.push(`/student/courses/${params.id}/lessons/${selectedLesson.id}/quiz`)}
                            className="border-[#1E3A5F] text-[#1E3A5F] font-bold hover:bg-[#1E3A5F]/10">
                            <Play className="mr-2 h-4 w-4" />Take Quiz
                          </Button>
                        )}
                        <Button variant="outline" onClick={openReviewModal}
                          className="border-yellow-400 text-yellow-700 font-bold hover:bg-yellow-50">
                          <Star className="mr-2 h-4 w-4" />Leave a Review
                        </Button>
                        {(() => {
                          const idx = lessons.findIndex(l => l.id === selectedLesson.id);
                          const next = lessons[idx + 1];
                          return next ? (
                            <Button onClick={() => selectLesson(next)}
                              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold">
                              Next Lesson<ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button onClick={() => router.push('/student')}
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
                    className="border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                    <ChevronLeft className="h-4 w-4 mr-1.5" />Previous
                  </Button>
                  {!isLastSlide && (
                    <Button onClick={goNext}
                      className="bg-[#1E3A5F] hover:bg-[#0F172A] text-white font-bold">
                      Next<ChevronRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                Select a lesson to begin
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
