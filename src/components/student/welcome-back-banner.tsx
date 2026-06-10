'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles, X } from 'lucide-react';

interface WelcomeBackBannerProps {
  institutionName: string;
  contactEmail: string;
  institutionId: string;
  userEmail: string;
  userName: string;
}

export function WelcomeBackBanner({
  institutionName,
  contactEmail,
  institutionId,
  userEmail,
  userName,
}: WelcomeBackBannerProps) {
  const [visible, setVisible] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [subject, setSubject] = useState('Imported progress issue');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const dismiss = async () => {
    setVisible(false);
    try {
      await supabase.rpc('acknowledge_legacy_welcome');
    } catch {
      // Non-fatal — banner is already hidden locally.
    }
  };

  const handleReport = async () => {
    if (!message.trim()) {
      toast.error('Please describe the issue before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: userName || 'Platform User',
        email: userEmail,
        subject: subject.trim() || 'Imported progress issue',
        message: message.trim(),
        institution_id: institutionId,
      });
      if (error) throw error;
      toast.success("Thanks — our team will take a look.", {
        description: 'We typically respond within 1–2 business days.',
      });
      setReportOpen(false);
      // Also dismiss the banner after reporting
      setVisible(false);
      try {
        await supabase.rpc('acknowledge_legacy_welcome');
      } catch {
        // Non-fatal
      }
    } catch (err: unknown) {
      toast.error('Could not submit your report', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Card className="border border-blue-100 bg-gradient-to-r from-blue-50 to-amber-50 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 mt-0.5 rounded-full bg-white/80 p-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-sm leading-snug mb-1">
                Welcome back, {userName || 'there'}! 👋
              </p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {institutionName}&apos;s learning has a new home — this platform replaces EdApp.
                We&apos;ve carried over your progress, completed courses, and certificates.{' '}
                <span className="text-slate-500">
                  Heads-up: progress in courses you hadn&apos;t finished may be slightly off, but
                  completed courses and earned certificates are accurate.
                </span>
              </p>
              <p className="text-sm text-slate-600 font-medium mt-2">
                Spot something wrong? Let us know and we&apos;ll fix it.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => setReportOpen(true)}
                  className="bg-[#1A3C6E] hover:bg-[#162d4a] text-white font-bold rounded-lg px-4 h-9"
                >
                  Report an issue
                </Button>
                <button
                  onClick={dismiss}
                  className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1 py-1 rounded"
                >
                  Looks good — dismiss
                </button>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              aria-label="Dismiss banner"
              className="shrink-0 p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-white/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Report a Progress Issue</DialogTitle>
            <DialogDescription>
              Tell us what looks wrong with your imported progress or completion history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="report-subject" className="font-bold text-slate-700">Subject</Label>
              <Input
                id="report-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Imported progress issue"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-message" className="font-bold text-slate-700">
                What looks wrong?
              </Label>
              <textarea
                id="report-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Module 3 shows 0% but I completed it on EdApp in January..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <p className="text-xs text-slate-400 font-medium">
              You can also email us directly at{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="text-[#0099CA] hover:underline font-semibold"
              >
                {contactEmail}
              </a>
              .
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={submitting || !message.trim()}
              className="bg-[#1A3C6E] hover:bg-[#162d4a] text-white font-bold"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
