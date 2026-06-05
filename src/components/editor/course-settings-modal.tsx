'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Type, SlidersHorizontal, RotateCcw, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { ColorSwatch } from './theme-editor/color-swatch';
import { DropZoneUploader } from './drop-zone-uploader';
import { useEditorStore } from './editor-store-context';
import { DEFAULT_COURSE_THEME, type CourseThemeSettings, type BlockStyle } from '@/lib/content/course-theme';
import { createClient } from '@/lib/supabase/client';
import { getSurveyTemplates, type SurveyTemplate } from '@/lib/db/survey-templates';
import { getCompletionSurvey, setCourseCompletionSurveyTemplate } from '@/lib/db/course-feedback';

const BLOCK_STYLES: { value: BlockStyle; label: string; description: string; preview: string }[] = [
  { value: 'glass', label: 'Light Glass', description: 'Frosted glass · transparent on light slides (default)', preview: 'bg-white/25 border border-slate-200/60 shadow-md backdrop-blur-sm' },
  { value: 'glass-dark', label: 'Dark Glass', description: 'Smoked liquid glass · for dark or photo backgrounds', preview: 'bg-slate-900/55 border border-white/15 shadow-md backdrop-blur-sm' },
  { value: 'classic', label: 'Classic', description: 'Clean white card', preview: 'bg-white border border-gray-200 shadow-sm' },
  { value: 'none', label: 'None', description: 'No container · transparent blocks', preview: 'border-2 border-dashed border-gray-200' },
];

const BG_PRESETS = [
  { label: 'Inherit', value: '' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Light', value: '#F8FAFC' },
  { label: 'Navy', value: '#1E3A5F' },
  { label: 'Dark', value: '#0F172A' },
  { label: 'Gradient', value: 'gradient' },
];

function SectionHeading({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="mt-0.5 text-[#1E3A5F]">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

interface CourseSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseSettingsModal({ open, onOpenChange }: CourseSettingsModalProps) {
  const courseId = useEditorStore((s) => s.courseId);
  const institutionId = useEditorStore((s) => s.institutionId);
  const theme = useEditorStore((s) => s.themeSettings);
  const updateThemeSettings = useEditorStore((s) => s.updateThemeSettings);
  const [saving, setSaving] = useState(false);

  // ── Completion feedback survey ──────────────────────────────────────────────
  const [surveyTemplates, setSurveyTemplates] = useState<SurveyTemplate[]>([]);
  const [selectedSurveyTemplateId, setSelectedSurveyTemplateId] = useState<string | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveySaving, setSurveySaving] = useState(false);

  useEffect(() => {
    if (!open || !courseId || !institutionId) return;
    let cancelled = false;
    setSurveyLoading(true);
    const supabase = createClient();
    Promise.all([
      getSurveyTemplates(supabase, institutionId),
      getCompletionSurvey(supabase, courseId),
    ]).then(([templates, current]) => {
      if (cancelled) return;
      setSurveyTemplates(templates);
      setSelectedSurveyTemplateId(current.templateId);
      setSurveyLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, courseId, institutionId]);

  const handleSurveyChange = async (value: string) => {
    const newId = value === '__none__' ? null : value;
    if (!courseId) return;
    setSurveySaving(true);
    const supabase = createClient();
    const { error } = await setCourseCompletionSurveyTemplate(supabase, courseId, newId);
    setSurveySaving(false);
    if (error) {
      toast.error('Failed to save survey', { description: error });
    } else {
      setSelectedSurveyTemplateId(newId);
      toast.success(newId ? 'Completion survey set' : 'Completion survey cleared');
    }
  };

  const set = (changes: Partial<CourseThemeSettings>) => updateThemeSettings(changes);

  const handleSave = async () => {
    if (!courseId || !institutionId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('courses')
      .update({ theme_settings: theme })
      .eq('id', courseId)
      .eq('institution_id', institutionId);
    setSaving(false);
    if (error) toast.error('Failed to save', { description: error.message });
    else toast.success('Course theme saved');
  };

  const lessonColor = theme.lesson_title_color || DEFAULT_COURSE_THEME.lesson_title_color;
  const slideColor = theme.slide_title_color || DEFAULT_COURSE_THEME.slide_title_color;
  const numberColor = theme.number_color || DEFAULT_COURSE_THEME.number_color;
  const progressColor = theme.progress_color || DEFAULT_COURSE_THEME.progress_color;
  const trackColor = theme.progress_track_color || DEFAULT_COURSE_THEME.progress_track_color;
  const blockStyle = theme.default_block_style || DEFAULT_COURSE_THEME.default_block_style;
  const bg = theme.default_background ?? '';
  const bgImage = theme.default_background_image || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Course Settings
          </DialogTitle>
          <DialogDescription>
            Global defaults for this course. Individual slides can still override these. Changes save when you press <span className="font-semibold">Save</span>.
          </DialogDescription>
        </DialogHeader>

        {/* ── HEADER GROUP ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 mb-3">
          <SectionHeading
            icon={<Type className="w-4 h-4" />}
            title="Slide Header"
            hint="The bar above every slide: titles, counter, and progress bar"
          />

          {/* Live preview of the header */}
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 mb-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider block leading-tight" style={{ color: lessonColor }}>
                  Lesson Title
                </span>
                <span className="text-lg font-black block leading-tight mt-0.5" style={{ color: slideColor }}>
                  Slide Headline
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums shrink-0 pt-0.5" style={{ color: numberColor }}>3 / 10</span>
            </div>
            <div className="w-full rounded-full h-[3px]" style={{ backgroundColor: trackColor }}>
              <div className="h-[3px] rounded-full" style={{ width: '30%', backgroundColor: progressColor }} />
            </div>
          </div>

          <div className="space-y-2.5">
            <ColorSwatch label="Lesson title (eyebrow)" value={lessonColor} onChange={(v) => set({ lesson_title_color: v })} />
            <ColorSwatch label="Slide title (headline)" value={slideColor} onChange={(v) => set({ slide_title_color: v })} />
            <ColorSwatch label="Slide number" value={numberColor} onChange={(v) => set({ number_color: v })} />
            <ColorSwatch label="Progress bar" value={progressColor} onChange={(v) => set({ progress_color: v })} />
            <ColorSwatch label="Progress track" value={trackColor} onChange={(v) => set({ progress_track_color: v })} />
          </div>

          {/* ── Branding overrides (inherit the institution theme unless set) ── */}
          <div className="mt-4 pt-3 border-t border-gray-200/70 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Branding (overrides institution)</p>
            {([
              { key: 'accent_color', label: 'Accent', hint: 'Primary accent / buttons' },
              { key: 'slider_accent', label: 'Slider', hint: 'Slider track + thumb' },
              { key: 'chrome_accent', label: 'Menu tint', hint: 'Lesson-menu tint (blank = glass)' },
            ] as const).map((row) => {
              const val = (theme[row.key] as string | undefined) ?? '';
              return (
                <div key={row.key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={val || '#1E3A5F'}
                    onChange={(e) => set({ [row.key]: e.target.value })}
                    className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                    aria-label={row.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-700 leading-tight">{row.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight truncate">{row.hint}</p>
                  </div>
                  {val
                    ? <button type="button" onClick={() => set({ [row.key]: undefined })} className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0">Reset</button>
                    : <span className="text-[10px] text-gray-300 shrink-0">inherit</span>}
                </div>
              );
            })}

            {/* Title slide gradient */}
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pt-1">Title slide gradient</p>
            {([
              { key: 'title_gradient_from', label: 'Gradient start', hint: 'Top-left colour (blank = institution/brand default)' },
              { key: 'title_gradient_to',   label: 'Gradient end',   hint: 'Bottom-right colour (blank = institution/brand default)' },
            ] as const).map((row) => {
              const val = (theme[row.key] as string | undefined) ?? '';
              return (
                <div key={row.key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={val || '#1E3A5F'}
                    onChange={(e) => set({ [row.key]: e.target.value })}
                    className="h-8 w-9 shrink-0 rounded border border-gray-200 cursor-pointer bg-white p-0.5"
                    aria-label={row.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-700 leading-tight">{row.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight truncate">{row.hint}</p>
                  </div>
                  {val
                    ? <button type="button" onClick={() => set({ [row.key]: undefined })} className="text-[10px] font-medium text-gray-400 hover:text-red-500 shrink-0">Reset</button>
                    : <span className="text-[10px] text-gray-300 shrink-0">inherit</span>}
                </div>
              );
            })}

            {/* Title-slide logo */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Title-slide logo</label>
              <DropZoneUploader
                bucket="canva-exports"
                pathPrefix={`courses/${courseId}/title/logo/`}
                accept="image/*"
                label="Upload logo or paste URL below"
                currentUrl={theme.title_logo_url ?? undefined}
                onUpload={(url) => set({ title_logo_url: url })}
                onRemove={() => set({ title_logo_url: undefined })}
                previewMode="image"
              />
              <input
                type="url"
                value={theme.title_logo_url ?? ''}
                onChange={(e) => set({ title_logo_url: e.target.value || undefined })}
                placeholder="Or paste URL (blank = use institution default)"
                className="w-full mt-1.5 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>

            {/* Default title slide background image */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Title slide background image</label>
              <p className="text-[10px] text-gray-400 mb-1.5">Shown on all title slides unless the lesson has its own image. Overrides gradient.</p>
              {courseId && (
                <DropZoneUploader
                  bucket="canva-exports"
                  pathPrefix={`courses/${courseId}/title/bg/`}
                  accept="image/*"
                  label="Upload background image"
                  currentUrl={theme.default_title_background_url ?? undefined}
                  onUpload={(url) => set({ default_title_background_url: url })}
                  onRemove={() => set({ default_title_background_url: undefined })}
                  previewMode="image"
                />
              )}
            </div>
          </div>
        </div>

        {/* ── SLIDE GROUP ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <SectionHeading
            icon={<SlidersHorizontal className="w-4 h-4" />}
            title="Slide Defaults"
            hint="Applied to every slide unless the slide sets its own"
          />

          {/* Default block style */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Default Block Style</p>
          <p className="text-[10px] text-gray-400 mb-2.5">How component containers look across the course</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {BLOCK_STYLES.map((s) => {
              const active = blockStyle === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set({ default_block_style: s.value })}
                  className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                    active ? 'border-[#1E3A5F] bg-blue-50 ring-1 ring-[#1E3A5F]/30' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-full h-6 rounded-md ${s.preview}`} />
                  <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-[#1E3A5F]' : 'text-gray-700'}`}>{s.label}</span>
                  <span className="text-[9px] text-gray-400 leading-tight">{s.description}</span>
                </button>
              );
            })}
          </div>

          {/* Default background */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Default Background</p>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.value || 'inherit'}
                type="button"
                onClick={() => set({ default_background: preset.value || undefined })}
                className={`px-2 py-1 text-xs rounded-lg transition-colors border ${
                  bg === preset.value ? 'border-[#1E3A5F] text-[#1E3A5F] bg-blue-50' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {bg.startsWith('#') && (
            <div className="mb-3">
              <ColorSwatch label="Custom colour" value={bg} onChange={(v) => set({ default_background: v })} />
            </div>
          )}

          {/* Default background image */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-3">
            <ImageIcon className="w-3 h-3 inline mr-1" />Default Background Image
          </p>
          {courseId && (
            <DropZoneUploader
              bucket="block-media"
              pathPrefix={`courses/${courseId}/background/`}
              accept="image/*"
              label="Drop image or click to upload"
              currentUrl={bgImage ?? undefined}
              onUpload={(url) => set({ default_background_image: url })}
              onRemove={() => set({ default_background_image: undefined })}
              previewMode="image"
            />
          )}
          <p className="text-[10px] text-gray-400 mt-1">Shown behind slides that don&apos;t set their own background</p>
        </div>

        {/* ── COMPLETION FEEDBACK SURVEY ───────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <SectionHeading
            icon={<MessageSquare className="w-4 h-4" />}
            title="Completion Feedback Survey"
            hint="Shown (optionally) to learners on the completion slide"
          />

          {surveyLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading templates…
            </div>
          ) : surveyTemplates.length === 0 ? (
            <p className="text-xs text-gray-500">
              No survey templates found for this institution.{' '}
              <span className="text-gray-400">
                Create one by adding a Survey block to a lesson, then using the Save as Template option in the survey editor toolbar.
              </span>
            </p>
          ) : (
            <div className="space-y-1.5">
              <Select
                value={selectedSurveyTemplateId ?? '__none__'}
                onValueChange={handleSurveyChange}
              >
                <SelectTrigger className="w-full text-xs h-8" disabled={surveySaving}>
                  {surveySaving
                    ? <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>
                    : <SelectValue placeholder="None (no survey)" />
                  }
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs text-gray-500">None (no survey)</SelectItem>
                  {surveyTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                      {t.description && (
                        <span className="ml-1 text-gray-400">— {t.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">
                Saves immediately on change. Learners see this survey after completing the course.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => set({
              lesson_title_color: undefined, slide_title_color: undefined, number_color: undefined,
              progress_color: undefined, progress_track_color: undefined, default_block_style: undefined,
              default_background: undefined, default_background_image: undefined,
              accent_color: undefined, slider_accent: undefined, chrome_accent: undefined, title_logo_url: undefined,
              title_gradient_from: undefined, title_gradient_to: undefined, default_title_background_url: undefined,
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
