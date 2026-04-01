'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveReviewButtonProps {
  courseId: string;
  courseTitle?: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function LeaveReviewButton({ courseId, courseTitle, className, size = 'sm' }: LeaveReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const supabase = createClient();

  const handleOpen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('course_reviews')
      .select('id, rating, review_text')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single();
    if (data) {
      setExistingReviewId(data.id);
      setRating(data.rating);
      setReviewText(data.review_text || '');
    } else {
      setExistingReviewId(null);
      setRating(0);
      setReviewText('');
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error('Please select a rating'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      if (existingReviewId) {
        const { error } = await supabase.from('course_reviews').update({
          rating, review_text: reviewText, updated_at: new Date().toISOString(),
        }).eq('id', existingReviewId);
        if (error) throw error;
        toast.success('Review updated!');
      } else {
        const { error } = await supabase.from('course_reviews').insert([{
          course_id: courseId, user_id: user.id, rating, review_text: reviewText,
        }]);
        if (error) throw error;
        toast.success('Review submitted! Thank you.');
      }
      setOpen(false);
    } catch (err: any) {
      toast.error('Failed to submit review', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size={size} onClick={handleOpen}
        className={className ?? 'w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 font-bold'}>
        <Star className="mr-1.5 h-3.5 w-3.5" />Leave a Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{existingReviewId ? 'Update Your Review' : 'Leave a Review'}</DialogTitle>
            <DialogDescription>
              {courseTitle
                ? `Share your thoughts on "${courseTitle}"`
                : 'Share your experience with this course'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Your Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    className="cursor-pointer hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded">
                    <Star className={`h-7 w-7 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="What did you find most valuable? (optional)"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {existingReviewId ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
