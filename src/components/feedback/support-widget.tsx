'use client';

/**
 * SupportWidget — the student dashboard's floating "Contact support" button.
 *
 * A bottom-right FAB opens a panel where the learner picks an intent
 * (Suggestion / Issue / Bug), a category pill, and optionally the related course,
 * then writes a message. Submits to /api/feedback with structured context, so it
 * lands in the same admin support hub as everything else. Richer than the in-viewer
 * report button (which is scoped to one slide); this covers the whole platform.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, Loader2, Lightbulb, Flag, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { FEEDBACK_TYPES, type FeedbackType, type FeedbackContext } from '@/lib/content/feedback-taxonomy';
import { resolveInstitutionSlug } from '@/lib/tenant/path';

const INTENTS: { type: Exclude<FeedbackType, 'contact'>; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'suggestion', label: 'Suggestion', icon: Lightbulb },
  { type: 'issue', label: 'Issue', icon: Flag },
  { type: 'bug', label: 'Bug', icon: Bug },
];

interface EnrolledCourse { id: string; title: string }
interface EnrolledCourseRow { id: string; title: string; institution_id: string }

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Exclude<FeedbackType, 'contact'>>('suggestion');
  const [category, setCategory] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Prefill identity + enrolled courses on open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      // Resolve the ACTIVE portal institution (from the slug/cookie), so a dual-access
      // learner viewing SCAGO only sees SCAGO courses — not their GANSID enrolments.
      // (The submission's institution_id is already server-derived from the same slug.)
      const slug = resolveInstitutionSlug();
      const [{ data: profile }, instRes, { data: enr }] = await Promise.all([
        supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle(),
        slug
          ? supabase.from('institutions').select('id').eq('slug', slug).maybeSingle()
          : Promise.resolve({ data: null as { id: string } | null }),
        supabase.from('course_enrollments').select('courses(id, title, institution_id)').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      setName((prev) => prev || profile?.full_name || 'Student');
      setEmail((prev) => prev || profile?.email || user.email || '');
      const activeInstitutionId = instRes?.data?.id ?? null;
      const list = (enr ?? [])
        .map((r) => (r as { courses: EnrolledCourseRow | EnrolledCourseRow[] | null }).courses)
        .map((c) => (Array.isArray(c) ? c[0] : c))
        .filter((c): c is EnrolledCourseRow => !!c)
        .filter((c) => !activeInstitutionId || c.institution_id === activeInstitutionId)
        .map((c) => ({ id: c.id, title: c.title }));
      setCourses(list);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const categories = FEEDBACK_TYPES[type].categories;

  const reset = () => { setCategory(null); setCourseId(''); setMessage(''); };

  const handleSubmit = async () => {
    if (!message.trim() && !category) {
      toast.error('Pick a category or write a message.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please provide an email so we can follow up.');
      return;
    }
    setSubmitting(true);
    try {
      const course = courses.find((c) => c.id === courseId);
      const context: FeedbackContext = {
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        course_id: course?.id,
        course_title: course?.title,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          category,
          name: name.trim() || 'Student',
          email: email.trim(),
          subject: `${FEEDBACK_TYPES[type].label}${course ? ` — ${course.title}` : ''}`,
          message: message.trim() || FEEDBACK_TYPES[type].categories.find((c) => c.slug === category)?.label || '',
          context,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to submit.');
      }
      toast.success('Thanks for the feedback!', { description: 'Our team will take a look.' });
      reset();
      setOpen(false);
    } catch (err) {
      toast.error('Could not send your feedback', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-2xl bg-[#1E3A5F] text-white shadow-lg shadow-slate-900/20 hover:bg-[#0F172A] hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3A5F]"
        aria-label="Contact support"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="text-sm font-bold hidden sm:inline">Support</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Contact support</DialogTitle>
            <DialogDescription>Share a suggestion or report a problem — we read every one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Intent */}
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-full">
              {INTENTS.map((it) => (
                <button
                  key={it.type}
                  type="button"
                  onClick={() => { setType(it.type); setCategory(null); }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    type === it.type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <it.icon className="h-4 w-4" /> {it.label}
                </button>
              ))}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => {
                const active = category === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCategory(active ? null : c.slug)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      active ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Optional related course */}
            {courses.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Related course <span className="font-medium text-slate-400">(optional)</span></Label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/50"
                >
                  <option value="">Whole platform / not course-specific</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="support-message" className="font-bold text-slate-700">
                Tell us more <span className="font-medium text-slate-400">(optional if you picked one above)</span>
              </Label>
              <Textarea id="support-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your suggestion or the problem…" rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="support-email" className="font-bold text-slate-700">Your email</Label>
              <Input id="support-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-[#1E3A5F] hover:bg-[#0F172A] text-white font-bold">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</> : 'Send feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
