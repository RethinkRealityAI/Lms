'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createProgram, updateProgram, deleteProgram, setProgramCourses } from '@/lib/db/programs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GraduationCap, BookOpen, Award, X, GripVertical, Check } from 'lucide-react';
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
  courseIds: string[]; // ordered
}

const empty = (): Draft => ({ title: '', description: '', certificate_template_id: null, courseIds: [] });

export function ProgramsTab({ programs, courses, templates, institutionId, onChange }: Props) {
  const supabase = createClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing(empty()); }
  function openEdit(p: ProgramWithCourses) {
    setEditing({
      id: p.id, title: p.title, description: p.description ?? '',
      certificate_template_id: p.certificate_template_id,
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
        await updateProgram(supabase, programId, {
          title: editing.title.trim(), description: editing.description.trim() || null,
          certificate_template_id: editing.certificate_template_id,
        });
      } else {
        const created = await createProgram(supabase, {
          institution_id: institutionId, title: editing.title.trim(),
          description: editing.description.trim() || null,
          certificate_template_id: editing.certificate_template_id,
        });
        programId = created.id;
      }
      await setProgramCourses(supabase, programId!, editing.courseIds);
      toast.success(editing.id ? 'Program updated' : 'Program created');
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
      await deleteProgram(supabase, p.id);
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Courses in this program ({editing.courseIds.length})</label>
                <span className="text-[11px] text-slate-400">Click to add — number shows the order</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto p-1 rounded-lg border border-slate-100">
                {courses.map(c => {
                  const idx = editing.courseIds.indexOf(c.id);
                  const sel = idx >= 0;
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCourse(c.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-sm transition-all ${
                        sel ? 'border-[#1E3A5F] bg-[#1E3A5F]/5' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        sel ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {sel ? idx + 1 : <BookOpen className="w-3 h-3" />}
                      </span>
                      <span className="truncate flex-1 text-slate-700">{c.title}</span>
                      {sel && <Check className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />}
                    </button>
                  );
                })}
                {courses.length === 0 && <p className="text-sm text-slate-400 p-3">No courses in this institution yet.</p>}
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
