'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Eye, Pencil } from 'lucide-react';
import { withInstitutionPath } from '@/lib/tenant/path';
import CourseViewer from '@/components/student/course-viewer';

export default function AdminPreviewPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);
  const pathname = usePathname();

  return (
    // Fixed overlay covers the entire viewport including the admin nav
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Preview banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Admin Preview</span>
          <span className="text-white/40 text-sm hidden sm:inline">·</span>
          <span className="text-white/60 text-xs hidden sm:inline">Student view</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={withInstitutionPath('/admin', pathname)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Courses</span>
            <span className="sm:hidden">Courses</span>
          </Link>
          <div className="w-px h-4 bg-white/20" />
          <Link
            href={withInstitutionPath(`/admin/courses/${params.id}/editor`, pathname)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open Editor</span>
            <span className="sm:hidden">Editor</span>
          </Link>
        </div>
      </div>

      {/* Course viewer — fills remaining height below the banner */}
      <div className="flex-1 min-h-0">
        <CourseViewer courseId={params.id} previewMode />
      </div>
    </div>
  );
}
