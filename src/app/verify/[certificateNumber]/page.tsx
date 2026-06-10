import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCertificateByNumber } from '@/lib/db/certificates';
import { getInstitutionName } from '@/lib/db/institutions';
import { CheckCircle2, XCircle, Award, Ban } from 'lucide-react';

export default async function VerifyPage({
  params: paramsPromise,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const params = React.use(paramsPromise);
  const supabase = await createClient();
  const cert = await getCertificateByNumber(supabase, params.certificateNumber);
  const institutionLabel = cert
    ? await getInstitutionName(supabase, cert.institution_id)
    : 'Learning Management System';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
            <Award className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Certificate Verification
        </h1>

        {cert && cert.revoked_at ? (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <Ban className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-bold text-lg">This certificate has been revoked</p>
              <p className="text-red-600 text-sm mt-1">
                Revoked on{' '}
                {new Date(cert.revoked_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' '}and is no longer valid.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-5 text-left space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Certificate Number</p>
                <p className="text-slate-900 font-mono text-sm">{cert.certificate_number}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Originally Issued</p>
                <p className="text-slate-900 font-medium">
                  {new Date(cert.issued_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </>
        ) : cert ? (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            </div>
            <p className="text-green-700 font-bold text-lg">This certificate is valid</p>

            <div className="bg-slate-50 rounded-xl p-5 text-left space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Recipient</p>
                <p className="text-slate-900 font-medium">{cert.user?.full_name ?? cert.user?.email}</p>
              </div>
              {(cert.course || cert.program) && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{cert.course ? 'Course' : 'Program'}</p>
                  <p className="text-slate-900 font-medium">{cert.course?.title ?? cert.program?.title}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Date Issued</p>
                <p className="text-slate-900 font-medium">
                  {new Date(cert.issued_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Certificate Number</p>
                <p className="text-slate-900 font-mono text-sm">{cert.certificate_number}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-400" />
              </div>
            </div>
            <p className="text-red-600 font-bold text-lg">Certificate not found</p>
            <p className="text-slate-500 text-sm">
              The certificate number <span className="font-mono">{params.certificateNumber}</span> was not found in our records.
            </p>
          </>
        )}

        <p className="text-xs text-slate-400 pt-4 border-t">
          Issued by {institutionLabel}
        </p>
      </div>
    </div>
  );
}
