'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, Circle, Play, LogOut, Loader2, Star, Send, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson, Progress as ProgressType, CourseReview } from '@/types';

interface ReviewWithUser extends Omit<CourseReview, 'user'> {
  user?: {
    full_name?: string;
    avatar_url?: string;
    email: string;
  };
}

export default function StudentCoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressType>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [userReview, setUserReview] = useState<ReviewWithUser | null>(null);
  const [newReview, setNewReview] = useState({ rating: 0, review_text: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    fetchReviews();
  }, [params.id]);

  const fetchData = async () => {
    setPageLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPageLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Fetch course
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (courseData) setCourse(courseData);

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', params.id)
        .single();
      
      setIsEnrolled(!!enrollment);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', params.id)
        .order('order_index', { ascending: true });
      
      if (lessonsData) {
        setLessons(lessonsData);
        if (lessonsData.length > 0 && !selectedLesson) {
          setSelectedLesson(lessonsData[0]);
        }
      }

      // Fetch progress
      if (enrollment) {
        const { data: progressData } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.id);
        
        if (progressData) {
          const progressMap: Record<string, ProgressType> = {};
          progressData.forEach(p => {
            progressMap[p.lesson_id] = p;
          });
          setProgress(progressMap);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const fetchReviews = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: reviewsData } = await supabase
      .from('course_reviews')
      .select('*, user:users(full_name, avatar_url, email)')
      .eq('course_id', params.id)
      .order('created_at', { ascending: false });

    if (reviewsData) {
      setReviews(reviewsData as ReviewWithUser[]);
      
      if (user) {
        const myReview = reviewsData.find((r: any) => r.user_id === user.id);
        if (myReview) {
          setUserReview(myReview as ReviewWithUser);
          setNewReview({ rating: myReview.rating, review_text: myReview.review_text || '' });
        }
      }
    }
  };

  const handleEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert([{ user_id: user.id, course_id: params.id }]);

      if (error) throw error;

      toast.success('Enrolled successfully!', {
        description: 'You can now access all course lessons',
      });
      setIsEnrolled(true);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to enroll', {
        description: error.message,
      });
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedLesson) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('progress')
        .upsert([
          {
            user_id: user.id,
            lesson_id: selectedLesson.id,
            completed: true,
            completed_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

      toast.success('Lesson completed!', {
        description: 'Great job! Keep learning.',
      });

      // Check if all lessons are now completed
      const updatedProgress = { ...progress };
      updatedProgress[selectedLesson.id] = {
        id: '',
        user_id: user.id,
        lesson_id: selectedLesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
      };

      const allCompleted = lessons.every(lesson => updatedProgress[lesson.id]?.completed);
      
      if (allCompleted && lessons.length > 0) {
        // Check if certificate already exists
        const { data: existingCert } = await supabase
          .from('certificates')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', params.id)
          .single();

        if (!existingCert) {
          // Generate certificate
          const { error: certError } = await supabase
            .from('certificates')
            .insert([{
              user_id: user.id,
              course_id: params.id,
              issued_at: new Date().toISOString(),
            }]);

          if (!certError) {
            toast.success('Congratulations! Course Completed!', {
              description: 'A certificate has been issued for this course. View it in your Certificates page.',
              duration: 6000,
            });
          }
        }
      }

      fetchData();
    } catch (error: any) {
      toast.error('Failed to mark lesson as complete', {
        description: error.message,
      });
    }
  };

  const handleUnenroll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUnenrolling(true);

    try {
      // Delete enrollment
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', params.id);

      if (enrollError) throw enrollError;

      // Delete progress for this course's lessons
      const lessonIds = lessons.map(l => l.id);
      if (lessonIds.length > 0) {
        await supabase
          .from('progress')
          .delete()
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);
      }

      toast.success('Unenrolled successfully', {
        description: 'You have been removed from this course.',
      });

      router.push('/student');
    } catch (error: any) {
      toast.error('Failed to unenroll', {
        description: error.message,
      });
    } finally {
      setUnenrolling(false);
      setShowUnenrollDialog(false);
    }
  };

  const handleSubmitReview = async () => {
    if (newReview.rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setReviewLoading(true);

    try {
      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('course_reviews')
          .update({
            rating: newReview.rating,
            review_text: newReview.review_text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
        toast.success('Review updated successfully');
      } else {
        // Create new review
        const { error } = await supabase
          .from('course_reviews')
          .insert([{
            course_id: params.id,
            user_id: user.id,
            rating: newReview.rating,
            review_text: newReview.review_text,
          }]);

        if (error) throw error;
        toast.success('Review submitted successfully');
      }

      setEditingReview(false);
      fetchReviews();
    } catch (error: any) {
      toast.error('Failed to submit review', { description: error.message });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    try {
      const { error } = await supabase
        .from('course_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      toast.success('Review deleted');
      setUserReview(null);
      setNewReview({ rating: 0, review_text: '' });
      fetchReviews();
    } catch (error: any) {
      toast.error('Failed to delete review', { description: error.message });
    }
  };

  const StarRating = ({ rating, onRate, readonly = false }: { rating: number; onRate?: (r: number) => void; readonly?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRate?.(star)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
        >
          <Star
            className={`h-5 w-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );

  const renderContent = (lesson: Lesson) => {
    switch (lesson.content_type) {
      case 'video':
        return (
          <video
            src={lesson.content_url}
            controls
            className="w-full rounded-lg"
            style={{ maxHeight: '500px' }}
          >
            Your browser does not support the video tag.
          </video>
        );
      case 'pdf':
        return (
          <iframe
            src={lesson.content_url}
            className="w-full rounded-lg"
            style={{ height: '600px' }}
            title={lesson.title}
          />
        );
      case 'iframe':
        return (
          <iframe
            src={lesson.content_url}
            className="w-full rounded-lg"
            style={{ height: '600px' }}
            title={lesson.title}
          />
        );
      case '3d':
        return React.createElement('model-viewer', {
          src: lesson.content_url,
          alt: lesson.title,
          'auto-rotate': true,
          'camera-controls': true,
          style: { width: '100%', height: '600px' },
          className: 'rounded-lg'
        });
      default:
        return <p>Unsupported content type</p>;
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="px-4 sm:px-0">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Course not found.</p>
            <Button className="mt-4" onClick={() => router.push('/student')}>
              Back to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="px-4 sm:px-0">
        <Card>
          <CardHeader>
            <CardTitle>{course.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{course.description}</p>
            <Button onClick={handleEnroll}>Enroll in this course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold">{course.title}</h2>
            <p className="text-muted-foreground mt-2">{course.description}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnenrollDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Unenroll
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Unenroll Dialog */}
      <Dialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unenroll from Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to unenroll from &quot;{course.title}&quot;? 
              Your progress will be lost and you'll need to re-enroll to access the course again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnenrollDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unenroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lesson List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    selectedLesson?.id === lesson.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  {progress[lesson.id]?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                  <span className="text-sm">{lesson.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Viewer */}
        <Card className="lg:col-span-2">
          {selectedLesson ? (
            <>
              <CardHeader>
                <CardTitle>{selectedLesson.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedLesson.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {renderContent(selectedLesson)}
                </div>
                <div className="flex gap-4">
                  {!progress[selectedLesson.id]?.completed && (
                    <Button onClick={handleMarkComplete}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/student/courses/${params.id}/lessons/${selectedLesson.id}/quiz`)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Take Quiz
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a lesson to start learning
            </CardContent>
          )}
        </Card>
      </div>

      {/* Course Reviews Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Course Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Write/Edit Review */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-3">
              {userReview ? 'Your Review' : 'Leave a Review'}
            </h4>
            {!userReview || editingReview ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rating</p>
                  <StarRating
                    rating={newReview.rating}
                    onRate={(r) => setNewReview({ ...newReview, rating: r })}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Share your experience with this course (optional)"
                    value={newReview.review_text}
                    onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmitReview} disabled={reviewLoading}>
                    {reviewLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {userReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                  {editingReview && (
                    <Button variant="outline" onClick={() => setEditingReview(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <StarRating rating={userReview.rating} readonly />
                {userReview.review_text && (
                  <p className="text-muted-foreground">{userReview.review_text}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingReview(true)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteReview}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.filter(r => r.user_id !== currentUserId).length > 0 ? (
              reviews
                .filter(r => r.user_id !== currentUserId)
                .map((review) => (
                  <div key={review.id} className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        {review.user?.avatar_url && (
                          <AvatarImage src={review.user.avatar_url} />
                        )}
                        <AvatarFallback>
                          {(review.user?.full_name || review.user?.email || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {review.user?.full_name || review.user?.email?.split('@')[0] || 'Anonymous'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <StarRating rating={review.rating} readonly />
                        {review.review_text && (
                          <p className="text-sm text-muted-foreground mt-2">{review.review_text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No other reviews yet. Be the first to share your experience!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
