'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
import {
  ClipboardList, Plus, Pencil, Trash2, Search, Info,
  ChevronDown, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { SurveyTemplate } from '@/lib/db/survey-templates';
import {
  createSurveyTemplate,
  updateSurveyTemplate,
  deleteSurveyTemplate,
} from '@/lib/db/survey-templates';
import type { SurveyAssignment } from '@/lib/db/survey-assignments';
import {
  setDefaultSurveyAssignment,
  setCourseSurveyAssignment,
  setProgramSurveyAssignment,
} from '@/lib/db/survey-assignments';
import type { SurveyData } from '@/lib/content/blocks/survey/schema';
import { createDefaultQuestion } from '@/lib/content/blocks/survey/schema';
import { SurveyEditor } from '@/components/blocks/survey/editor';
import type { ProgramWithCourses } from '@/types';

// ---------------------------------------------------------------------------
// Prop types
// ---------------------------------------------------------------------------

interface Course {
  id: string;
  title: string;
  display_order: number | null;
  completion_survey_template_id: string | null;
}

interface SurveysManagerProps {
  institutionId: string;
  institutionSlug: string;
  initialTemplates: SurveyTemplate[];
  initialAssignments: SurveyAssignment[];
  courses: Course[];
  programs: ProgramWithCourses[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyData(): SurveyData {
  return {
    title: 'New Survey',
    description: '',
    submit_label: 'Submit',
    questions: [createDefaultQuestion()],
  };
}

// ---------------------------------------------------------------------------
// Template Editor Panel (inline full-width, not a dialog)
// ---------------------------------------------------------------------------

interface TemplateEditorPanelProps {
  initial: SurveyTemplate | null; // null = create mode
  onSave: (name: string, description: string, data: SurveyData) => Promise<void>;
  onCancel: () => void;
}

function TemplateEditorPanel({ initial, onSave, onCancel }: TemplateEditorPanelProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [data, setData] = useState<SurveyData>(initial?.data ?? emptyData());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <h3 className="text-base font-bold text-slate-900">
          {initial ? `Edit — ${initial.name}` : 'New Template'}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#1A3C6E] hover:bg-[#162d4a] font-bold">
            {saving ? 'Saving…' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-6 pt-5 pb-4 grid sm:grid-cols-2 gap-4 border-b border-slate-100">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Template name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Course completion survey"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Description (optional)</label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief note for admins…"
            className="text-sm"
          />
        </div>
      </div>

      {/* Survey editor — reused from block editor */}
      <div className="px-6 py-5">
        <SurveyEditor block={{ id: 'template-editor' }} data={data} onChange={setData} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolved assignment status chip
// ---------------------------------------------------------------------------

type AssignmentSource = 'override' | 'course_assignment' | 'institution_default' | 'none';

interface ResolvedStatus {
  source: AssignmentSource;
  label: string;
  templateName?: string;
}

function resolveStatus(
  course: Course,
  assignments: SurveyAssignment[],
  templates: SurveyTemplate[],
): ResolvedStatus {
  const tmplName = (id: string) => templates.find(t => t.id === id)?.name ?? id;

  if (course.completion_survey_template_id) {
    return { source: 'override', label: 'Override (course settings)', templateName: tmplName(course.completion_survey_template_id) };
  }
  const courseAssignment = assignments.find(a => a.scope === 'course' && a.course_id === course.id);
  if (courseAssignment) {
    return { source: 'course_assignment', label: tmplName(courseAssignment.survey_template_id), templateName: tmplName(courseAssignment.survey_template_id) };
  }
  const defaultAssignment = assignments.find(a => a.scope === 'all_courses');
  if (defaultAssignment) {
    return { source: 'institution_default', label: 'Institution default', templateName: tmplName(defaultAssignment.survey_template_id) };
  }
  return { source: 'none', label: 'None' };
}

function StatusChip({ status }: { status: ResolvedStatus }) {
  const colors: Record<AssignmentSource, string> = {
    override: 'bg-amber-50 text-amber-700 border-amber-200',
    course_assignment: 'bg-blue-50 text-blue-700 border-blue-200',
    institution_default: 'bg-slate-100 text-slate-600 border-slate-200',
    none: 'bg-slate-50 text-slate-400 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[status.source]}`}>
      {status.source === 'override' && <Info className="h-3 w-3" />}
      {status.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SurveysManager({
  institutionId,
  institutionSlug: _institutionSlug,
  initialTemplates,
  initialAssignments,
  courses,
  programs,
}: SurveysManagerProps) {
  const supabase = createClient();

  // ── Local state ────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<SurveyTemplate[]>(initialTemplates);
  const [assignments, setAssignments] = useState<SurveyAssignment[]>(initialAssignments);

  // Template editor panel state
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null | undefined>(undefined);
  // undefined = panel closed; null = creating new; SurveyTemplate = editing existing

  // Delete confirmation
  const [deletingTemplate, setDeletingTemplate] = useState<SurveyTemplate | null>(null);

  // Course search
  const [courseSearch, setCourseSearch] = useState('');

  // ── Derived / memoised ────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.title.toLowerCase().includes(q));
  }, [courses, courseSearch]);

  /** templateId currently assigned as institution default */
  const defaultAssignmentTemplateId = useMemo(
    () => assignments.find(a => a.scope === 'all_courses')?.survey_template_id ?? null,
    [assignments],
  );

  /** templateId assigned to a specific course (by assignment row, not override) */
  const courseAssignmentMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const a of assignments) {
      if (a.scope === 'course' && a.course_id) map[a.course_id] = a.survey_template_id;
    }
    return map;
  }, [assignments]);

  /** templateId assigned to a specific program */
  const programAssignmentMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const a of assignments) {
      if (a.scope === 'program' && a.program_id) map[a.program_id] = a.survey_template_id;
    }
    return map;
  }, [assignments]);

  // ── Helpers that detect usage ─────────────────────────────────────────────
  function getTemplateUsage(templateId: string): string[] {
    const uses: string[] = [];
    // Assignments
    for (const a of assignments) {
      if (a.survey_template_id !== templateId) continue;
      if (a.scope === 'all_courses') uses.push('Institution default');
      else if (a.scope === 'course') {
        const c = courses.find(co => co.id === a.course_id);
        if (c) uses.push(`Course: "${c.title}"`);
      } else if (a.scope === 'program') {
        const p = programs.find(pr => pr.id === a.program_id);
        if (p) uses.push(`Program: "${p.title}"`);
      }
    }
    // Per-course override
    for (const c of courses) {
      if (c.completion_survey_template_id === templateId) uses.push(`Course override: "${c.title}"`);
    }
    return uses;
  }

  // ── Assignment mutation helpers ────────────────────────────────────────────

  function patchAssignments(
    scope: SurveyAssignment['scope'],
    key: { course_id?: string; program_id?: string },
    templateId: string | null,
  ) {
    setAssignments(prev => {
      const filtered = prev.filter(a => {
        if (a.scope !== scope) return true;
        if (scope === 'course') return a.course_id !== key.course_id;
        if (scope === 'program') return a.program_id !== key.program_id;
        return false; // all_courses: remove old default
      });
      if (!templateId) return filtered;
      return [
        ...filtered,
        {
          id: crypto.randomUUID(),
          institution_id: institutionId,
          survey_template_id: templateId,
          scope,
          course_id: key.course_id ?? null,
          program_id: key.program_id ?? null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });
  }

  const handleDefaultChange = useCallback(async (templateId: string | null) => {
    try {
      await setDefaultSurveyAssignment(supabase, institutionId, templateId);
      patchAssignments('all_courses', {}, templateId);
      toast.success(templateId ? 'Institution default survey set' : 'Institution default survey cleared');
    } catch (err: any) {
      toast.error('Failed to update default', { description: err.message });
    }
  }, [supabase, institutionId]);

  const handleCourseAssignmentChange = useCallback(async (courseId: string, templateId: string | null) => {
    try {
      await setCourseSurveyAssignment(supabase, institutionId, courseId, templateId);
      patchAssignments('course', { course_id: courseId }, templateId);
      toast.success(templateId ? 'Course survey assigned' : 'Course assignment cleared');
    } catch (err: any) {
      toast.error('Failed to update course assignment', { description: err.message });
    }
  }, [supabase, institutionId]);

  const handleProgramAssignmentChange = useCallback(async (programId: string, templateId: string | null) => {
    try {
      await setProgramSurveyAssignment(supabase, institutionId, programId, templateId);
      patchAssignments('program', { program_id: programId }, templateId);
      toast.success(templateId ? 'Program survey assigned' : 'Program assignment cleared');
    } catch (err: any) {
      toast.error('Failed to update program assignment', { description: err.message });
    }
  }, [supabase, institutionId]);

  // ── Template CRUD ──────────────────────────────────────────────────────────

  const handleSaveTemplate = useCallback(async (name: string, description: string, data: SurveyData) => {
    if (editingTemplate) {
      // Update
      const { error } = await updateSurveyTemplate(supabase, editingTemplate.id, { name, description, data });
      if (error) { toast.error('Failed to save template', { description: error }); return; }
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id
        ? { ...t, name, description: description || null, data, updated_at: new Date().toISOString() }
        : t
      ));
      toast.success('Template updated');
    } else {
      // Create
      const { template, error } = await createSurveyTemplate(supabase, {
        institutionId,
        name,
        description,
        data,
      });
      if (error || !template) { toast.error('Failed to create template', { description: error ?? undefined }); return; }
      setTemplates(prev => [template, ...prev]);
      toast.success('Template created');
    }
    setEditingTemplate(undefined);
  }, [supabase, institutionId, editingTemplate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTemplate) return;
    const { error } = await deleteSurveyTemplate(supabase, deletingTemplate.id);
    if (error) { toast.error('Failed to delete template', { description: error }); return; }
    setTemplates(prev => prev.filter(t => t.id !== deletingTemplate.id));
    // Remove any local assignments referencing the deleted template
    setAssignments(prev => prev.filter(a => a.survey_template_id !== deletingTemplate.id));
    toast.success('Template deleted');
    setDeletingTemplate(null);
  }, [supabase, deletingTemplate]);

  // ── Template select options (shared helper) ───────────────────────────────
  function TemplateSelect({
    value,
    onChange,
    placeholder = 'None',
    disabled = false,
  }: {
    value: string | null;
    onChange: (val: string | null) => void;
    placeholder?: string;
    disabled?: boolean;
  }) {
    return (
      <Select
        value={value ?? '__none__'}
        onValueChange={v => onChange(v === '__none__' ? null : v)}
      >
        <SelectTrigger className="h-8 text-xs w-48" disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">{placeholder}</SelectItem>
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 py-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-[#1A3C6E]" />
          Surveys
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create survey templates once, attach them to courses and programs from here.
        </p>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open: boolean) => { if (!open) setDeletingTemplate(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &quot;{deletingTemplate?.name}&quot;?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deletingTemplate && (() => {
            const uses = getTemplateUsage(deletingTemplate.id);
            return uses.length > 0 ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1 text-sm">
                <p className="font-semibold text-amber-800">This template is currently attached to:</p>
                <ul className="list-disc list-inside text-amber-700">
                  {uses.map((u, i) => <li key={i}>{u}</li>)}
                </ul>
                <p className="text-amber-700 text-xs">Deleting will remove those assignments.</p>
              </div>
            ) : null;
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main tabs */}
      <Tabs defaultValue="templates">
        <TabsList className="mb-6">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Templates ─────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-5">

          {/* Editor panel (open when creating / editing) */}
          {editingTemplate !== undefined && (
            <TemplateEditorPanel
              initial={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => setEditingTemplate(undefined)}
            />
          )}

          {/* Template grid */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
            <Button
              size="sm"
              className="bg-[#1A3C6E] hover:bg-[#162d4a] font-bold"
              onClick={() => setEditingTemplate(null)}
              disabled={editingTemplate !== undefined}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New template
            </Button>
          </div>

          {templates.length === 0 && editingTemplate === undefined && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No survey templates yet</p>
              <p className="text-sm text-slate-400 mt-1">Create a template to attach surveys to courses and programs.</p>
              <Button size="sm" className="mt-5 bg-[#1A3C6E] hover:bg-[#162d4a] font-bold" onClick={() => setEditingTemplate(null)}>
                <Plus className="h-4 w-4 mr-1.5" /> New template
              </Button>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => {
              const qCount = template.data?.questions?.length ?? 0;
              const isEditing = editingTemplate?.id === template.id;
              const usageCount = getTemplateUsage(template.id).length;
              return (
                <div
                  key={template.id}
                  className={`rounded-2xl border bg-white p-5 space-y-3 transition-shadow ${isEditing ? 'border-[#1A3C6E] shadow-md' : 'border-slate-200 hover:shadow-sm'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{template.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        title="Edit template"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A3C6E] hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingTemplate(template)}
                        title="Delete template"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {qCount} question{qCount !== 1 ? 's' : ''}
                    </Badge>
                    {usageCount > 0 && (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {usageCount} use{usageCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Updated {fmtDate(template.updated_at)}
                  </p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tab 2: Assignments ───────────────────────────────────────────── */}
        <TabsContent value="assignments" className="space-y-8">

          {/* Precedence explainer */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex items-start gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-bold">Resolution order:</span>{' '}
              <span className="text-amber-700 font-semibold">Course settings override</span>
              {' → '}
              <span className="text-blue-700 font-semibold">Course assignment (below)</span>
              {' → '}
              <span className="text-slate-600 font-semibold">Institution default</span>.
              {' '}A course setting override takes highest precedence and is managed from the course&apos;s own settings page.
            </p>
          </div>

          {/* 1. Institution default */}
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Institution default</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shown after ANY course that doesn&apos;t have its own survey assignment or override.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-700">Default completion survey</p>
                {defaultAssignmentTemplateId ? (
                  <p className="text-xs text-slate-500">
                    Currently: <span className="font-medium text-slate-700">{templates.find(t => t.id === defaultAssignmentTemplateId)?.name ?? '—'}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">No default set — courses without an assignment will show no survey.</p>
                )}
              </div>
              <TemplateSelect
                value={defaultAssignmentTemplateId}
                onChange={handleDefaultChange}
                placeholder="No default"
              />
            </div>
          </section>

          {/* 2. Per-course assignments */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">Courses</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set a specific survey for each course. Overrides the institution default for that course.
                </p>
              </div>
              {courses.length > 10 && (
                <div className="relative shrink-0 w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    placeholder="Search courses…"
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {filteredCourses.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No courses found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCourses.map(course => {
                    const status = resolveStatus(course, assignments, templates);
                    const isOverride = !!course.completion_survey_template_id;
                    const currentAssignment = courseAssignmentMap[course.id] ?? null;
                    return (
                      <div key={course.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{course.title}</p>
                            <div className="mt-0.5">
                              <StatusChip status={status} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isOverride ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600">
                              <Info className="h-3.5 w-3.5" />
                              <span>Managed in course settings</span>
                              <TemplateSelect
                                value={currentAssignment}
                                onChange={() => {}}
                                placeholder="Course assignment"
                                disabled
                              />
                            </div>
                          ) : (
                            <TemplateSelect
                              value={currentAssignment}
                              onChange={templateId => handleCourseAssignmentChange(course.id, templateId)}
                              placeholder="Use default"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 3. Per-program assignments */}
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Programs</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shown once, when a learner completes the final course of the program.
              </p>
            </div>

            {programs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                No programs configured. Create programs in the Certificates → Programs tab.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {programs.map(program => {
                    const currentAssignment = programAssignmentMap[program.id] ?? null;
                    return (
                      <div key={program.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{program.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {program.courses?.length ?? 0} course{(program.courses?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <TemplateSelect
                            value={currentAssignment}
                            onChange={templateId => handleProgramAssignmentChange(program.id, templateId)}
                            placeholder="No program survey"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

        </TabsContent>
      </Tabs>
    </div>
  );
}
