'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle, XCircle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quiz, Question } from '@/types';

export default function StudentQuizPage({
  params: paramsPromise
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const params = React.use(paramsPromise);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchQuiz();
  }, [params.id, params.lessonId]);

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to take quizzes.');
        setLoading(false);
        return;
      }

      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', params.id)
        .single();

      if (!enrollment) {
        setError('You must be enrolled in this course to take quizzes.');
        setLoading(false);
        return;
      }

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', params.lessonId)
        .single();

      if (quizData) {
        setQuiz(quizData);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizData.id)
          .order('order_index', { ascending: true });
        if (questionsData) setQuestions(questionsData);
      }
    } catch {
      setError('An error occurred while loading the quiz.');
    } finally {
      setLoading(false);
    }
  };

  const [animatingAnswer, setAnimatingAnswer] = useState<string | null>(null);
  const [questionKey, setQuestionKey] = useState(0);
  const prevIndexRef = useRef(currentIndex);

  // Track question transitions for fade-in animation
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      setQuestionKey(k => k + 1);
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

  const handleSelectAnswer = (answer: string) => {
    if (!submitted) {
      setAnimatingAnswer(answer);
      setTimeout(() => setAnimatingAnswer(null), 200);
      setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: answer }));
    }
  };

  const handleSubmit = async () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id]?.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase()) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setSubmitted(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && quiz) {
      const { count } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('quiz_id', quiz.id);

      await supabase.from('quiz_attempts').insert([{
        user_id: user.id,
        quiz_id: quiz.id,
        score: correctCount,
        total_questions: questions.length,
        attempt_number: (count ?? 0) + 1,
        status: 'completed',
        max_score: questions.length,
        percentage: Math.round((correctCount / questions.length) * 100),
        time_started: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }]);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setCurrentIndex(0);
  };

  // Keyboard shortcuts: 1-4 to select answers, Enter to advance
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (submitted && currentIndex === questions.length) return; // results screen
    if (!questions.length) return;

    const q = questions[currentIndex];
    const opts = q?.options ?? [];
    const numKey = parseInt(e.key, 10);

    if (numKey >= 1 && numKey <= opts.length && !submitted) {
      e.preventDefault();
      handleSelectAnswer(opts[numKey - 1]);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const currentAns = answers[q?.id];
      const isLast = currentIndex === questions.length - 1;

      if (isLast) {
        if (submitted) {
          setCurrentIndex(questions.length);
        } else if (Object.keys(answers).length >= questions.length) {
          handleSubmit();
          setCurrentIndex(questions.length);
        }
      } else if (currentAns || submitted) {
        setCurrentIndex(i => i + 1);
      }
    }
  }, [currentIndex, questions, answers, submitted]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Progress bar skeleton */}
        <div className="h-2 w-full bg-slate-200 animate-pulse rounded-full" />
        {/* Question card skeleton */}
        <div className="h-32 w-full bg-blue-100 animate-pulse rounded-xl" />
        {/* Answer option skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full bg-slate-200 animate-pulse rounded-xl" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
        {/* Nav buttons skeleton */}
        <div className="flex justify-between pt-4">
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-xl" />
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push(`/student/courses/${params.id}`)}>
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No quiz available for this lesson yet.</p>
            <Button className="mt-4" variant="outline" onClick={() => router.push(`/student/courses/${params.id}`)}>
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const percentage = Math.round((score / questions.length) * 100);
  const passed = percentage >= (quiz.passing_score_percentage ?? 70);

  // Results screen
  if (submitted && currentIndex === questions.length) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.push(`/student/courses/${params.id}`)}
            className="mb-6 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white overflow-hidden">
            <CardContent className="py-10 text-center space-y-4">
              {passed ? (
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 opacity-20 animate-pulse" />
                  <CheckCircle className="h-16 w-16 text-green-500 relative z-10" />
                </div>
              ) : (
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              )}
              <h2 className="text-2xl font-black text-slate-900">
                {passed ? (
                  <span>Great work! <span className="inline-block animate-bounce">&#127881;</span></span>
                ) : (
                  'Keep practicing!'
                )}
              </h2>
              <p className="text-slate-500 font-medium">{quiz.title}</p>
              {passed ? (
                <div className="inline-block rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 px-8 py-4">
                  <div className="text-5xl font-black text-emerald-600">{percentage}%</div>
                </div>
              ) : (
                <div className="text-5xl font-black text-[#2563EB]">{percentage}%</div>
              )}
              <p className="text-slate-500">{score} of {questions.length} correct</p>
              <p className="text-xs text-slate-400">You needed {quiz.passing_score_percentage ?? 70}% to pass</p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={handleRetry} variant="outline" className="border-slate-200 font-bold text-slate-700">Try Again</Button>
                <Button onClick={() => router.push(`/student/courses/${params.id}`)} className="bg-[#2563EB] hover:bg-[#1D4ED8] font-bold">Back to Course</Button>
              </div>
            </CardContent>
          </Card>

          {/* Answer review */}
          <div className="mt-6 space-y-3">
            {questions.map((q, i) => {
              const a = answers[q.id];
              const correct = a?.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();
              return (
                <Card key={q.id} className={cn('border-none shadow-sm', correct ? 'bg-green-50' : 'bg-red-50')}>
                  <CardContent className="py-4">
                    <p className="font-bold text-sm text-slate-900 mb-2">Q{i + 1}. {q.question_text}</p>
                    <p className={cn('text-sm font-medium', correct ? 'text-green-700' : 'text-red-700')}>
                      Your answer: {a ?? '(no answer)'}
                    </p>
                    {!correct && (
                      <p className="text-sm font-medium text-green-700 mt-1">Correct: {q.correct_answer}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // One-question-at-a-time view
  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/student/courses/${params.id}`)}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <span className="text-slate-500 text-sm font-bold">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2"
          role="progressbar"
          aria-valuenow={Math.round(((currentIndex + (currentAnswer ? 1 : 0)) / questions.length) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Quiz progress">
          <div
            className="bg-[#2563EB] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + (currentAnswer ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* Passing score hint */}
        <p className="text-xs text-slate-400 mb-6">
          Passing score: {quiz.passing_score_percentage ?? 70}%
        </p>

        {/* Question card + answers — fade in on question change */}
        <div
          key={questionKey}
          className="animate-[fadeIn_0.3s_ease-out]"
          style={{ animationFillMode: 'both' }}
        >
          {/* Question card — blue with white text */}
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.1)] border-none bg-[#2563EB] mb-4">
            <CardHeader>
              <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-1">{quiz.title}</p>
              <CardTitle className="text-xl leading-snug text-white font-black">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Answer options — white with black text */}
          <div className="space-y-3">
            {(currentQuestion.options ?? []).map((option, i) => {
              const isSelected = currentAnswer === option;
              const isCorrectOption = option === currentQuestion.correct_answer;
              const showResult = submitted;
              const isAnimating = animatingAnswer === option;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectAnswer(option)}
                  disabled={showResult}
                  aria-label={`Option ${String.fromCharCode(65 + i)}: ${option}`}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
                    !showResult && !isSelected && 'border-slate-200 hover:border-[#2563EB] hover:shadow-sm',
                    !showResult && isSelected && 'border-[#2563EB] bg-blue-50 font-bold',
                    showResult && isCorrectOption && 'border-green-500 bg-green-50',
                    showResult && isSelected && !isCorrectOption && 'border-red-500 bg-red-50',
                    showResult && !isSelected && !isCorrectOption && 'opacity-40',
                    isAnimating && 'animate-[selectPop_0.2s_ease-in-out]',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span><span className="font-bold mr-2 text-[#2563EB]">{String.fromCharCode(65 + i)}.</span>{option}</span>
                    {showResult && isCorrectOption && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                    {showResult && isSelected && !isCorrectOption && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            aria-label="Previous question"
            className="border-slate-200 text-slate-600 font-bold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={() => {
                if (!submitted) handleSubmit();
                setCurrentIndex(questions.length);
              }}
              disabled={answeredCount < questions.length && !submitted}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold shadow-lg shadow-blue-100 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              {submitted ? 'View Results' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={!currentAnswer && !submitted}
              aria-label="Next question"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold shadow-lg shadow-blue-100 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs text-slate-400 mt-4 hidden sm:block">
          Press 1&ndash;{Math.min((currentQuestion.options ?? []).length, 9)} to answer, Enter to continue
        </p>
      </div>

      {/* Custom keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes selectPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      ` }} />
    </div>
  );
}
