'use client';

/**
 * ReportIssueDialog — small in-app "Report an issue" dialog.
 *
 * Renders its own trigger (icon button or text link) + a shadcn Dialog with a
 * "What went wrong?" textarea. On open it prefills the signed-in user's name
 * and email from their `users` row (email stays editable as a fallback for
 * edge cases where no profile is found) and captures a context block the user
 * can see before sending: page URL, course/lesson/slide identifiers (when
 * provided via props), user agent, and timestamp.
 *
 * Submits through the existing public /api/contact route (name/email/subject/
 * message). The context is appended to the message body as a structured
 * "--- Context ---" suffix, so the admin Support inbox (which renders messages
 * with whitespace-pre-wrap) shows it with zero schema changes. The route
 * resolves institution_id from the institution_slug cookie set by middleware,
 * so no institution identifiers are hardcoded or passed here.
 */

import { useEffect, useMemo, useState } from 'react';
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

export interface ReportIssueContext {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  /** 0-based slide index; displayed 1-based. */
  slideIndex?: number;
}

interface ReportIssueDialogProps extends ReportIssueContext {
  /** 'icon' = small flag icon button (viewer chrome); 'link' = inline text link. */
  variant?: 'icon' | 'link';
  /** Extra classes for the trigger element. */
  className?: string;
}

function buildContextLines(ctx: ReportIssueContext, capturedAt: string): string[] {
  const lines: string[] = ['--- Context ---'];
  if (typeof window !== 'undefined') lines.push(`Page: ${window.location.href}`);
  if (ctx.courseId || ctx.courseTitle) {
    lines.push(`Course: ${ctx.courseTitle ?? '(untitled)'}${ctx.courseId ? ` (${ctx.courseId})` : ''}`);
  }
  if (ctx.lessonId || ctx.lessonTitle) {
    lines.push(`Lesson: ${ctx.lessonTitle ?? '(untitled)'}${ctx.lessonId ? ` (${ctx.lessonId})` : ''}`);
  }
  if (typeof ctx.slideIndex === 'number') lines.push(`Slide: ${ctx.slideIndex + 1}`);
  if (typeof navigator !== 'undefined') lines.push(`User agent: ${navigator.userAgent}`);
  lines.push(`Reported at: ${capturedAt}`);
  return lines;
}

export function ReportIssueDialog({
  variant = 'icon',
  className,
  ...context
}: ReportIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capturedAt, setCapturedAt] = useState('');

  // Capture the context snapshot when the dialog opens so the user sees
  // exactly what will be sent.
  const contextLines = useMemo(
    () => (open ? buildContextLines(context, capturedAt) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, capturedAt, context.courseId, context.courseTitle, context.lessonId, context.lessonTitle, context.slideIndex],
  );

  // Prefill name/email from the signed-in user's profile on open.
  useEffect(() => {
    if (!open) return;
    setCapturedAt(new Date().toISOString());
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
      setName((prev) => prev || profile?.full_name || 'Platform User');
      setEmail((prev) => prev || profile?.email || user.email || '');
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please describe the issue before submitting.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please provide an email so we can follow up.');
      return;
    }
    setSubmitting(true);
    try {
      const subject = `Issue report — ${context.courseTitle ?? context.lessonTitle ?? 'Student portal'}`;
      const fullMessage = `${message.trim()}\n\n${contextLines.join('\n')}`;
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Platform User',
          email: email.trim(),
          subject,
          message: fullMessage,
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
      setOpen(false);
    } catch (err: unknown) {
      toast.error('Could not submit your report', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`p-1 text-slate-400 hover:text-[#DC2626] transition-colors rounded ${className ?? ''}`}
        title="Report an issue"
        aria-label="Report an issue"
      >
        <Flag className="w-4 h-4" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1.5 ${className ?? ''}`}
      >
        <Flag className="w-3.5 h-3.5" />
        Report an issue
      </button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Report an Issue</DialogTitle>
            <DialogDescription>
              Tell us what went wrong and our team will take a look.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-issue-message" className="font-bold text-slate-700">
                What went wrong?
              </Label>
              <Textarea
                id="report-issue-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. The video on this slide won't play..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-issue-email" className="font-bold text-slate-700">
                Your email
              </Label>
              <Input
                id="report-issue-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="text-xs text-slate-400 font-medium">
                We&apos;ll use this to follow up on your report.
              </p>
            </div>
            {contextLines.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Included automatically</Label>
                <pre className="text-[11px] leading-relaxed text-slate-500 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto">
                  {contextLines.slice(1).join('\n')}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
