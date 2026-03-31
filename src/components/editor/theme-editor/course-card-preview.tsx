'use client';

import type { ResolvedTheme } from '@/lib/content/theme';

interface CourseCardPreviewProps {
  theme: ResolvedTheme;
  courseTitle: string;
}

export function CourseCardPreview({ theme, courseTitle }: CourseCardPreviewProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Thumbnail area */}
      <div
        className="h-20 flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)` }}
      >
        <span className="text-white text-xs font-medium opacity-70">Course Thumbnail</span>
      </div>
      {/* Card body */}
      <div className="p-3 bg-white">
        <p className="text-xs font-semibold text-gray-800 mb-1 truncate">{courseTitle || 'Course Title'}</p>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: '60%', backgroundColor: theme.accentColor }}
            />
          </div>
          <span className="text-xs text-gray-400">60%</span>
        </div>
        <button
          className="w-full py-1 px-2 rounded text-xs font-medium text-white transition-colors"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
