'use client';

/**
 * ReportIssueDialog — the in-viewer "Report issue" control.
 *
 * Trigger: a red, filled flag + "Report issue" label (label hidden on the smallest
 * screens). Opens a compact dialog pre-scoped to the current course/lesson/slide:
 * quick-pick issue-category pills + an optional message + the reporter's email
 * (prefilled from their profile).
 *
 * Submits to /api/feedback as `type: 'issue'` with a STRUCTURED context object
 * (page URL, course/lesson/slide ids + titles, user agent) — no text blob — so the
 * admin support hub can render pills and deep links instead of a raw dump.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FEEDBACK_TYPES, categoryLabel, type FeedbackContext } from '@/lib/content/feedback-taxonomy';

export interface ReportIssueContext {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  /** DB slide id — lets the admin card deep-link the editor to this exact slide. */
  slideId?: string;
  /** 0-based slide index; displayed 1-based. */
  slideIndex?: number;
}

interface ReportIssueDialogProps extends ReportIssueContext {
  /** Extra classes for the trigger element (placement/visibility). */
  className?: string;
}

const ISSUE_CATEGORIES = FEEDBACK_TYPES.issue.categories;

export function ReportIssueDialog({ className, ...context }: ReportIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill name/email from the signed-in user's profile on open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setName((prev) => prev || profile?.full_name || 'Student');
      setEmail((prev) => prev || profile?.email || user.email || '');
    })();
    return () => { cancelled = true; };
  }, [open]);

  const contextSummary = [
    context.courseTitle,
    context.lessonTitle,
    typeof context.slideIndex === 'number' ? `Slide ${context.slideIndex + 1}` : null,
  ].filter(Boolean).join(' · ');

  const handleSubmit = async () => {
    const finalMessage = message.trim() || (category ? categoryLabel('issue', category) ?? '' : '');
    if (!finalMessage) {
      toast.error('Pick an issue or describe what went wrong.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please provide an email so we can follow up.');
      return;
    }
    setSubmitting(true);
    try {
      const feedbackContext: FeedbackContext = {
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        course_id: context.courseId,
        course_title: context.courseTitle,
        lesson_id: context.lessonId,
        lesson_title: context.lessonTitle,
        slide_id: context.slideId,
        slide_index: typeof context.slideIndex === 'number' ? context.slideIndex : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'issue',
          category,
          name: name.trim() || 'Student',
          email: email.trim(),
          subject: `Issue report — ${context.courseTitle ?? context.lessonTitle ?? 'Student portal'}`,
          message: finalMessage,
          context: feedbackContext,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to submit the report.');
      }
      toast.success('Thanks — our team will take a look.', {
        description: 'We typically respond within 1–2 business days.',
      });
      setMessage('');
      setCategory(null);
      setOpen(false);
    } catch (err: unknown) {
      toast.error('Could not submit your report', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#DC2626] hover:bg-red-50 transition-colors ${className ?? ''}`}
        title="Report an issue"
        aria-label="Report an issue"
      >
        <Flag className="w-4 h-4 fill-[#DC2626]" />
        <span className="text-xs font-semibold hidden sm:inline">Report issue</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Report an issue</DialogTitle>
            <DialogDescription>
              Tell us what went wrong and our team will take a look.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">What kind of issue?</Label>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_CATEGORIES.map((c) => {
                  const active = category === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setCategory(active ? null : c.slug)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[#DC2626] border-[#DC2626] text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#DC2626] hover:text-[#DC2626]'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-issue-message" className="font-bold text-slate-700">
                Tell us more <span className="font-medium text-slate-400">(optional if you picked one above)</span>
              </Label>
              <Textarea
                id="report-issue-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. The video on this slide won't play…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-issue-email" className="font-bold text-slate-700">Your email</Label>
              <Input
                id="report-issue-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {contextSummary && (
              <p className="text-xs text-slate-400 font-medium">
                Attached automatically: {contextSummary}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit report'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
