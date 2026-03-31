'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import CourseViewer from '@/components/student/course-viewer';

export default function AdminPreviewPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);

  return (
    // Fixed overlay covers the entire viewport including the admin nav
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Preview banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Admin Preview</span>
          <span className="text-white/40 text-sm hidden sm:inline">·</span>
          <span className="text-white/60 text-xs hidden sm:inline">Viewing as a student would see this course</span>
        </div>
        <Link
          href={`/gansid/admin/courses/${params.id}/editor`}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Link>
      </div>

      {/* Course viewer — fills remaining height below the banner */}
      <div className="flex-1 min-h-0">
        <CourseViewer courseId={params.id} previewMode />
      </div>
    </div>
  );
}
