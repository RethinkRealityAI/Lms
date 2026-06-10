'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { withInstitutionPath } from '@/lib/tenant/path';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Key, Loader2, Copy, CheckCircle2, Palette, RotateCcw, Type, SlidersHorizontal, Image as ImageIcon, Database, Mail } from 'lucide-react';
import { asInstitutionTheme, type InstitutionTheme, type BlockStyle } from '@/lib/tenant/institution-theme';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import { pruneContentActivityLog } from '@/lib/db/admin-actions';

// ── Constants shared with course-settings-modal ──────────────────────────────

const BLOCK_STYLES: { value: BlockStyle; label: string; description: string; preview: string }[] = [
  { value: 'glass',      label: 'Light Glass', description: 'Frosted glass · transparent on light slides (default)', preview: 'bg-white/25 border border-slate-200/60 shadow-md backdrop-blur-sm' },
  { value: 'glass-dark', label: 'Dark Glass',  description: 'Smoked liquid glass · for dark or photo backgrounds',  preview: 'bg-slate-900/55 border border-white/15 shadow-md backdrop-blur-sm' },
  { value: 'classic',    label: 'Classic',      description: 'Clean white card',                                     preview: 'bg-white border border-gray-200 shadow-sm' },
  { value: 'none',       label: 'None',         description: 'No container · transparent blocks',                   preview: 'border-2 border-dashed border-gray-200' },
];

const BG_PRESETS = [
  { label: 'Inherit',  value: '' },
  { label: 'White',    value: '#FFFFFF' },
  { label: 'Light',    value: '#F8FAFC' },
  { label: 'Navy',     value: '#1E3A5F' },
  { label: 'Dark',     value: '#0F172A' },
  { label: 'Gradient', value: 'gradient' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

interface ColorRowProps {
  label: string;
  hint?: string;
  value: string | undefined;
  fallback: string;
  onChange: (v: string) => void;
  onReset: () => void;
  resetLabel?: string;
}

function ColorRow({ label, hint, value, fallback, onChange, onReset, resetLabel = 'default' }: ColorRowProps) {
  const val = (value ?? '').trim();
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={val || fallback}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-11 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
        aria-label={label}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {hint && <p className="text-xs text-muted-foreground leading-tight">{hint}</p>}
      </div>
      {val ? (
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground" onClick={onReset}>
          Reset
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground/50 pr-2 shrink-0">{resetLabel}</span>
      )}
    </div>
  );
}

// ── InstitutionThemeCard ─────────────────────────────────────────────────────

function InstitutionThemeCard({
  supabase,
  institutionId,
  institutionSlug,
}: {
  supabase: ReturnType<typeof createClient>;
  institutionId: string | null;
  institutionSlug: string | null;
}) {
  const [theme, setTheme] = useState<InstitutionTheme>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    setLoading(true);
    supabase
      .from('institutions')
      .select('theme')
      .eq('id', institutionId)
      .maybeSingle()
      .then(({ data }) => {
        setTheme(asInstitutionTheme(data?.theme));
        setLoading(false);
      });
  }, [supabase, institutionId]);

  const set = (patch: Partial<InstitutionTheme>) => setTheme((t) => ({ ...t, ...patch }));

  const save = async () => {
    if (!institutionId) return;
    setSaving(true);
    // Convert to a plain record, stripping empty strings so unset fields stay
    // truly inherited at the course level.
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(theme)) {
      if (v != null && String(v).trim()) clean[k] = String(v).trim();
    }
    const { error } = await supabase
      .from('institutions')
      .update({ theme: clean })
      .eq('id', institutionId);
    setSaving(false);
    if (error) toast.error('Failed to save theme', { description: error.message });
    else toast.success('Institution theme saved');
  };

  // Institution branding — used as gradient fallback colours.
  const branding = getInstitutionBranding(institutionSlug);

  // Resolved preview values — show system defaults when the field is unset.
  const lessonColor  = theme.lesson_title_color   || '#64748b';
  const slideColor   = theme.slide_title_color    || '#0F172A';
  const numberColor  = theme.number_color         || '#64748b';
  const progressColor = theme.progress_color      || '#1E3A5F';
  const trackColor   = theme.progress_track_color || '#f1f5f9';
  const blockStyle   = theme.default_block_style  || 'glass';
  const bg           = theme.default_background   ?? '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Global brand defaults for this institution. Every course inherits these unless it overrides them.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-7 max-w-2xl">

            {/* ── BRANDING ─────────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <SectionHeading
                icon={<Palette className="w-4 h-4" />}
                title="Branding"
                hint="Primary colours used for interactive controls, buttons, and navigation chrome"
              />
              <div className="space-y-3">
                <ColorRow
                  label="Brand accent"
                  hint="Sliders, progress bars, primary buttons"
                  value={theme.accent_color}
                  fallback="#1E3A5F"
                  onChange={(v) => set({ accent_color: v })}
                  onReset={() => set({ accent_color: undefined })}
                  resetLabel="inherit"
                />
                <ColorRow
                  label="Slider colour"
                  hint="Slider track + thumb (blank = brand accent)"
                  value={theme.slider_accent}
                  fallback="#1E3A5F"
                  onChange={(v) => set({ slider_accent: v })}
                  onReset={() => set({ slider_accent: undefined })}
                  resetLabel="inherit"
                />
                <ColorRow
                  label="Menu tint"
                  hint="Lesson sidebar chrome tint (blank = neutral frosted glass)"
                  value={theme.chrome_accent}
                  fallback="#1E3A5F"
                  onChange={(v) => set({ chrome_accent: v })}
                  onReset={() => set({ chrome_accent: undefined })}
                  resetLabel="none"
                />
              </div>
            </div>

            {/* ── SLIDE HEADER ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <SectionHeading
                icon={<Type className="w-4 h-4" />}
                title="Slide Header"
                hint="The bar above every slide: lesson eyebrow, slide headline, counter, and progress bar"
              />

              {/* Live preview */}
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 mb-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <span
                      className="text-[11px] font-bold uppercase tracking-wider block leading-tight"
                      style={{ color: lessonColor }}
                    >
                      Lesson Title
                    </span>
                    <span
                      className="text-lg font-black block leading-tight mt-0.5"
                      style={{ color: slideColor }}
                    >
                      Slide Headline
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0 pt-0.5" style={{ color: numberColor }}>
                    3 / 10
                  </span>
                </div>
                <div className="w-full rounded-full h-[3px]" style={{ backgroundColor: trackColor }}>
                  <div className="h-[3px] rounded-full" style={{ width: '30%', backgroundColor: progressColor }} />
                </div>
              </div>

              <div className="space-y-3">
                <ColorRow label="Lesson title (eyebrow)"  value={theme.lesson_title_color}   fallback="#64748b" onChange={(v) => set({ lesson_title_color: v })}   onReset={() => set({ lesson_title_color: undefined })} />
                <ColorRow label="Slide title (headline)"  value={theme.slide_title_color}    fallback="#0F172A" onChange={(v) => set({ slide_title_color: v })}    onReset={() => set({ slide_title_color: undefined })} />
                <ColorRow label="Slide counter"           value={theme.number_color}         fallback="#64748b" onChange={(v) => set({ number_color: v })}         onReset={() => set({ number_color: undefined })} />
                <ColorRow label="Progress bar fill"       value={theme.progress_color}       fallback="#1E3A5F" onChange={(v) => set({ progress_color: v })}       onReset={() => set({ progress_color: undefined })} />
                <ColorRow label="Progress bar track"      value={theme.progress_track_color} fallback="#f1f5f9" onChange={(v) => set({ progress_track_color: v })} onReset={() => set({ progress_track_color: undefined })} />
              </div>
            </div>

            {/* ── SLIDE DEFAULTS ───────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <SectionHeading
                icon={<SlidersHorizontal className="w-4 h-4" />}
                title="Slide Defaults"
                hint="Applied to every slide in every course unless the course or slide overrides them"
              />

              {/* Block style */}
              <p className="text-sm font-medium mb-1">Default Block Style</p>
              <p className="text-xs text-muted-foreground mb-3">How component containers look across all courses</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {BLOCK_STYLES.map((s) => {
                  const active = blockStyle === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set({ default_block_style: s.value })}
                      className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? 'border-[#1E3A5F] bg-blue-50 ring-1 ring-[#1E3A5F]/30'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-full h-5 rounded-md ${s.preview}`} />
                      <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-[#1E3A5F]' : 'text-gray-700'}`}>
                        {s.label}
                      </span>
                      <span className="text-[9px] text-gray-400 leading-tight">{s.description}</span>
                    </button>
                  );
                })}
              </div>
              {theme.default_block_style && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground mb-5"
                  onClick={() => set({ default_block_style: undefined })}
                >
                  ↩ Reset to Light Glass
                </button>
              )}
              {!theme.default_block_style && <div className="mb-5" />}

              {/* Default background */}
              <p className="text-sm font-medium mb-1">Default Background</p>
              <p className="text-xs text-muted-foreground mb-3">Slide background for all courses unless overridden</p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.value || 'inherit'}
                    type="button"
                    onClick={() => set({ default_background: preset.value || undefined })}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors border ${
                      bg === preset.value
                        ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {bg.startsWith('#') && (
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={bg}
                    onChange={(e) => set({ default_background: e.target.value })}
                    className="h-9 w-11 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                    aria-label="Custom background colour"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{bg}</span>
                </div>
              )}
            </div>

            {/* ── TITLE SLIDE ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-5">
              <SectionHeading
                icon={<ImageIcon className="w-4 h-4" />}
                title="Title Slide"
                hint="Default appearance for title slides across all courses"
              />

              {/* Gradient */}
              <div>
                <p className="text-sm font-medium mb-1">Gradient colours</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Shown when no background image is set. Blank = use institution brand colours
                  ({branding.primaryColor} → {branding.secondaryColor}).
                </p>
                {/* Live gradient preview */}
                <div
                  className="w-full h-10 rounded-lg mb-3 border border-gray-200"
                  style={{
                    background: `linear-gradient(to right, ${theme.title_gradient_from || branding.primaryColor}, ${theme.title_gradient_to || branding.secondaryColor})`,
                  }}
                />
                <div className="space-y-3">
                  <ColorRow
                    label="Gradient start"
                    value={theme.title_gradient_from}
                    fallback={branding.primaryColor}
                    onChange={(v) => set({ title_gradient_from: v })}
                    onReset={() => set({ title_gradient_from: undefined })}
                    resetLabel="brand colour"
                  />
                  <ColorRow
                    label="Gradient end"
                    value={theme.title_gradient_to}
                    fallback={branding.secondaryColor}
                    onChange={(v) => set({ title_gradient_to: v })}
                    onReset={() => set({ title_gradient_to: undefined })}
                    resetLabel="brand colour"
                  />
                </div>
              </div>

              {/* Default background image */}
              <div>
                <p className="text-sm font-medium mb-1">Default background image</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Shown on title slides that have no per-lesson image. Overrides gradient.
                </p>
                {institutionId && (
                  <DropZoneUploader
                    bucket="canva-exports"
                    pathPrefix={`institution-assets/${institutionId}/title-bg/`}
                    accept="image/*"
                    label="Upload background image"
                    currentUrl={theme.default_title_background_url ?? undefined}
                    onUpload={(url) => set({ default_title_background_url: url })}
                    onRemove={() => set({ default_title_background_url: undefined })}
                    previewMode="image"
                  />
                )}
              </div>

              {/* Logo */}
              <div>
                <p className="text-sm font-medium mb-1">Default logo</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Shown in the bottom-left footer of every title slide.
                </p>
                {institutionId && (
                  <DropZoneUploader
                    bucket="canva-exports"
                    pathPrefix={`institution-assets/${institutionId}/logo/`}
                    accept="image/*"
                    label="Upload logo image"
                    currentUrl={theme.default_title_logo_url ?? undefined}
                    onUpload={(url) => set({ default_title_logo_url: url })}
                    onRemove={() => set({ default_title_logo_url: undefined })}
                    previewMode="image"
                    className="mb-2"
                  />
                )}
                <Label htmlFor="title-logo" className="text-xs text-muted-foreground">Or paste a URL</Label>
                <Input
                  id="title-logo"
                  className="mt-1"
                  placeholder="https://…/logo.png  (blank = use institution logo)"
                  value={theme.default_title_logo_url ?? ''}
                  onChange={(e) => set({ default_title_logo_url: e.target.value || undefined })}
                />
              </div>
            </div>

            {/* ── ACTIONS ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5"
                onClick={() => setTheme({})}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset all to defaults
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  'Save theme'
                )}
              </Button>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Verification codes ────────────────────────────────────────────────────────

interface VerificationCode {
  id: string;
  code: string;
  role: string;
  description: string;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  institution_id: string | null;
}

/** Resolve the current tenant's institution id + slug from the middleware cookie. */
function useInstitutionContext(supabase: ReturnType<typeof createClient>) {
  const [ctx, setCtx] = useState<{ id: string | null; slug: string | null }>({ id: null, slug: null });
  useEffect(() => {
    const slugCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith('institution_slug='));
    const slug = slugCookie?.split('=')[1] ?? null;
    if (slug) {
      supabase
        .from('institutions')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCtx({ id: data.id, slug });
        });
    }
  }, [supabase]);
  return ctx;
}

export default function AdminSettingsPage() {
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<VerificationCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    max_uses: 10,
    expires_at: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pruneDays, setPruneDays] = useState('90');
  const [pruning, setPruning] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const { id: institutionId, slug: institutionSlug } = useInstitutionContext(supabase);

  const loadCodes = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load verification codes', { description: error.message });
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  }, [supabase, institutionId]);

  useEffect(() => {
    if (institutionId) loadCodes();
  }, [institutionId, loadCodes]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingCode) {
        const { error } = await supabase
          .from('verification_codes')
          .update({
            description: formData.description,
            max_uses: formData.max_uses,
            expires_at: formData.expires_at || null,
            is_active: formData.is_active,
          })
          .eq('id', editingCode.id);

        if (error) throw error;
        toast.success('Verification code updated successfully');
      } else {
        const { error } = await supabase
          .from('verification_codes')
          .insert([{
            code: formData.code || generateRandomCode(),
            role: 'admin',
            description: formData.description,
            max_uses: formData.max_uses,
            expires_at: formData.expires_at || null,
            is_active: formData.is_active,
            created_by: user?.id,
            institution_id: institutionId,
          }]);

        if (error) throw error;
        toast.success('Verification code created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadCodes();
    } catch (error: unknown) {
      toast.error('Operation failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (code: VerificationCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      max_uses: code.max_uses,
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      is_active: code.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this verification code?')) return;

    const { error } = await supabase
      .from('verification_codes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete verification code', { description: error.message });
    } else {
      toast.success('Verification code deleted successfully');
      loadCodes();
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      description: '',
      max_uses: 10,
      expires_at: '',
      is_active: true,
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  const isCodeValid = (code: VerificationCode) => {
    if (!code.is_active) return false;
    if (code.current_uses >= code.max_uses) return false;
    if (code.expires_at && new Date(code.expires_at) < new Date()) return false;
    return true;
  };

  const handlePruneActivityLog = async () => {
    const days = Math.max(7, parseInt(pruneDays, 10) || 90);
    if (!window.confirm(`Delete editor activity log rows older than ${days} days? This cannot be undone.`)) {
      return;
    }
    setPruning(true);
    try {
      const deleted = await pruneContentActivityLog(supabase, days);
      toast.success(`Pruned ${deleted.toLocaleString()} activity log row${deleted === 1 ? '' : 's'}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to prune activity log');
    } finally {
      setPruning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Institution appearance &amp; instructor signup codes
          </p>
        </div>
      </div>

      <InstitutionThemeCard supabase={supabase} institutionId={institutionId} institutionSlug={institutionSlug} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Editor Activity Log</CardTitle>
              <CardDescription>
                Prune old auto-save entries from the content activity log. Keeps recent editor history only.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-md">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="prune-days">Keep last N days</Label>
            <Input
              id="prune-days"
              type="number"
              min={7}
              max={365}
              value={pruneDays}
              onChange={(e) => setPruneDays(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={handlePruneActivityLog} disabled={pruning}>
            {pruning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pruning…
              </>
            ) : (
              'Prune old rows'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Email Studio</CardTitle>
              <CardDescription>
                Edit certificate and assignment templates, preview messages, and send bulk email to learners.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={withInstitutionPath('/admin/email', pathname)}>Open Email Studio</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Verification Codes</CardTitle>
            <CardDescription>
              Create and manage codes that allow new instructors to sign up
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Code
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification codes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first verification code to allow instructors to sign up
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {codes.map((code) => {
                const valid = isCodeValid(code);
                return (
                  <div
                    key={code.id}
                    className={`p-4 border rounded-lg ${valid ? 'border-border' : 'border-destructive/30 bg-destructive/5'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-lg font-mono font-bold bg-muted px-3 py-1 rounded">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(code.code, code.id)}
                          >
                            {copiedId === code.id ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          {valid ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="destructive">
                              {!code.is_active ? 'Disabled' : code.current_uses >= code.max_uses ? 'Used Up' : 'Expired'}
                            </Badge>
                          )}
                        </div>
                        {code.description && (
                          <p className="text-sm text-muted-foreground mb-2">{code.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Uses: {code.current_uses} / {code.max_uses}</span>
                          {code.expires_at && (
                            <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                          )}
                          <span>Created: {new Date(code.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(code)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Verification Code' : 'Create Verification Code'}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the verification code settings.'
                : 'Create a new code for instructors to use during signup.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!editingCode && (
                <div className="space-y-2">
                  <Label htmlFor="code">Code (leave empty to auto-generate)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g., ADMIN2026"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, code: generateRandomCode() })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Code for January 2026 instructor cohort"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_uses">Maximum Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this code to be used for signup
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingCode ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingCode ? (
                  'Update Code'
                ) : (
                  'Create Code'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
