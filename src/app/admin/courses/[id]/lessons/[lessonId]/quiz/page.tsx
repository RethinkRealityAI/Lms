'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X, Check, ArrowLeft } from 'lucide-react';
import type { Quiz, Question } from '@/types';

export default function QuizPage({
  params: paramsPromise
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const params = React.use(paramsPromise);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
    let { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', params.lessonId)
      .single();

    if (!quizData) {
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

  const resetForm = () => {
    setQuestionData({
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
    });
    setShowQuestionForm(false);
    setEditingQuestionId(null);
  };

  const validateForm = (): boolean => {
    if (!questionData.question_text.trim()) {
      toast.error('Question text is required');
      return false;
    }
    if (questionData.question_type === 'mcq') {
      const filledOptions = questionData.options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        toast.error('At least 2 options are required');
        return false;
      }
      if (!questionData.correct_answer) {
        toast.error('Please select a correct answer');
        return false;
      }
      if (!questionData.options.includes(questionData.correct_answer)) {
        toast.error('Correct answer must match one of the options');
        return false;
      }
    } else {
      if (!questionData.correct_answer.trim()) {
        toast.error('Correct answer is required');
        return false;
      }
    }
    return true;
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !validateForm()) return;

    try {
      const { error } = await supabase
        .from('questions')
        .insert([{
          quiz_id: quiz.id,
          question_text: questionData.question_text.trim(),
          question_type: questionData.question_type,
          options: questionData.question_type === 'mcq' ? questionData.options.filter((o) => o.trim()) : null,
          correct_answer: questionData.correct_answer.trim(),
          order_index: questions.length,
        }]);

      if (error) throw error;

      toast.success('Question added');
      resetForm();
      fetchQuestions(quiz.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to create question', { description: msg });
    }
  };

  const startEditing = (question: Question) => {
    setEditingQuestionId(question.id);
    setQuestionData({
      question_text: question.question_text,
      question_type: question.question_type as 'mcq' | 'fill_blank',
      options: question.options?.length ? [...question.options] : ['', '', '', ''],
      correct_answer: question.correct_answer ?? '',
    });
    setShowQuestionForm(false);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestionId || !quiz || !validateForm()) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: questionData.question_text.trim(),
          question_type: questionData.question_type,
          options: questionData.question_type === 'mcq' ? questionData.options.filter((o) => o.trim()) : null,
          correct_answer: questionData.correct_answer.trim(),
        })
        .eq('id', editingQuestionId);

      if (error) throw error;

      toast.success('Question updated');
      resetForm();
      fetchQuestions(quiz.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to update question', { description: msg });
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', deleteTarget);

      if (error) throw error;
      toast.success('Question deleted');
      if (quiz) fetchQuestions(quiz.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to delete question', { description: msg });
    } finally {
      setDeleteTarget(null);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...questionData.options];
    newOptions[index] = value;
    setQuestionData({ ...questionData, options: newOptions });
  };

  const isEditing = editingQuestionId !== null;

  const questionForm = (
    <form onSubmit={isEditing ? handleUpdateQuestion : handleCreateQuestion} className="space-y-4 mb-6 p-4 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{isEditing ? 'Edit Question' : 'New Question'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="question-type">Question Type</Label>
        <select
          id="question-type"
          value={questionData.question_type}
          onChange={(e) => setQuestionData({
            ...questionData,
            question_type: e.target.value as 'mcq' | 'fill_blank',
            options: e.target.value === 'mcq' ? ['', '', '', ''] : [],
            correct_answer: '',
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
        <div className="space-y-2">
          <Label>Options</Label>
          {questionData.options.map((option, index) => (
            <Input
              key={index}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuestionData({ ...questionData, options: [...questionData.options, ''] })}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Option
          </Button>
        </div>
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
            {questionData.options.filter((o) => o.trim()).map((option, index) => (
              <option key={index} value={option}>{option}</option>
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
        <Button type="submit">
          <Check className="h-4 w-4 mr-1" />
          {isEditing ? 'Save Changes' : 'Add Question'}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
      </div>
    </form>
  );

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quiz Questions</CardTitle>
          {!showQuestionForm && !isEditing && (
            <Button onClick={() => setShowQuestionForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(showQuestionForm || isEditing) && questionForm}

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className={`p-4 border rounded-lg ${editingQuestionId === question.id ? 'border-blue-300 bg-blue-50/30' : ''}`}>
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
                            {option === question.correct_answer && ' \u2713'}
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(question)}
                      disabled={isEditing}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(question.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
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

      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
