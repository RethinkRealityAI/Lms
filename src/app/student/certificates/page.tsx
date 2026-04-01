'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Award, Download, Calendar, ExternalLink, Printer, Share2 } from 'lucide-react';
import type { Certificate } from '@/types';

interface CertificateWithCourse extends Omit<Certificate, 'course'> {
  course: {
    title: string;
    description: string;
  };
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadCertificates();
  }, []);

  const handlePrint = (url: string) => {
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleShare = async (courseTitle: string) => {
    const message = `I've completed ${courseTitle} through GANSID's Capacity Building Curriculum! \u{1F393}`;
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Copied to clipboard!', { description: 'Share your achievement with others.' });
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const loadCertificates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses(title, description)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) {
        toast.error('Failed to load certificates', { description: error.message });
      } else {
        setCertificates(data as CertificateWithCourse[] || []);
      }
    }
    setLoading(false);
  };

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

      {!loading && certificates.length > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/60 rounded-xl px-5 py-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-amber-800">
            {"You've"} earned <span className="text-amber-600">{certificates.length}</span> {certificates.length === 1 ? 'certificate' : 'certificates'}. Keep learning to unlock more!
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50">
                <Skeleton className="h-6 w-3/4 bg-slate-200" />
                <Skeleton className="h-4 w-full mt-3 bg-slate-200" />
              </CardHeader>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Award className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight">No Certificates Earned</h3>
            <p className="text-slate-400 font-medium text-center mb-8 max-w-sm">
              Complete your enrolled courses to receive official certification and track your achievements.
            </p>
            <Button asChild className="bg-[#2563EB] hover:bg-[#1D4ED8] font-bold px-8 rounded-xl h-12 shadow-lg shadow-blue-100">
              <Link href="/student">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {certificates.map((cert) => (
            <Card key={cert.id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden flex flex-col border-t-[3px] border-t-amber-400">
              <CardHeader className="pb-4 bg-slate-50/30 border-b border-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0 group-hover:rotate-6 transition-transform">
                      <Award className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-slate-900 group-hover:text-[#2563EB] transition-colors leading-tight">{cert.course.title}</CardTitle>
                      <CardDescription className="mt-1.5 font-medium text-slate-500 line-clamp-2">
                        {cert.course.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 flex-grow flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-[#2563EB]" />
                    </div>
                    <span>
                      Issued {new Date(cert.issued_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <Badge className="bg-green-100 text-green-700 border-none font-black px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest">
                    Verified Credential
                  </Badge>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50 mt-auto">
                  {cert.certificate_url ? (
                    <>
                      <div className="flex gap-2">
                        <Button asChild className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] font-bold rounded-xl h-11 shadow-lg shadow-blue-100">
                          <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View
                          </a>
                        </Button>
                        <Button variant="outline" asChild className="flex-1 border-slate-200 font-bold rounded-xl h-11 hover:bg-slate-50 text-slate-600">
                          <a href={cert.certificate_url} download>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-slate-200 font-bold rounded-xl h-10 hover:bg-slate-50 text-slate-500 text-sm"
                          onClick={() => handlePrint(cert.certificate_url!)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-slate-200 font-bold rounded-xl h-10 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-slate-500 text-sm"
                          onClick={() => handleShare(cert.course.title)}
                        >
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <Award className="h-4 w-4" />
                        <span className="text-sm font-bold">Certificate Earned</span>
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        A downloadable certificate will be available here soon.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
