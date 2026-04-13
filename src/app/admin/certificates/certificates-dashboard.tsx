'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { createCertificateTemplate, updateCertificateTemplate, deleteCertificateTemplate, assignCourseTemplate, removeCourseTemplate } from '@/lib/db/certificate-templates';
import { revokeCertificates } from '@/lib/db/certificates';
import { CertificateRenderer } from '@/components/certificates/certificate-renderer';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import { TemplateEditor } from '@/components/certificates/template-editor';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { AwardCertificateModal } from '@/components/certificates/award-certificate-modal';
import { toast } from 'sonner';
import { Award, Plus, Pencil, Trash2, Search, Download, Eye } from 'lucide-react';
import type { CertificateTemplate, CertificateWithDetails, CertificateData, CourseCertificateTemplate, Course } from '@/types';

interface Props {
  templates: CertificateTemplate[];
  certificates: CertificateWithDetails[];
  assignments: (CourseCertificateTemplate & { course_title: string; template_name: string })[];
  courses: Pick<Course, 'id' | 'title'>[];
  institutionId: string;
  institutionName?: string;
}

type Tab = 'templates' | 'awarded' | 'assignments';

export function CertificatesDashboard({ templates: initialTemplates, certificates: initialCerts, assignments: initialAssignments, courses, institutionId, institutionName: initialInstitutionName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [instName, setInstName] = useState(initialInstitutionName ?? '');
  const [tab, setTab] = useState<Tab>('templates');

  // Fetch institution name if not provided via prop
  useEffect(() => {
    if (instName) return;
    supabase
      .from('institutions')
      .select('name, description')
      .eq('id', institutionId)
      .single()
      .then(({ data }) => {
        if (data) setInstName(data.description || data.name);
      });
  }, [institutionId]);

  const sampleData: CertificateData = {
    student_name: 'Jane Doe',
    course_title: 'Fundamentals of Effective Advocacy',
    completion_date: 'April 9, 2026',
    certificate_number: 'CERT-2026-00001',
    institution_name: instName || 'Unknown Institution',
  };
  const [templates, setTemplates] = useState(initialTemplates);
  const [certificates, setCertificates] = useState(initialCerts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCert, setPreviewCert] = useState<CertificateWithDetails | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleSaveTemplate = async (data: { name: string; description: string; layout_config: any; is_default: boolean }) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingTemplate) {
        const updated = await updateCertificateTemplate(supabase, editingTemplate.id, data);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Template updated');
      } else {
        const created = await createCertificateTemplate(supabase, {
          ...data,
          institution_id: institutionId,
          created_by: user.id,
        });
        setTemplates((prev) => [created, ...prev]);
        toast.success('Template created');
      }
      setEditingTemplate(null);
      setCreatingTemplate(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? Certificates already issued will keep their existing design.')) return;
    try {
      await deleteCertificateTemplate(supabase, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success('Template deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleCanvaDesign = async (templateId?: string) => {
    const entityId = templateId ?? editingTemplate?.id;

    // Listen for Canva auth success or design complete
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'canva-auth-success') {
        window.removeEventListener('message', handleMessage);
        // Auth succeeded — now trigger the design flow again
        handleCanvaDesign(templateId);
      }
      if (event.data?.type === 'canva-design-complete') {
        window.removeEventListener('message', handleMessage);
        toast.success('Canva design saved');
        refresh();
      }
    };
    window.addEventListener('message', handleMessage);

    try {
      // Call our designs API to create or fetch a design
      const resp = await fetch('/api/canva/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: editingTemplate?.canva_design_id ?? null,
          width: 1056,
          height: 816,
          title: 'Certificate Background',
          entityType: 'template',
          entityId: entityId ?? 'new',
        }),
      });

      const data = await resp.json();

      if (data.needsAuth) {
        // Open OAuth popup
        window.open('/api/auth/canva', 'canva-auth', 'width=600,height=700,popup=yes');
        return;
      }

      if (data.error) {
        window.removeEventListener('message', handleMessage);
        toast.error(data.error);
        return;
      }

      // Open Canva editor in a new tab with return URL
      const returnUrl = `${window.location.origin}/api/canva/return?designId=${data.designId}&entityType=template&entityId=${entityId ?? 'new'}`;
      window.open(data.editUrl, '_blank');

      // Show instructions toast
      toast.info('Design your certificate in Canva, then return here', {
        description: 'When done, close the Canva tab and click "Design Background in Canva" again to export.',
        duration: 8000,
      });
    } catch (err) {
      window.removeEventListener('message', handleMessage);
      toast.error('Failed to connect to Canva');
    }
  };

  const handleSelectCanvaDesign = async (designId: string) => {
    const entityId = editingTemplate?.id;
    if (!entityId) {
      toast.error('Save the template first, then select a Canva design');
      return;
    }

    try {
      // Create the design entry and get export URL via our API
      const resp = await fetch('/api/canva/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId,
          entityType: 'template',
          entityId,
        }),
      });

      const data = await resp.json();
      if (data.needsAuth) {
        window.open('/api/auth/canva', 'canva-auth', 'width=600,height=700,popup=yes');
        return;
      }
      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Now trigger export via the return handler
      const returnResp = await fetch(`/api/canva/return?designId=${designId}&entityType=template&entityId=${entityId}`);
      const returnHtml = await returnResp.text();

      if (returnResp.ok) {
        toast.success('Certificate background updated from Canva design');
        refresh();
      } else {
        toast.error('Failed to export design');
      }
    } catch (err) {
      toast.error('Failed to import Canva design');
    }
  };

  const handleAssignTemplate = async () => {
    if (!assignCourseId || !assignTemplateId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await assignCourseTemplate(supabase, assignCourseId, assignTemplateId, user.id);
      toast.success('Template assigned to course');
      setAssignModalOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign template');
    }
  };

  const handleRemoveAssignment = async (courseId: string) => {
    try {
      await removeCourseTemplate(supabase, courseId);
      setAssignments((prev) => prev.filter((a) => a.course_id !== courseId));
      toast.success('Template assignment removed — course will use default');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove assignment');
    }
  };

  const handleRevoke = async (certIds: string[]) => {
    if (!confirm(`Revoke ${certIds.length} certificate(s)? This cannot be undone.`)) return;
    try {
      await revokeCertificates(supabase, certIds);
      setCertificates((prev) => prev.filter((c) => !certIds.includes(c.id)));
      toast.success(`${certIds.length} certificate(s) revoked`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke');
    }
  };

  const filteredCerts = certificates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user?.full_name?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q) ||
      c.certificate_number?.toLowerCase().includes(q) ||
      c.course?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0F172A] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 px-4 sm:px-6 lg:px-8 py-8 rounded-b-xl">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Certificates</h1>
            <p className="text-slate-400 text-sm font-medium">Manage templates, awards, and course assignments</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
        {(['templates', 'awarded', 'assignments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setCreatingTemplate(false); setEditingTemplate(null); }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'templates' ? 'Templates' : t === 'awarded' ? 'Awarded' : 'Course Assignments'}
          </button>
        ))}
      </div>

      {/* Templates Tab - Grid View */}
      {tab === 'templates' && !creatingTemplate && !editingTemplate && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreatingTemplate(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Template
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="bg-slate-100 p-3 flex justify-center">
                  <CertificateRenderer template={t} data={sampleData} scale={0.25} showQR={false} institutionSlug={resolveInstitutionSlug()} />
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{t.name}</h3>
                      {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                    </div>
                    {t.is_default && <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">Default</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewTemplate(t)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingTemplate(t)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {!t.is_default && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Templates Tab - Editor View */}
      {tab === 'templates' && (creatingTemplate || editingTemplate) && (
        <div>
          <Button variant="ghost" onClick={() => { setCreatingTemplate(false); setEditingTemplate(null); }} className="mb-4">
            &larr; Back to Templates
          </Button>
          <TemplateEditor
            template={editingTemplate ?? undefined}
            onSave={handleSaveTemplate}
            onCanvaDesign={handleCanvaDesign}
            onSelectCanvaDesign={handleSelectCanvaDesign}
            saving={saving}
          />
        </div>
      )}

      {/* Awarded Tab */}
      {tab === 'awarded' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or certificate number..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowAwardModal(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Award className="h-4 w-4 mr-1.5" />
              Award Certificate
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Student</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Course</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Certificate #</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Awarded By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{cert.user?.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{cert.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cert.course?.title ?? <span className="text-amber-600 font-medium">Manual Award</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{cert.certificate_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {cert.awarded_by ? (cert.awarder?.full_name ?? 'Admin') : 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewCert(cert)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => window.open(`/api/certificates/${cert.id}/pdf`, '_blank')}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRevoke([cert.id])}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      {searchQuery ? 'No certificates match your search' : 'No certificates awarded yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Course Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAssignModalOpen(true)} className="bg-[#1E3A5F] hover:bg-[#162d4a]">
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Template
            </Button>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Course</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Template</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600">Assigned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const assignment = assignments.find((a) => a.course_id === course.id);
                  return (
                    <tr key={course.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{course.title}</td>
                      <td className="px-4 py-3">
                        {assignment ? (
                          <span className="text-slate-600">{assignment.template_name}</span>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-none text-xs">Using Default</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {assignment ? new Date(assignment.assigned_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {assignment && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleRemoveAssignment(course.id)}>
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Assign modal */}
          {assignModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setAssignModalOpen(false)}>
              <div className="bg-white rounded-xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-lg">Assign Template to Course</h3>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Course</label>
                  <select value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)} className="w-full h-9 border rounded-md px-3 text-sm">
                    <option value="">Select course...</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Template</label>
                  <select value={assignTemplateId} onChange={(e) => setAssignTemplateId(e.target.value)} className="w-full h-9 border rounded-md px-3 text-sm">
                    <option value="">Select template...</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssignTemplate} disabled={!assignCourseId || !assignTemplateId} className="bg-[#1E3A5F]">Assign</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview modals */}
      {previewTemplate && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
          data={sampleData}
          isSample
        />
      )}
      {previewCert && previewCert.template && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewCert(null)}
          template={previewCert.template}
          data={{
            student_name: previewCert.user?.full_name ?? previewCert.user?.email ?? 'Student',
            course_title: previewCert.course?.title,
            completion_date: new Date(previewCert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            certificate_number: previewCert.certificate_number ?? '',
            institution_name: instName || 'Unknown Institution',
          }}
          certificateId={previewCert.id}
        />
      )}

      {/* Award modal */}
      <AwardCertificateModal
        open={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        templates={templates}
        institutionId={institutionId}
        onAwarded={refresh}
      />
    </div>
  );
}
