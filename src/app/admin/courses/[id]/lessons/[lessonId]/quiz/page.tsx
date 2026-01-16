'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { Quiz, Question } from '@/types';

export default function QuizPage({ 
  params 
}: { 
  params: { id: string; lessonId: string } 
}) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionData, setQuestionData] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'fill_blank',
    options: ['', '', '', ''],
    correct_answer: '',
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchQuiz();
  }, [params.lessonId]);

  const fetchQuiz = async () => {
    // Check if quiz exists
    let { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', params.lessonId)
      .single();

    if (!quizData) {
      // Create quiz if doesn't exist
      const { data: newQuiz } = await supabase
        .from('quizzes')
        .insert([{ lesson_id: params.lessonId, title: 'Lesson Quiz' }])
        .select()
        .single();
      
      quizData = newQuiz;
    }

    if (quizData) {
      setQuiz(quizData);
      fetchQuestions(quizData.id);
    }
  };

  const fetchQuestions = async (quizId: string) => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    
    if (data) setQuestions(data);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    try {
      const { error } = await supabase
        .from('questions')
        .insert([
          {
            quiz_id: quiz.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            options: questionData.question_type === 'mcq' ? questionData.options : null,
            correct_answer: questionData.correct_answer,
            order_index: questions.length,
          }
        ]);

      if (error) throw error;

      setQuestionData({
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
      });
      setShowQuestionForm(false);
      fetchQuestions(quiz.id);
    } catch (error: any) {
      alert('Error creating question: ' + error.message);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      if (quiz) fetchQuestions(quiz.id);
    } catch (error: any) {
      alert('Error deleting question: ' + error.message);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...questionData.options];
    newOptions[index] = value;
    setQuestionData({ ...questionData, options: newOptions });
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          ← Back to Course
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quiz Questions</CardTitle>
          <Button onClick={() => setShowQuestionForm(!showQuestionForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent>
          {showQuestionForm && (
            <form onSubmit={handleCreateQuestion} className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="question-type">Question Type</Label>
                <select
                  id="question-type"
                  value={questionData.question_type}
                  onChange={(e) => setQuestionData({ 
                    ...questionData, 
                    question_type: e.target.value as 'mcq' | 'fill_blank',
                    options: e.target.value === 'mcq' ? ['', '', '', ''] : [],
                  })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-text">Question</Label>
                <Textarea
                  id="question-text"
                  value={questionData.question_text}
                  onChange={(e) => setQuestionData({ ...questionData, question_text: e.target.value })}
                  required
                />
              </div>
              {questionData.question_type === 'mcq' && (
                <>
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {questionData.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="correct-answer">Correct Answer</Label>
                {questionData.question_type === 'mcq' ? (
                  <select
                    id="correct-answer"
                    value={questionData.correct_answer}
                    onChange={(e) => setQuestionData({ ...questionData, correct_answer: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select correct answer</option>
                    {questionData.options.map((option, index) => (
                      <option key={index} value={option}>
                        {option || `Option ${index + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="correct-answer"
                    value={questionData.correct_answer}
                    onChange={(e) => setQuestionData({ ...questionData, correct_answer: e.target.value })}
                    placeholder="Enter correct answer"
                    required
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Question</Button>
                <Button type="button" variant="outline" onClick={() => setShowQuestionForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Q{index + 1}.</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {question.question_type === 'mcq' ? 'Multiple Choice' : 'Fill in the Blank'}
                      </span>
                    </div>
                    <p className="mb-2">{question.question_text}</p>
                    {question.options && (
                      <ul className="space-y-1 mb-2">
                        {question.options.map((option, i) => (
                          <li 
                            key={i}
                            className={`text-sm pl-4 ${option === question.correct_answer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                            {option === question.correct_answer && ' ✓'}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!question.options && (
                      <p className="text-sm text-green-600 font-medium pl-4">
                        Answer: {question.correct_answer}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuestion(question.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {questions.length === 0 && !showQuestionForm && (
              <p className="text-center text-muted-foreground py-8">
                No questions yet. Add your first question!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
