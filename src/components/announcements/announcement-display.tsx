'use client';

/**
 * Shared announcement renderer — used by BOTH the student dashboard
 * (AnnouncementHost) and the admin settings live preview, so what admins
 * see in the preview is byte-for-byte what students get.
 *
 * Supports two styles:
 *  - banner: tinted card at the top of the dashboard
 *  - modal:  centered dialog shown on page load
 * Merge tags {{firstName}} and {{institutionName}} are interpolated here.
 * In previewMode, nothing is written to the database (report dialog shows a
 * toast instead of submitting; dismiss only calls onDismiss).
 */

import { useState } from 'react';
import Image from 'next/image';
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
import { Megaphone, X } from 'lucide-react';

export interface AnnouncementDisplayData {
  id: string;
  title: string;
  body: string;
  style: 'banner' | 'modal';
  accent_color: string | null;
  show_logo: boolean;
  cta_label: string | null;
  cta_url: string | null;
  show_report_issue: boolean;
}

export interface AnnouncementBrandingContext {
  institutionName: string;
  contactEmail: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface AnnouncementUserContext {
  userName: string;
  userEmail: string;
  institutionId: string | null;
}

interface AnnouncementDisplayProps {
  announcement: AnnouncementDisplayData;
  branding: AnnouncementBrandingContext;
  user: AnnouncementUserContext;
  /** Called when the user closes/dismisses; host records the dismissal. */
  onDismiss: () => void;
  /** Admin live preview — no DB writes, dialogs stay inline-safe. */
  previewMode?: boolean;
}

function interpolate(text: string, user: AnnouncementUserContext, branding: AnnouncementBrandingContext): string {
  const firstName = user.userName?.split(' ')[0] || 'there';
  return text
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{institutionName}}', branding.institutionName);
}

/** Soft tint derived from a hex accent (falls back gracefully). */
function tint(hex: string, alpha: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

export function AnnouncementDisplay({
  announcement,
  branding,
  user,
  onDismiss,
  previewMode = false,
}: AnnouncementDisplayProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [subject, setSubject] = useState('Imported progress issue');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(true);

  const accent = announcement.accent_color || branding.primaryColor;
  const title = interpolate(announcement.title, user, branding);
  const paragraphs = interpolate(announcement.body, user, branding)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const handleReport = async () => {
    if (!message.trim()) {
      toast.error('Please describe the issue before submitting.');
      return;
    }
    if (previewMode) {
      toast.success('Preview — the report was not sent.');
      setReportOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contact_submissions').insert({
        name: user.userName || 'Platform User',
        email: user.userEmail,
        subject: subject.trim() || 'Imported progress issue',
        message: message.trim(),
        institution_id: user.institutionId,
      });
      if (error) throw error;
      toast.success('Thanks — our team will take a look.', {
        description: 'We typically respond within 1–2 business days.',
      });
      setReportOpen(false);
      handleDismiss();
    } catch (err: unknown) {
      toast.error('Could not submit your report', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setModalOpen(false);
    onDismiss();
  };

  const logo = announcement.show_logo && branding.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={`${branding.institutionName} logo`}
      className="h-8 w-auto object-contain"
    />
  ) : null;

  const cta = announcement.cta_label && announcement.cta_url ? (
    <Button
      asChild
      size="sm"
      style={{ backgroundColor: accent }}
      className="text-white font-bold rounded-lg px-4 h-9 hover:opacity-90"
    >
      <a
        href={previewMode ? undefined : announcement.cta_url}
        onClick={previewMode ? (e) => { e.preventDefault(); toast.info('Preview — link disabled'); } : undefined}
        target={announcement.cta_url.startsWith('http') ? '_blank' : undefined}
        rel="noopener noreferrer"
      >
        {announcement.cta_label}
      </a>
    </Button>
  ) : null;

  const reportButton = announcement.show_report_issue ? (
    <Button
      size="sm"
      variant={cta ? 'outline' : 'default'}
      onClick={() => setReportOpen(true)}
      style={cta ? undefined : { backgroundColor: accent }}
      className={cta
        ? 'font-bold rounded-lg px-4 h-9'
        : 'text-white font-bold rounded-lg px-4 h-9 hover:opacity-90'}
    >
      Report an issue
    </Button>
  ) : null;

  const reportDialog = (
    <Dialog open={reportOpen} onOpenChange={setReportOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Report an Issue</DialogTitle>
          <DialogDescription>
            Tell us what looks wrong and our team will take a look.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-report-subject" className="font-bold text-slate-700">Subject</Label>
            <Input
              id="announcement-report-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-report-message" className="font-bold text-slate-700">
              What looks wrong?
            </Label>
            <textarea
              id="announcement-report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Module 3 shows 0% but I completed it on EdApp in January..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            You can also email us directly at{' '}
            <a href={`mailto:${branding.contactEmail}`} className="hover:underline font-semibold" style={{ color: accent }}>
              {branding.contactEmail}
            </a>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReport}
            disabled={submitting || !message.trim()}
            style={{ backgroundColor: accent }}
            className="text-white font-bold hover:opacity-90"
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Banner style ───────────────────────────────────────────────────────────
  if (announcement.style === 'banner') {
    return (
      <>
        <Card
          className="border shadow-sm rounded-xl overflow-hidden"
          style={{ borderColor: tint(accent, '33'), backgroundColor: tint(accent, '0d') }}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 rounded-full bg-white/90 p-2 shadow-sm">
                {logo ?? <Megaphone className="h-4 w-4" style={{ color: accent }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm leading-snug mb-1">{title}</p>
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-slate-600 font-medium leading-relaxed mt-1 first:mt-0">{p}</p>
                ))}
                {(cta || reportButton) && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
                    {cta}
                    {reportButton}
                    <button
                      onClick={handleDismiss}
                      className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1 py-1 rounded"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss announcement"
                className="shrink-0 p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
        {reportDialog}
      </>
    );
  }

  // ── Modal style ────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <DialogContent className="sm:max-w-lg overflow-hidden p-0 gap-0">
          <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
          <div className="p-6">
            {logo && <div className="mb-4 flex justify-center">{logo}</div>}
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 text-center">{title}</DialogTitle>
            </DialogHeader>
            <div className="mt-3 space-y-2">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 font-medium leading-relaxed text-center">{p}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
              {cta}
              {reportButton}
              <Button variant="outline" size="sm" onClick={handleDismiss} className="font-bold rounded-lg px-4 h-9">
                {cta || reportButton ? 'Dismiss' : 'Got it'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {reportDialog}
    </>
  );
}
