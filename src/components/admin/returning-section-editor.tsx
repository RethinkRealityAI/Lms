'use client';

/**
 * Admin editor for the "Returning from EdApp" landing section (migration 066).
 *
 * Single-config editor (one row per institution) with a left form / right live
 * preview, reusing the exact `LandingReturningView` visitors see. Every piece of
 * copy is editable, plus the accent color and an on/off toggle.
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import {
  upsertLandingReturningInfo,
  type LandingReturningInfo,
  type LandingReturningInput,
} from '@/lib/db/landing-returning';
import {
  LandingReturningView,
  DEFAULT_RETURNING_CONTENT,
  type LandingReturningContent,
} from '@/components/landing/landing-returning-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Eye, RotateCcw } from 'lucide-react';

interface ReturningSectionEditorProps {
  initial: LandingReturningInfo | null;
  institutionId: string;
  institutionSlug: string;
}

type FormState = LandingReturningInput;

function toForm(row: LandingReturningInfo | null): FormState {
  if (!row) return { ...DEFAULT_RETURNING_CONTENT, is_active: true };
  return {
    is_active: row.is_active,
    accent_color: row.accent_color,
    eyebrow: row.eyebrow,
    heading: row.heading,
    intro: row.intro,
    email_note_title: row.email_note_title,
    email_note_body: row.email_note_body,
    signup_title: row.signup_title,
    signup_body: row.signup_body,
    signup_button: row.signup_button,
    signin_title: row.signin_title,
    signin_body: row.signin_body,
    signin_button: row.signin_button,
    footer_note: row.footer_note,
  };
}

function Field({ label, value, onChange, placeholder, textarea, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-bold text-slate-700">{label}</Label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows ?? 3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

function ColorSwatches({
  branding, value, onChange,
}: { branding: ReturnType<typeof getInstitutionBranding>; value: string | null; onChange: (v: string | null) => void }) {
  const presets = [
    { color: '#059669', label: 'Green (default)' },
    { color: branding.primaryColor, label: 'Primary' },
    { color: branding.secondaryColor, label: 'Secondary' },
    { color: branding.accentColor, label: 'Accent' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map(({ color, label }) => (
        <button
          key={color + label}
          type="button"
          title={`${label} — ${color}`}
          onClick={() => onChange(color)}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-all shadow-sm hover:scale-110',
            value === color ? 'border-slate-700 scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-white',
          )}
          style={{ backgroundColor: color }}
        />
      ))}
      <input
        type="color"
        value={value || '#059669'}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded-full border-2 border-white cursor-pointer shadow-sm hover:scale-110 transition-all p-0 appearance-none overflow-hidden"
        title="Custom color"
      />
      {value !== null && (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-1">Reset</button>
      )}
    </div>
  );
}

export function ReturningSectionEditor({ initial, institutionId, institutionSlug }: ReturningSectionEditorProps) {
  const supabase = createClient();
  const branding = getInstitutionBranding(institutionSlug);
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val }));

  const previewContent: LandingReturningContent = {
    eyebrow: form.eyebrow || DEFAULT_RETURNING_CONTENT.eyebrow,
    heading: form.heading || DEFAULT_RETURNING_CONTENT.heading,
    intro: form.intro,
    email_note_title: form.email_note_title,
    email_note_body: form.email_note_body,
    signup_title: form.signup_title || DEFAULT_RETURNING_CONTENT.signup_title,
    signup_body: form.signup_body,
    signup_button: form.signup_button || DEFAULT_RETURNING_CONTENT.signup_button,
    signin_title: form.signin_title || DEFAULT_RETURNING_CONTENT.signin_title,
    signin_body: form.signin_body,
    signin_button: form.signin_button || DEFAULT_RETURNING_CONTENT.signin_button,
    footer_note: form.footer_note,
    accent_color: form.accent_color,
  };

  const handleSave = async () => {
    if (!form.heading.trim()) { toast.error('Heading is required.'); return; }
    setSaving(true);
    try {
      await upsertLandingReturningInfo(supabase, institutionId, {
        ...form,
        accent_color: form.accent_color || null,
      });
      toast.success('Returning section saved.');
    } catch (err) {
      toast.error('Failed to save', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => setForm((p) => ({ ...DEFAULT_RETURNING_CONTENT, is_active: p.is_active }));

  return (
    <div className="grid lg:grid-cols-[minmax(0,460px)_1fr] gap-6 items-start">
      {/* LEFT — form */}
      <div className="space-y-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Visibility &amp; color</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-bold text-slate-700">Show this section</Label>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Turn off to hide it from the landing page</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Accent color</Label>
              <ColorSwatches branding={branding} value={form.accent_color} onChange={(v) => set('accent_color', v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Heading</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <Field label="Eyebrow (small title)" value={form.eyebrow} onChange={(v) => set('eyebrow', v)} placeholder="Returning from EdApp?" />
            <Field label="Main heading" value={form.heading} onChange={(v) => set('heading', v)} placeholder="Your account and progress are already here." />
            <Field label="Intro paragraph" value={form.intro} onChange={(v) => set('intro', v)} textarea rows={3} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Email callout</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <Field label="Callout title" value={form.email_note_title} onChange={(v) => set('email_note_title', v)} />
            <Field label="Callout body" value={form.email_note_body} onChange={(v) => set('email_note_body', v)} textarea rows={3} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">“First time” card</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <Field label="Title" value={form.signup_title} onChange={(v) => set('signup_title', v)} />
            <Field label="Body" value={form.signup_body} onChange={(v) => set('signup_body', v)} textarea rows={3} />
            <Field label="Button label" value={form.signup_button} onChange={(v) => set('signup_button', v)} placeholder="Set up my account" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">“Already have a login” card</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <Field label="Title" value={form.signin_title} onChange={(v) => set('signin_title', v)} />
            <Field label="Body" value={form.signin_body} onChange={(v) => set('signin_body', v)} textarea rows={3} />
            <Field label="Button label" value={form.signin_button} onChange={(v) => set('signin_button', v)} placeholder="Sign in" />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Footer note</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Field label="Small note under the cards" value={form.footer_note} onChange={(v) => set('footer_note', v)} textarea rows={2} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3 pb-4">
          <Button variant="outline" onClick={resetDefaults} disabled={saving} className="font-bold rounded-xl gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl gap-1.5">
            {saving ? (
              <><span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" /> Saving…</>
            ) : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* RIGHT — live preview */}
      <div className="lg:sticky lg:top-20 self-start">
        <div className="rounded-2xl bg-slate-100 p-3 border border-slate-200">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-2 py-2">
            <Eye className="h-3.5 w-3.5" /> Live Preview
            {!form.is_active && <span className="ml-2 normal-case tracking-normal text-amber-600 font-bold">(hidden on the site)</span>}
          </p>
          <div className="rounded-xl overflow-hidden bg-white">
            <LandingReturningView content={previewContent} signInHref="#" signUpHref="#" previewMode />
          </div>
        </div>
      </div>
    </div>
  );
}
