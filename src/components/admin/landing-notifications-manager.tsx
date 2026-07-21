'use client';

/**
 * Admin Landing-Page Notification Manager.
 *
 * Same shape as the Announcements manager (list view + left-form / right-live-
 * preview editor), but for the PUBLIC landing-page notification (migration 065).
 * The live preview reuses the exact `LandingNotificationView` students see, so
 * the admin edits content AND look (accent, icon, logo, CTA button + secondary
 * link, schedule) with byte-for-byte fidelity.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import {
  createLandingNotification,
  updateLandingNotification,
  deleteLandingNotification,
  type LandingNotification,
  type LandingNotificationInput,
  type LandingNotificationIcon,
} from '@/lib/db/landing-notifications';
import { LandingNotificationView } from '@/components/landing/landing-notification-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Bell, Plus, Pencil, Trash2, X, Calendar, Eye, Clock, CheckCircle2, MinusCircle,
  AlertCircle, Megaphone, Info, Sparkles, Heart, PartyPopper, Ban,
} from 'lucide-react';

interface LandingNotificationsManagerProps {
  initialNotifications: LandingNotification[];
  institutionId: string;
  institutionSlug: string;
}

type FormState = Omit<LandingNotificationInput, 'starts_at' | 'ends_at'> & {
  starts_at: string;
  ends_at: string;
};

// ── datetime helpers ─────────────────────────────────────────────────────────
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
}
function localToIso(local: string): string {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
}
function nowLocal(): string { return new Date().toISOString().slice(0, 16); }

function computeStatus(n: LandingNotification): 'live' | 'scheduled' | 'expired' | 'off' {
  if (!n.is_active) return 'off';
  const now = Date.now();
  const start = new Date(n.starts_at).getTime();
  const end = n.ends_at ? new Date(n.ends_at).getTime() : null;
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

const ICON_OPTIONS: { id: LandingNotificationIcon; label: string; Icon: React.ComponentType<{ className?: string }> | null }[] = [
  { id: 'party', label: 'Celebrate', Icon: PartyPopper },
  { id: 'megaphone', label: 'Announce', Icon: Megaphone },
  { id: 'info', label: 'Info', Icon: Info },
  { id: 'sparkles', label: 'Sparkle', Icon: Sparkles },
  { id: 'heart', label: 'Heart', Icon: Heart },
  { id: 'bell', label: 'Bell', Icon: Bell },
  { id: 'none', label: 'None', Icon: null },
];

function defaultForm(): FormState {
  return {
    title: '',
    body: '',
    icon: 'party',
    accent_color: null,
    show_logo: false,
    cta_label: null,
    cta_url: null,
    secondary_cta_label: null,
    secondary_cta_url: null,
    dismissible: true,
    starts_at: nowLocal(),
    ends_at: '',
    is_active: true,
  };
}

function notificationToForm(n: LandingNotification): FormState {
  return {
    title: n.title,
    body: n.body,
    icon: n.icon,
    accent_color: n.accent_color,
    show_logo: n.show_logo,
    cta_label: n.cta_label,
    cta_url: n.cta_url,
    secondary_cta_label: n.secondary_cta_label,
    secondary_cta_url: n.secondary_cta_url,
    dismissible: n.dismissible,
    starts_at: isoToLocal(n.starts_at),
    ends_at: isoToLocal(n.ends_at),
    is_active: n.is_active,
  };
}

// ── Color swatches (mirrors announcements manager) ───────────────────────────
function ColorSwatches({
  branding, value, onChange,
}: { branding: ReturnType<typeof getInstitutionBranding>; value: string | null; onChange: (v: string | null) => void }) {
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
              value === color ? 'border-slate-700 scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-white',
            )}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          type="color"
          value={value || branding.primaryColor}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-full border-2 border-white cursor-pointer shadow-sm hover:scale-110 transition-all p-0 appearance-none overflow-hidden"
          title="Custom color"
        />
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
      {value && <p className="text-[11px] text-slate-400 font-mono">{value}</p>}
    </div>
  );
}

function IconPicker({ value, onChange }: { value: LandingNotificationIcon; onChange: (v: LandingNotificationIcon) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ICON_OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 transition-all',
            value === id ? 'border-slate-700 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
          )}
        >
          {Icon ? <Icon className={cn('h-4 w-4', value === id ? 'text-slate-900' : 'text-slate-400')} /> : <Ban className={cn('h-4 w-4', value === id ? 'text-slate-900' : 'text-slate-400')} />}
          <span className={cn('text-[10px] font-bold', value === id ? 'text-slate-800' : 'text-slate-400')}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Delete confirm (inline two-step) ─────────────────────────────────────────
function DeleteButton({ onConfirm, disabled }: { onConfirm: () => void; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="destructive" className="h-8 text-xs font-black" onClick={onConfirm} disabled={disabled}>Delete</Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    );
  }
  return (
    <Button
      size="sm" variant="ghost"
      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
      onClick={() => setConfirming(true)} disabled={disabled} title="Delete notification"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

// ── Live preview ─────────────────────────────────────────────────────────────
function PreviewPane({ form, institutionSlug }: { form: FormState; institutionSlug: string }) {
  const branding = getInstitutionBranding(institutionSlug);
  return (
    <div className="lg:sticky lg:top-20 self-start">
      <div className="rounded-2xl bg-slate-100 p-5 space-y-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Live Preview
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Below the landing hero</p>
        </div>

        {/* Faint hero skeleton above */}
        <div className="rounded-xl bg-white/70 border border-slate-200 p-4 space-y-2">
          <div className="h-3 w-1/2 rounded-full bg-slate-200" />
          <div className="h-2 w-2/3 rounded-full bg-slate-100" />
          <div className="h-8 w-28 rounded-lg bg-slate-200 mt-2" />
        </div>

        <LandingNotificationView
          notification={{
            id: 'preview',
            title: form.title || 'Notification title…',
            body: form.body || 'Your message body appears here. Leave a blank line to start a new paragraph.',
            icon: form.icon,
            accent_color: form.accent_color,
            show_logo: form.show_logo,
            cta_label: form.cta_label,
            cta_url: form.cta_url,
            secondary_cta_label: form.secondary_cta_label,
            secondary_cta_url: form.secondary_cta_url,
            dismissible: form.dismissible,
          }}
          branding={{
            institutionName: branding.fullName,
            logoUrl: branding.logoUrl,
            primaryColor: branding.primaryColor,
          }}
          previewMode
        />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function LandingNotificationsManager({
  initialNotifications,
  institutionId,
  institutionSlug,
}: LandingNotificationsManagerProps) {
  const supabase = createClient();
  const branding = getInstitutionBranding(institutionSlug);

  const [notifications, setNotifications] = useState<LandingNotification[]>(initialNotifications);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const openCreate = () => { setForm(defaultForm()); setEditingId(null); setIsEditing(true); };
  const openEdit = (n: LandingNotification) => { setForm(notificationToForm(n)); setEditingId(n.id); setIsEditing(true); };
  const closeEditor = () => { setIsEditing(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    if (!form.body.trim()) { toast.error('Body text is required.'); return; }
    setSaving(true);
    try {
      const input: LandingNotificationInput = {
        ...form,
        title: form.title.trim(),
        body: form.body.trim(),
        cta_label: form.cta_label?.trim() || null,
        cta_url: form.cta_url?.trim() || null,
        secondary_cta_label: form.secondary_cta_label?.trim() || null,
        secondary_cta_url: form.secondary_cta_url?.trim() || null,
        accent_color: form.accent_color || null,
        starts_at: localToIso(form.starts_at),
        ends_at: form.ends_at ? localToIso(form.ends_at) : null,
      };
      if (editingId) {
        const updated = await updateLandingNotification(supabase, institutionId, editingId, input);
        setNotifications((prev) => prev.map((n) => (n.id === editingId ? updated : n)));
        toast.success('Notification updated.');
      } else {
        const created = await createLandingNotification(supabase, institutionId, input);
        setNotifications((prev) => [created, ...prev]);
        toast.success('Notification created.');
      }
      closeEditor();
    } catch (err) {
      toast.error('Failed to save', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLandingNotification(supabase, institutionId, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (editingId === id) closeEditor();
      toast.success('Notification deleted.');
    } catch (err) {
      toast.error('Could not delete', { description: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  const handleToggleActive = async (n: LandingNotification) => {
    setTogglingId(n.id);
    try {
      const updated = await updateLandingNotification(supabase, institutionId, n.id, { is_active: !n.is_active });
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
    } catch (err) {
      toast.error('Could not update', { description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-slate-400" />
            Landing notification
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            The banner shown below the hero on your public landing page
          </p>
        </div>
        {!isEditing && (
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> New notification
          </Button>
        )}
      </div>

      {/* Editor */}
      {isEditing && (
        <div className="grid lg:grid-cols-[minmax(0,440px)_1fr] gap-6 items-start">
          <div className="space-y-4">
            {/* Message */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Message</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Title</Label>
                  <Input placeholder="The HCP E-Learning Program is back!" value={form.title} onChange={(e) => setField('title', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Body</Label>
                  <textarea
                    value={form.body}
                    onChange={(e) => setField('body', e.target.value)}
                    placeholder="Type your message here. Leave a blank line to start a new paragraph."
                    rows={7}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Supports <code className="bg-slate-100 px-1 rounded">{'{{institutionName}}'}</code>. Blank line = new paragraph.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Icon</Label>
                  <IconPicker value={form.icon} onChange={(v) => setField('icon', v)} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Accent color</Label>
                  <ColorSwatches branding={branding} value={form.accent_color} onChange={(v) => setField('accent_color', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-slate-700">Show logo</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Use the institution logo instead of the icon</p>
                  </div>
                  <Switch checked={form.show_logo} onCheckedChange={(v) => setField('show_logo', v)} />
                </div>
              </CardContent>
            </Card>

            {/* Buttons & links */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Buttons &amp; links</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Button label</Label>
                    <Input placeholder="Sign in to continue" value={form.cta_label ?? ''} onChange={(e) => setField('cta_label', e.target.value || null)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Button link</Label>
                    <Input placeholder="/login" value={form.cta_url ?? ''} onChange={(e) => setField('cta_url', e.target.value || null)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Secondary link label</Label>
                    <Input placeholder="See how to get support" value={form.secondary_cta_label ?? ''} onChange={(e) => setField('secondary_cta_label', e.target.value || null)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-bold text-slate-700">Secondary link</Label>
                    <Input placeholder="#support" value={form.secondary_cta_url ?? ''} onChange={(e) => setField('secondary_cta_url', e.target.value || null)} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Links can be an on-page anchor (<code className="bg-slate-100 px-1 rounded">#support</code>), a full URL
                  (<code className="bg-slate-100 px-1 rounded">https://…</code>), or an app path (<code className="bg-slate-100 px-1 rounded">/login</code>).
                </p>
              </CardContent>
            </Card>

            {/* Schedule & behavior */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wide">Schedule &amp; behavior</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Start date &amp; time</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setField('starts_at', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-700">End date &amp; time</Label>
                    {form.ends_at && (
                      <button type="button" onClick={() => setField('ends_at', '')} className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                        <X className="h-3 w-3" /> No end date
                      </button>
                    )}
                  </div>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setField('ends_at', e.target.value)} />
                  {!form.ends_at && <p className="text-[11px] text-slate-400 font-medium">Leave blank to show indefinitely</p>}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <Label className="font-bold text-slate-700">Visitors can dismiss</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Show a close button (remembered in their browser)</p>
                  </div>
                  <Switch checked={form.dismissible} onCheckedChange={(v) => setField('dismissible', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-slate-700">Active</Label>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Toggle off to hide without deleting</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-3 pb-4">
              <Button variant="outline" onClick={closeEditor} disabled={saving} className="font-bold rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl gap-1.5">
                {saving ? (
                  <><span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full inline-block" /> Saving…</>
                ) : editingId ? 'Save changes' : 'Create notification'}
              </Button>
            </div>
          </div>

          <PreviewPane form={form} institutionSlug={institutionSlug} />
        </div>
      )}

      {/* List */}
      {!isEditing && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Bell className="h-7 w-7 text-slate-300" />
              </div>
              <h3 className="text-base font-black text-slate-700 mb-1">No landing notifications yet</h3>
              <p className="text-sm text-slate-400 font-medium max-w-xs mb-5">
                Create a banner that appears below the hero on your public landing page.
              </p>
              <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-xl gap-1.5">
                <Plus className="h-4 w-4" /> New notification
              </Button>
            </div>
          ) : (
            notifications.map((n) => {
              const status = computeStatus(n);
              const { label: statusLabel, color: statusColor } = STATUS_CONFIG[status];
              return (
                <div key={n.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50" style={{ color: n.accent_color || branding.primaryColor }}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-sm leading-snug truncate mb-1">{n.title}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide', statusColor)}>
                          {status === 'live' && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {status === 'scheduled' && <Clock className="h-2.5 w-2.5" />}
                          {status === 'expired' && <AlertCircle className="h-2.5 w-2.5" />}
                          {status === 'off' && <MinusCircle className="h-2.5 w-2.5" />}
                          {statusLabel}
                        </span>
                        {n.cta_label && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wide">
                            Button
                          </span>
                        )}
                        {n.dismissible && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wide">
                            Dismissible
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {n.ends_at
                          ? `${new Date(n.starts_at).toLocaleDateString()} – ${new Date(n.ends_at).toLocaleDateString()}`
                          : `Starts ${new Date(n.starts_at).toLocaleDateString()} · No end date`}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <Switch
                        checked={n.is_active}
                        onCheckedChange={() => handleToggleActive(n)}
                        disabled={togglingId === n.id}
                        className="scale-75"
                        aria-label={n.is_active ? 'Deactivate' : 'Activate'}
                      />
                      <Button size="sm" variant="ghost" onClick={() => openEdit(n)} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteButton onConfirm={() => handleDelete(n.id)} />
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
