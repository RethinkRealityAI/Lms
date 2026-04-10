'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Award, Download, Eye, Share2 } from 'lucide-react';
import { CertificateRenderer } from '@/components/certificates/certificate-renderer';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import type { CertificateWithDetails, CertificateTemplate, CertificateData } from '@/types';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState<CertificateWithDetails | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses!certificates_course_id_fkey(title, description),
          template:certificate_templates!certificates_template_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) {
        toast.error('Failed to load certificates', { description: error.message });
      } else {
        setCertificates((data ?? []) as CertificateWithDetails[]);
      }
    }
    setLoading(false);
  };

  const handleShare = async (cert: CertificateWithDetails) => {
    if (cert.certificate_number) {
      const url = `${window.location.origin}/verify/${cert.certificate_number}`;
      await navigator.clipboard.writeText(url);
      toast.success('Verification link copied to clipboard');
    } else {
      const message = `I've completed ${cert.course?.title ?? 'a course'} through GANSID's Capacity Building Curriculum! 🎓`;
      await navigator.clipboard.writeText(message);
      toast.success('Copied to clipboard!');
    }
  };

  const buildCertData = (cert: CertificateWithDetails): CertificateData => ({
    student_name: cert.user?.full_name ?? cert.user?.email ?? 'Student',
    course_title: cert.course?.title,
    completion_date: new Date(cert.issued_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    certificate_number: cert.certificate_number ?? '',
    institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black tracking-tight text-white">My Certificates</h1>
            {!loading && certificates.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 font-black text-sm px-3 py-1 rounded-full border border-amber-500/30">
                <Award className="h-3.5 w-3.5" />
                {certificates.length} earned
              </span>
            )}
          </div>
          <p className="text-slate-400 font-medium">
            View and download your official course completion credentials.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full bg-slate-200" />
                <CardContent className="pt-4">
                  <Skeleton className="h-5 w-3/4 bg-slate-200" />
                  <Skeleton className="h-4 w-1/2 mt-2 bg-slate-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : certificates.length === 0 ? (
          <Card className="border-none shadow-md bg-white">
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Award className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">No Certificates Earned</h3>
              <p className="text-slate-400 font-medium text-center mb-8 max-w-sm">
                Complete your enrolled courses to receive official certification.
              </p>
              <Button asChild className="bg-[#2563EB] hover:bg-[#1D4ED8] font-bold px-8 rounded-xl h-12">
                <Link href="/student">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {certificates.map((cert) => {
              const template = cert.template as CertificateTemplate | null;
              const certData = buildCertData(cert);

              return (
                <Card key={cert.id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white overflow-hidden">
                  {template ? (
                    <div className="bg-slate-100 p-4 flex justify-center">
                      <CertificateRenderer template={template} data={certData} scale={0.35} showQR={false} />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] h-48 flex items-center justify-center">
                      <Award className="h-16 w-16 text-white/30" />
                    </div>
                  )}

                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">{cert.course?.title ?? 'Certificate of Achievement'}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      {cert.certificate_number && (
                        <p className="text-xs font-mono text-slate-400 mt-1">{cert.certificate_number}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {template && (
                        <Button size="sm" variant="outline" onClick={() => setPreviewCert(cert)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-[#1E3A5F] hover:bg-[#162d4a]"
                        onClick={() => window.open(`/api/certificates/${cert.id}/pdf`, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleShare(cert)}>
                        <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {previewCert && previewCert.template && (
        <CertificatePreviewModal
          open
          onClose={() => setPreviewCert(null)}
          template={previewCert.template as CertificateTemplate}
          data={buildCertData(previewCert)}
          certificateId={previewCert.id}
        />
      )}
    </div>
  );
}
