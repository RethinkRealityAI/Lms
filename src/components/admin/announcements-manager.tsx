'use client';

/**
 * Admin Announcements Manager
 * Settings form (left) + live pixel-identical preview (right).
 * List view shows all institution announcements with status chips and quick actions.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementStyle,
  type AnnouncementAudience,
  type AnnouncementDisplayMode,
} from '@/lib/db/announcements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Monitor,
  LayoutTemplate,
  Calendar,
  Users,
  Eye,
  Clock,
  CheckCircle2,
  MinusCircle,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnouncementsManagerProps {
  initialAnnouncements: Announcement[];
  institutionId: string;
  institutionSlug: string;
}

type FormState = Omit<AnnouncementInput, 'starts_at' | 'ends_at'> & {
  starts_at: string; // datetime-local string
  ends_at: string;   // datetime-local string or ''
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}

function nowLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function computeStatus(a: Announcement): 'live' | 'scheduled' | 'expired' | 'off' {
  if (!a.is_active) return 'off';
  const now = Date.now();
  const start = new Date(a.starts_at).getTime();
  const end = a.ends_at ? new Date(a.ends_at).getTime() : null;
  if (end && end < now) return 'expired';
  if (start > now) return 'scheduled';
  return 'live';
}

const STATUS_CONFIG = {
  live: { label: 'Live', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  expired: { label: 'Expired', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  off: { label: 'Off', color: 'bg-slate-100 text-slate-400 border-slate-200' },
} as const;

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  first_time: 'New users',
  legacy_claimed: 'Returning EdApp users',
};

const DISPLAY_LABELS: Record<AnnouncementDisplayMode, string> = {
  once: 'Show once',
  until_dismissed: 'Until dismissed',
  always: 'Every visit',
};

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------

function defaultForm(): FormState {
  return {
    title: '',
    body: '',
    style: 'banner',
    audience: 'all',
    display_mode: 'once',
    accent_color: null,
    show_logo: true,
    cta_label: null,
    cta_url: null,
    show_report_issue: false,
    starts_at: nowLocal(),
    ends_at: '',
    is_active: true,
  };
}

function announcementToForm(a: Announcement): FormState {
  return {
    title: a.title,
    body: a.body,
    style: a.style,
    audience: a.audience,
    display_mode: a.display_mode,
    accent_color: a.accent_color,
    show_logo: a.show_logo,
    cta_label: a.cta_label,
    cta_url: a.cta_url,
    show_report_issue: a.show_report_issue,
    starts_at: isoToLocal(a.starts_at),
    ends_at: isoToLocal(a.ends_at),
    is_active: a.is_active,
  };
}

// ---------------------------------------------------------------------------
// Tint helper (mirrors announcement-display.tsx)
// ---------------------------------------------------------------------------
function tint(hex: string, alpha: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

function interpolate(text: string, userName: string, institutionName: string): string {
  const firstName = userName.split(' ')[0] || 'there';
  return text
    .replaceAll('{{firstName}}', firstName)
    .replaceAll('{{institutionName}}', institutionName);
}

// ---------------------------------------------------------------------------
// Modal Preview (inline, non-portal — avoids Dialog portaling to body)
// ---------------------------------------------------------------------------

interface ModalPreviewProps {
  title: string;
  body: string;
  accentColor: string;
  showLogo: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  showReportIssue: boolean;
  logoUrl: string | null;
  institutionName: string;
  userName: string;
}

function ModalPreview({
  title,
  body,
  accentColor,
  showLogo,
  ctaLabel,
  showReportIssue,
  logoUrl,
  institutionName,
  userName,
}: ModalPreviewProps) {
  const iTitle = interpolate(title, userName, institutionName);
  const paragraphs = interpolate(body, userName, institutionName)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasCta = !!(ctaLabel);

  return (
    <div className="rounded-xl border border-slate-200 shadow-2xl bg-white max-w-lg mx-auto overflow-hidden">
      {/* Accent top bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
      <div className="p-6">
        {showLogo && logoUrl && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="logo" className="h-8 w-auto object-contain" />
          </div>
        )}
        <p className="text-xl font-black text-slate-900 text-center leading-snug mb-3">
          {iTitle || <span className="text-slate-300 italic">Announcement title…</span>}
        </p>
        <div className="space-y-2">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-slate-600 font-medium leading-relaxed text-center">{p}</p>
            ))
          ) : (
            <p className="text-sm text-slate-300 italic text-center">Body text will appear here…</p>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          {hasCta && (
            <button
              className="inline-flex items-center justify-center text-white font-bold rounded-lg px-4 h-9 text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accentColor }}
            >
              {ctaLabel}
            </button>
          )}
          {showReportIssue && (
            <button
              className={cn(
                'inline-flex items-center justify-center font-bold rounded-lg px-4 h-9 text-sm transition-opacity',
                hasCta
                  ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'text-white hover:opacity-90'
              )}
              style={hasCta ? undefined : { backgroundColor: accentColor }}
            >
              Report an issue
            </button>
          )}
          <button className="inline-flex items-center justify-center border border-slate-200 text-slate-700 font-bold rounded-lg px-4 h-9 text-sm hover:bg-slate-50 transition-colors">
            {hasCta || showReportIssue ? 'Dismiss' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner Preview (uses real AnnouncementDisplay with previewMode)
// We import the actual component for banner since it doesn't portal.
// ---------------------------------------------------------------------------
import { AnnouncementDisplay } from '@/components/announcements/announcement-display';

// ---------------------------------------------------------------------------
// Live Preview Pane
// ---------------------------------------------------------------------------

interface PreviewPaneProps {
  form: FormState;
  institutionSlug: string;
}

function PreviewPane({ form, institutionSlug }: PreviewPaneProps) {
  const branding = getInstitutionBranding(institutionSlug);
  const accent = form.accent_color || branding.primaryColor;

  const previewUser = {
    userName: 'Jordan Avery',
    userEmail: 'student@example.com',
    institutionId: null,
  };

  const previewBranding = {
    institutionName: branding.name,
    contactEmail: branding.contactEmail,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  };

  const previewAnnouncement = {
    id: 'preview',
    title: form.title,
    body: form.body,
    style: form.style,
    accent_color: form.accent_color,
    show_logo: form.show_logo,
    cta_label: form.cta_label,
    cta_url: form.cta_url || '#',
    show_report_issue: form.show_report_issue,
  };

  return (
    <div className="lg:sticky lg:top-20 self-start">
      {/* Mock dashboard backdrop */}
      <div className="rounded-2xl bg-slate-100 p-5 space-y-4 border border-slate-200">
        {/* Caption */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Live Preview
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {form.style === 'modal' ? 'Modal — centered over dashboard' : 'Banner — top of dashboard'}
          </p>
        </div>

        {/* Faint nav skeleton */}
        <div className="h-8 bg-slate-800 rounded-xl opacity-70 flex items-center px-3 gap-2">
          <div className="w-5 h-5 rounded bg-slate-600" />
          <div className="w-20 h-2.5 rounded bg-slate-600" />
          <div className="flex-1" />
          <div className="w-14 h-2 rounded bg-slate-600" />
          <div className="w-6 h-6 rounded-full bg-slate-600" />
        </div>

        {/* Announcement or ghost course cards */}
        {form.style === 'banner' ? (
          <div className="space-y-3">
            <AnnouncementDisplay
              announcement={previewAnnouncement}
              branding={previewBranding}
              user={previewUser}
              onDismiss={() => toast.info('Preview — students can dismiss it here')}
              previewMode
            />
            {/* Ghost course cards below */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-white/60 border border-slate-200 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ghost course cards */}
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-white/60 border border-slate-200 animate-pulse" />
              ))}
            </div>
            {/* Modal overlay */}
            <div className="relative rounded-xl bg-black/20 p-4 min-h-[120px] flex items-center justify-center">
              <ModalPreview
                title={form.title}
                body={form.body}
                accentColor={accent}
                showLogo={form.show_logo}
                ctaLabel={form.cta_label}
                ctaUrl={form.cta_url}
                showReportIssue={form.show_report_issue}
                logoUrl={branding.logoUrl}
                institutionName={branding.name}
                userName="Jordan Avery"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center">
              Modal preview — students see this centered over the dashboard
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color swatch row
// ---------------------------------------------------------------------------

interface ColorSwatchProps {
  branding: ReturnType<typeof getInstitutionBranding>;
  value: string | null;
  onChange: (val: string | null) => void;
}

function ColorSwatches({ branding, value, onChange }: ColorSwatchProps) {
  const presets = [
    { color: branding.primaryColor, label: 'Primary' },
    { color: branding.secondaryColor, label: 'Secondary' },
    { color: branding.accentColor, label: 'Accent' },
    ...(branding.orangeAccent ? [{ color: branding.orangeAccent, label: 'Orange' }] : []),
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            title={`${label} — ${color}`}
            onClick={() => onChange(color)}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-all shadow-sm hover:scale-110',
              value === color ? 'border-slate-700 scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-white'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        {/* Custom color input */}
        <div className="relative flex items-center">
          <input
            type="color"
            value={value || branding.primaryColor}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded-full border-2 border-white cursor-pointer shadow-sm hover:scale-110 transition-all p-0 appearance-none overflow-hidden"
            title="Custom color"
          />
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors px-1"
          >
            Reset
          </button>
        )}
      </div>
      {value && (
        <p className="text-[11px] text-slate-400 font-mono">{value}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style toggle cards
// ---------------------------------------------------------------------------

interface StylePickerProps {
  value: AnnouncementStyle;
  onChange: (v: AnnouncementStyle) => void;
}

function StylePicker({ value, onChange }: StylePickerProps) {
  const options: { id: AnnouncementStyle; label: string; sub: string; Icon: typeof Megaphone }[] = [
    { id: 'banner', label: 'Banner', sub: 'Slim card at the top of the dashboard', Icon: Megaphone },
    { id: 'modal', label: 'Modal', sub: 'Pops up center screen on page load', Icon: LayoutTemplate },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ id, label, sub, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-col items-start gap-1.5 rounded-xl border-2 p-3.5 text-left transition-all',
            value === id
              ? 'border-slate-700 bg-slate-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <div className={cn(
            'flex items-center gap-2',
            value === id ? 'text-slate-900' : 'text-slate-500'
          )}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="font-black text-sm">{label}</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 leading-snug">{sub}</p>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm button (inline two-step)
// ---------------------------------------------------------------------------

function DeleteButton({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="destructive"
          className="h-8 text-xs font-black"
          onClick={onConfirm}
          disabled={disabled}
        >
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title="Delete announcement"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnnouncementsManager({
  initialAnnouncements,
  institutionId,
  institutionSlug,
}: AnnouncementsManagerProps) {
  const supabase = createClient();
  const branding = getInstitutionBranding(institutionSlug);

  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [editingId, setEditingId] = useState<string | null>(null); // null = create new
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(defaultForm);

  // Partial setter for deep merge convenience
  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  // ---------------------------------------------------------------------------
  // Open editor
  // ---------------------------------------------------------------------------
  const openCreate = () => {
    setForm(defaultForm());
    setEditingId(null);
    setIsEditing(true);
  };

  const openEdit = (a: Announcement) => {
    setForm(announcementToForm(a));
    setEditingId(a.id);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!form.body.trim()) {
      toast.error('Body text is required.');
      return;
    }

    setSaving(true);
    try {
      const input: AnnouncementInput = {
        ...form,
        title: form.title.trim(),
        body: form.body.trim(),
        cta_label: form.cta_label?.trim() || null,
        cta_url: form.cta_url?.trim() || null,
        starts_at: localToIso(form.starts_at),
        ends_at: form.ends_at ? localToIso(form.ends_at) : null,
        accent_color: form.accent_color || null,
      };

      if (editingId) {
        const updated = await updateAnnouncement(supabase, institutionId, editingId, input);
        setAnnouncements((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast.success('Announcement updated.');
      } else {
        const created = await createAnnouncement(supabase, institutionId, input);
        setAnnouncements((prev) => [created, ...prev]);
        toast.success('Announcement created.');
      }
      closeEditor();
    } catch (err) {
      toast.error('Failed to save', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(supabase, institutionId, id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) closeEditor();
      toast.success('Announcement deleted.');
    } catch (err) {
      toast.error('Could not delete', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Quick toggle is_active
  // ---------------------------------------------------------------------------
  const handleToggleActive = async (a: Announcement) => {
    setTogglingId(a.id);
    try {
      const updated = await updateAnnouncement(supabase, institutionId, a.id, {
        is_active: !a.is_active,
      });
      setAnnouncements((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
    } catch (err) {
      toast.error('Could not update', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6 py-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-slate-400" />
            Announcements
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Welcome messages, banners, and notices shown on the student dashboard
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={openCreate}
            className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shrink-0 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New announcement
          </Button>
        )}
      </div>

      {/* ── Editor view ─────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
          {/* LEFT — form */}
          <div className="space-y-4">
            {/* Section 1 — Message */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Title</Label>
                  <Input
                    placeholder="Welcome to the program, {{firstName}}!"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports <code className="bg-slate-100 px-1 rounded">{'{{firstName}}'}</code> and{' '}
                    <code className="bg-slate-100 px-1 rounded">{'{{institutionName}}'}</code>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Body</Label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setField('body', e.target.value)}
                    placeholder="Type your message here. Leave a blank line to start a new paragraph."
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports <code className="bg-slate-100 px-1 rounded">{'{{firstName}}'}</code> and{' '}
                    <code className="bg-slate-100 px-1 rounded">{'{{institutionName}}'}</code>. Blank line = new paragraph.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 — Appearance */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Style</Label>
                  <StylePicker value={form.style} onChange={(v) => setField('style', v)} />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Accent color</Label>
                  <ColorSwatches
                    branding={branding}
                    value={form.accent_color}
                    onChange={(v) => setField('accent_color', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-slate-700">Show logo</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Display the institution logo in the announcement</p>
                  </div>
                  <Switch
                    checked={form.show_logo}
                    onCheckedChange={(v) => setField('show_logo', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 3 — Audience & behavior */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Audience &amp; Behavior
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Audience</Label>
                  <Select
                    value={form.audience}
                    onValueChange={(v) => setField('audience', v as AnnouncementAudience)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="font-bold">Everyone</span>
                        <span className="text-slate-400 ml-2 text-xs">All enrolled students</span>
                      </SelectItem>
                      <SelectItem value="first_time">
                        <span className="font-bold">New users</span>
                        <span className="text-slate-400 ml-2 text-xs">Joined after announcement goes live</span>
                      </SelectItem>
                      <SelectItem value="legacy_claimed">
                        <span className="font-bold">Returning EdApp users</span>
                        <span className="text-slate-400 ml-2 text-xs">Claimed a legacy profile</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Display</Label>
                  <Select
                    value={form.display_mode}
                    onValueChange={(v) => setField('display_mode', v as AnnouncementDisplayMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">
                        <span className="font-bold">Show once</span>
                        <span className="text-slate-400 ml-2 text-xs">Auto-marked seen on first view</span>
                      </SelectItem>
                      <SelectItem value="until_dismissed">
                        <span className="font-bold">Until dismissed</span>
                        <span className="text-slate-400 ml-2 text-xs">Shows until student closes it</span>
                      </SelectItem>
                      <SelectItem value="always">
                        <span className="font-bold">Every visit</span>
                        <span className="text-slate-400 ml-2 text-xs">Re-shows on every dashboard load</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Section 4 — Schedule */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Start date &amp; time</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setField('starts_at', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-700">End date &amp; time</Label>
                    {form.ends_at && (
                      <button
                        type="button"
                        onClick={() => setField('ends_at', '')}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        No end date
                      </button>
                    )}
                  </div>
                  <Input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setField('ends_at', e.target.value)}
                    placeholder="No end date"
                  />
                  {!form.ends_at && (
                    <p className="text-[11px] text-slate-400 font-medium">Leave blank to show indefinitely</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label className="font-bold text-slate-700">Active</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Toggle off to hide without deleting
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setField('is_active', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 5 — Actions */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">CTA button label</Label>
                    <Input
                      placeholder="View certificates"
                      value={form.cta_label ?? ''}
                      onChange={(e) => setField('cta_label', e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">CTA URL</Label>
                    <Input
                      placeholder="/scago/student/certificates"
                      value={form.cta_url ?? ''}
                      onChange={(e) => setField('cta_url', e.target.value || null)}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Optional button, e.g. "View certificates" → <code className="bg-slate-100 px-1 rounded">/scago/student/certificates</code>
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <Label className="font-bold text-slate-700">Include 'Report an issue' button</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Opens a support form that goes to your admin Support inbox
                    </p>
                  </div>
                  <Switch
                    checked={form.show_report_issue}
                    onCheckedChange={(v) => setField('show_report_issue', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Footer buttons */}
            <div className="flex items-center justify-between gap-3 pb-4">
              <Button
                variant="outline"
                onClick={closeEditor}
                disabled={saving}
                className="font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl gap-1.5"
              >
                {saving ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" />
                    Saving…
                  </>
                ) : editingId ? 'Save changes' : 'Create announcement'}
              </Button>
            </div>
          </div>

          {/* RIGHT — live preview */}
          <PreviewPane form={form} institutionSlug={institutionSlug} />
        </div>
      )}

      {/* ── List view ───────────────────────────────────────────────────────── */}
      {!isEditing && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Megaphone className="h-7 w-7 text-slate-300" />
              </div>
              <h3 className="text-base font-black text-slate-700 mb-1">No announcements yet</h3>
              <p className="text-sm text-slate-400 font-medium max-w-xs mb-5">
                Create a banner or modal message that appears on the student dashboard.
              </p>
              <Button
                onClick={openCreate}
                className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New announcement
              </Button>
            </div>
          ) : (
            announcements.map((a) => {
              const status = computeStatus(a);
              const { label: statusLabel, color: statusColor } = STATUS_CONFIG[status];
              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Style icon */}
                    <div className={cn(
                      'shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center',
                      a.style === 'banner' ? 'bg-blue-50' : 'bg-purple-50'
                    )}>
                      {a.style === 'banner' ? (
                        <Megaphone className="h-5 w-5 text-blue-500" />
                      ) : (
                        <LayoutTemplate className="h-5 w-5 text-purple-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-900 text-sm leading-snug truncate">
                          {a.title}
                        </h3>
                      </div>

                      {/* Chips row */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {/* Status */}
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide', statusColor)}>
                          {status === 'live' && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {status === 'scheduled' && <Clock className="h-2.5 w-2.5" />}
                          {status === 'expired' && <AlertCircle className="h-2.5 w-2.5" />}
                          {status === 'off' && <MinusCircle className="h-2.5 w-2.5" />}
                          {statusLabel}
                        </span>

                        {/* Audience */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wide">
                          <Users className="h-2.5 w-2.5" />
                          {AUDIENCE_LABELS[a.audience]}
                        </span>

                        {/* Display mode */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wide">
                          <Eye className="h-2.5 w-2.5" />
                          {DISPLAY_LABELS[a.display_mode]}
                        </span>

                        {/* Style chip */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wide capitalize">
                          {a.style}
                        </span>
                      </div>

                      {/* Schedule line */}
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {a.ends_at
                          ? `${new Date(a.starts_at).toLocaleDateString()} – ${new Date(a.ends_at).toLocaleDateString()}`
                          : `Starts ${new Date(a.starts_at).toLocaleDateString()}${a.ends_at === null ? ' · No end date' : ''}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                      {/* Active toggle */}
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={() => handleToggleActive(a)}
                        disabled={togglingId === a.id}
                        className="scale-75"
                        aria-label={a.is_active ? 'Deactivate' : 'Activate'}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(a)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteButton onConfirm={() => handleDelete(a.id)} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
