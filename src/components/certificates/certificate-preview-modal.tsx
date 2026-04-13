'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CertificateRenderer } from './certificate-renderer';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { Download, Printer, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CertificateTemplate, CertificateData } from '@/types';

interface CertificatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: CertificateTemplate;
  data: CertificateData;
  certificateId?: string;
  isSample?: boolean;
}

export function CertificatePreviewModal({
  open,
  onClose,
  template,
  data,
  certificateId,
  isSample = false,
}: CertificatePreviewModalProps) {
  const handleDownloadPdf = () => {
    if (!certificateId) return;
    window.open(`/api/certificates/${certificateId}/pdf`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    if (!data.certificate_number) return;
    const url = `${window.location.origin}/verify/${data.certificate_number}`;
    await navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[1120px] max-h-[90vh] overflow-auto p-6">
        <DialogTitle className="sr-only">Certificate Preview</DialogTitle>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isSample ? 'Template Preview' : 'Certificate'}
            </h2>
            {isSample && (
              <p className="text-sm text-slate-500">Preview with sample data</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {certificateId && (
              <Button
                onClick={handleDownloadPdf}
                size="sm"
                className="bg-[#1E3A5F] hover:bg-[#162d4a]"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download PDF
              </Button>
            )}
            <Button onClick={handlePrint} size="sm" variant="outline">
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            {data.certificate_number && (
              <Button onClick={handleCopyLink} size="sm" variant="outline">
                <Link2 className="h-4 w-4 mr-1.5" />
                Copy Link
              </Button>
            )}
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex justify-center bg-slate-100 rounded-xl p-6">
          <CertificateRenderer
            template={template}
            data={data}
            scale={0.85}
            showQR={!isSample}
            institutionSlug={resolveInstitutionSlug()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
