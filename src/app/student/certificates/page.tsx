'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Award, Download, Calendar, ExternalLink } from 'lucide-react';
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">My Certificates</h1>
        <p className="text-slate-400 font-medium">
          View and download your official course completion credentials.
        </p>
      </div>

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
            <Card key={cert.id} className="group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden flex flex-col">
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

                <div className="flex gap-3 pt-4 border-t border-slate-50 mt-auto">
                  {cert.certificate_url ? (
                    <>
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
                    </>
                  ) : (
                    <Button variant="outline" className="w-full h-11 border-slate-200 font-bold text-slate-400 rounded-xl" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Credential Processing...
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
