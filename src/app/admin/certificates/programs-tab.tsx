'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  createProgram, updateProgram, deleteProgram, setProgramCourses,
  backfillProgramCertificates, getProgramCompletionCounts,
} from '@/lib/db/programs';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { Plus, Pencil, Trash2, GraduationCap, BookOpen, Award, X, GripVertical, Users, ListOrdered, Medal } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ProgramWithCourses, CertificateTemplate, Course } from '@/types';

interface Props {
  programs: ProgramWithCourses[];
  courses: Pick<Course, 'id' | 'title'>[];
  templates: CertificateTemplate[];
  institutionId: string;
  onChange: () => void;
}

interface Draft {
  id?: string;
  title: string;
  description: string;
  certificate_template_id: string | null;
  sequential: boolean;
  program_certificate_only: boolean;
  courseIds: string[]; // ordered
}

const empty = (programCertificateOnly = false): Draft => ({
  title: '', description: '', certificate_template_id: null,
  sequential: false, program_certificate_only: programCertificateOnly, courseIds: [],
});

// ── Sortable row for a selected course ───────────────────────────────────────
function SortableCourseRow({ id, position, title, onRemove }: { id: string; position: number; title: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#1E3A5F] bg-[#1E3A5F]/5 text-sm"
    >
      <button type="button" className="cursor-grab touch-none shrink-0 text-slate-400 hover:text-slate-600" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="shrink-0 w-5 h-5 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-[10px] font-bold">
        {position}
      </span>
      <span className="truncate flex-1 text-slate-700">{title}</span>
      <button type="button" onClick={onRemove} className="shrink-0 text-slate-400 hover:text-red-500">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ProgramsTab({ programs, courses, templates, institutionId, onChange }: Props) {
  const supabase = createClient();
  const pathname = usePathname();
  // New SCAGO programs default to a single program certificate (no per-course
  // certs); GANSID keeps a certificate per course. Admins can flip it either way.
  const defaultCertificateOnly = resolveInstitutionSlug(pathname) === 'scago';
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [completionCounts, setCompletionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    getProgramCompletionCounts(supabase, institutionId)
      .then(setCompletionCounts)
      .catch(() => {
        // Keep the empty-object fallback so the tab still renders, but tell the
        // admin the "N completed" badges are unreliable rather than showing 0.
        toast.error('Failed to load completion counts');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, programs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !editing) return;
    const oldIndex = editing.courseIds.indexOf(active.id as string);
    const newIndex = editing.courseIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setEditing(d => d ? { ...d, courseIds: arrayMove(d.courseIds, oldIndex, newIndex) } : d);
  }

  function openNew() { setEditing(empty(defaultCertificateOnly)); }
  function openEdit(p: ProgramWithCourses) {
    setEditing({
      id: p.id, title: p.title, description: p.description ?? '',
      certificate_template_id: p.certificate_template_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sequential: (p as any).sequential ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      program_certificate_only: (p as any).program_certificate_only ?? false,
      courseIds: p.courses.map(c => c.id),
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error('Give the program a title'); return; }
    if (editing.courseIds.length === 0) { toast.error('Add at least one course'); return; }
    setSaving(true);
    try {
      let programId = editing.id;
      if (programId) {
        await updateProgram(supabase, institutionId, programId, {
          title: editing.title.trim(), description: editing.description.trim() || null,
          certificate_template_id: editing.certificate_template_id,
          sequential: editing.sequential,
          program_certificate_only: editing.program_certificate_only,
        });
      } else {
        const created = await createProgram(supabase, {
          institution_id: institutionId, title: editing.title.trim(),
          description: editing.description.trim() || null,
          certificate_template_id: editing.certificate_template_id,
          sequential: editing.sequential,
          program_certificate_only: editing.program_certificate_only,
        });
        programId = created.id;
      }
      await setProgramCourses(supabase, institutionId, programId!, editing.courseIds);
      toast.success(editing.id ? 'Program updated' : 'Program created');
      // Retroactively award the program certificate to anyone who already
      // completed every course (e.g. before the program existed or changed)
      try {
        const awarded = await backfillProgramCertificates(supabase, programId!);
        if (awarded > 0) {
          toast.success(`Awarded ${awarded} program certificate${awarded === 1 ? '' : 's'} retroactively`);
        }
      } catch {
        // backfill is best-effort; the trigger still covers future completions
      }
      setEditing(null);
      onChange();
    } catch (e: any) {
      toast.error('Failed to save program', { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: ProgramWithCourses) {
    if (!confirm(`Delete the program "${p.title}"? Issued program certificates are kept.`)) return;
    try {
      await deleteProgram(supabase, institutionId, p.id);
      toast.success('Program deleted');
      onChange();
    } catch (e: any) {
      toast.error('Failed to delete', { description: e.message });
    }
  }

  function toggleCourse(id: string) {
    setEditing(d => {
      if (!d) return d;
      const has = d.courseIds.includes(id);
      return { ...d, courseIds: has ? d.courseIds.filter(c => c !== id) : [...d.courseIds, id] };
    });
  }

  const templateName = (id: string | null) => templates.find(t => t.id === id)?.name ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-[#1E3A5F]" /> Programs</h2>
          <p className="text-sm text-slate-500">Group courses into a program. Learners earn the program certificate once every course in it is complete.</p>
        </div>
        {!editing && <Button onClick={openNew} className="bg-[#1E3A5F] hover:bg-[#0F172A]"><Plus className="w-4 h-4 mr-1.5" /> New Program</Button>}
      </div>

      {/* Editor */}
      {editing && (
        <Card className="border-[#1E3A5F]/20 shadow-md">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{editing.id ? 'Edit program' : 'New program'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Title</label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. SCD Education Program for Healthcare Providers" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Program certificate template</label>
                <select value={editing.certificate_template_id ?? ''}
                  onChange={e => setEditing({ ...editing, certificate_template_id: e.target.value || null })}
                  className="mt-1 w-full h-9 px-2 text-sm border border-slate-200 rounded-md bg-white">
                  <option value="">Institution default</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Description (optional)</label>
              <Input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="Shown on the certificate / program page" className="mt-1" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editing.sequential}
                onChange={e => setEditing({ ...editing, sequential: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-[#1E3A5F]"
              />
              <span className="text-sm text-slate-700 font-medium">Courses must be completed in order</span>
              <span className="text-xs text-slate-400">(sequential program)</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editing.program_certificate_only}
                onChange={e => setEditing({ ...editing, program_certificate_only: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#1E3A5F]"
              />
              <span>
                <span className="text-sm text-slate-700 font-medium">Only award the final program certificate</span>
                <span className="block text-xs text-slate-400">
                  No per-course certificates — learners receive a single certificate once every course is complete.
                </span>
              </span>
            </label>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Courses in this program ({editing.courseIds.length})</label>
                <span className="text-[11px] text-slate-400">Drag to reorder · click available courses to add</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Selected courses — sortable */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">Selected (drag to reorder)</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={editing.courseIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5 min-h-[48px] p-1 rounded-lg border border-slate-100 bg-slate-50">
                        {editing.courseIds.map((id, i) => {
                          const course = courses.find(c => c.id === id);
                          if (!course) return null;
                          return (
                            <SortableCourseRow
                              key={id}
                              id={id}
                              position={i + 1}
                              title={course.title}
                              onRemove={() => toggleCourse(id)}
                            />
                          );
                        })}
                        {editing.courseIds.length === 0 && (
                          <p className="text-xs text-slate-400 px-2 py-3">No courses added yet</p>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
                {/* Available courses — click to add */}
                <div>
                  <p className="text-[11px] text-slate-400 mb-1">Available (click to add)</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 rounded-lg border border-slate-100">
                    {courses.filter(c => !editing.courseIds.includes(c.id)).map(c => (
                      <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-[#1E3A5F] bg-white text-left text-sm transition-all">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate flex-1 text-slate-700">{c.title}</span>
                        <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                    {courses.filter(c => !editing.courseIds.includes(c.id)).length === 0 && (
                      <p className="text-xs text-slate-400 px-2 py-3">
                        {courses.length === 0 ? 'No courses in this institution yet.' : 'All courses added.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0F172A]">
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create program'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program list */}
      {!editing && (
        programs.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No programs yet</p>
            <p className="text-sm text-slate-400 mt-1">Create one to bundle courses and issue a program-completion certificate.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {programs.map(p => (
              <Card key={p.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{p.title}</h3>
                      {p.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(p)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                      <BookOpen className="w-3 h-3" /> {p.courses.length} course{p.courses.length !== 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                      <Award className="w-3 h-3" /> {templateName(p.certificate_template_id) ?? 'Default template'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                      <Users className="w-3 h-3" /> {completionCounts[p.id] ?? 0} completed
                    </span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {Boolean((p as any).sequential) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium">
                        <ListOrdered className="w-3 h-3" /> Sequential
                      </span>
                    )}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {Boolean((p as any).program_certificate_only) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
                        <Medal className="w-3 h-3" /> Single certificate
                      </span>
                    )}
                  </div>
                  {p.courses.length > 0 && (
                    <ol className="mt-3 space-y-1">
                      {p.courses.map((c, i) => (
                        <li key={c.id} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="shrink-0 w-4 h-4 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                          <span className="truncate">{c.title}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
