'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Quiz, Question } from '@/types';

export default function StudentQuizPage({ 
  params 
}: { 
  params: { id: string; lessonId: string } 
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkEnrollmentAndFetchQuiz();
  }, [params.id, params.lessonId]);

  const checkEnrollmentAndFetchQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to take quizzes.');
        setLoading(false);
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', params.id)
        .single();

      if (!enrollment) {
        setError('You must be enrolled in this course to take quizzes.');
        setIsEnrolled(false);
        setLoading(false);
        return;
      }

      setIsEnrolled(true);

      // Fetch quiz
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
        
        if (questionsData) {
          setQuestions(questionsData);
        }
      }
    } catch (err) {
      setError('An error occurred while loading the quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    let correctCount = 0;
    
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer && userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    // Save quiz attempt
    const { data: { user } } = await supabase.auth.getUser();
    if (user && quiz) {
      await supabase
        .from('quiz_attempts')
        .insert([
          {
            user_id: user.id,
            quiz_id: quiz.id,
            score: correctCount,
            total_questions: questions.length,
          }
        ]);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !isEnrolled) {
    return (
      <div className="px-4 sm:px-0">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium mb-4">{error || 'Access denied'}</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/student/courses/${params.id}`)}
            >
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="px-4 sm:px-0">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No quiz available for this lesson yet.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push(`/student/courses/${params.id}`)}
            >
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push(`/student/courses/${params.id}`)}>
          ← Back to Course
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
          {submitted && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <p className="text-lg font-semibold">
                Your Score: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {questions.map((question, index) => {
              const userAnswer = answers[question.id];
              const isCorrect = submitted && userAnswer?.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
              const isIncorrect = submitted && userAnswer && !isCorrect;

              return (
                <div
                  key={question.id}
                  className={`p-4 border rounded-lg ${
                    submitted
                      ? isCorrect
                        ? 'border-green-500 bg-green-50'
                        : isIncorrect
                        ? 'border-red-500 bg-red-50'
                        : ''
                      : ''
                  }`}
                >
                  <p className="font-semibold mb-3">
                    Q{index + 1}. {question.question_text}
                  </p>

                  {question.question_type === 'mcq' && question.options ? (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const isSelected = answers[question.id] === option;
                        const isCorrectOption = submitted && option === question.correct_answer;

                        return (
                          <label
                            key={optIndex}
                            className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                              submitted
                                ? isCorrectOption
                                  ? 'border-green-500 bg-green-100'
                                  : isSelected && !isCorrectOption
                                  ? 'border-red-500 bg-red-100'
                                  : ''
                                : isSelected
                                ? 'border-primary bg-primary/10'
                                : 'hover:bg-accent'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              checked={isSelected}
                              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                              disabled={submitted}
                              className="mr-3"
                            />
                            <span>{String.fromCharCode(65 + optIndex)}. {option}</span>
                            {submitted && isCorrectOption && (
                              <span className="ml-auto text-green-600 font-semibold">✓</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      value={answers[question.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                      placeholder="Enter your answer"
                      disabled={submitted}
                      className={submitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : ''}
                    />
                  )}

                  {submitted && (
                    <div className="mt-3">
                      {isCorrect ? (
                        <p className="text-green-600 font-medium">✓ Correct!</p>
                      ) : (
                        <p className="text-red-600 font-medium">
                          ✗ Incorrect. Correct answer: {question.correct_answer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-4">
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== questions.length}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button onClick={handleRetry}>
                Retry Quiz
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/student/courses/${params.id}`)}
            >
              Back to Course
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
