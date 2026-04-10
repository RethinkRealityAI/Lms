import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { getCertificateById } from '@/lib/db/certificates';
import { getDefaultCertificateTemplate } from '@/lib/db/certificate-templates';
import { CertificatePdfDocument } from '@/components/certificates/certificate-pdf-document';
import type { CertificateData } from '@/types';
import React from 'react';

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cert = await getCertificateById(supabase, params.id);
  if (!cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  if (cert.pdf_url) {
    return NextResponse.redirect(cert.pdf_url);
  }

  let template = cert.template;
  if (!template && cert.institution_id) {
    template = await getDefaultCertificateTemplate(supabase, cert.institution_id);
  }
  if (!template) {
    return NextResponse.json({ error: 'No certificate template found' }, { status: 404 });
  }

  const certData: CertificateData = {
    student_name: cert.user?.full_name ?? cert.user?.email ?? 'Student',
    course_title: cert.course?.title,
    completion_date: new Date(cert.issued_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    certificate_number: cert.certificate_number ?? cert.id.slice(0, 8),
    institution_name: 'Global Action Network for Sickle Cell & Other Inherited Blood Disorders',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(CertificatePdfDocument, { template, data: certData }) as any
  );

  const storagePath = `certificates/pdfs/${cert.id}.pdf`;
  await supabase.storage
    .from('canva-exports')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  const { data: { publicUrl } } = supabase.storage
    .from('canva-exports')
    .getPublicUrl(storagePath);

  await supabase
    .from('certificates')
    .update({ pdf_url: publicUrl })
    .eq('id', cert.id);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${cert.certificate_number ?? cert.id}.pdf"`,
    },
  });
}
