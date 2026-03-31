'use client';

import { useMemo } from 'react';
import { ColorSwatch } from './color-swatch';
import { CourseCardPreview } from './course-card-preview';
import { resolveTheme, DEFAULT_THEME } from '@/lib/content/theme';
import { useEditorStore } from '../editor-store-context';
import type { InstitutionTheme } from '@/types';

export function CourseThemeEditor() {
  const courseTheme = useEditorStore((s) => s.courseTheme);
  const updateCourseTheme = useEditorStore((s) => s.updateCourseTheme);
  const courseId = useEditorStore((s) => s.courseId);

  const resolvedTheme = useMemo(() =>
    resolveTheme({ course: courseTheme as Partial<InstitutionTheme> }),
    [courseTheme]
  );

  const FONT_OPTIONS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Merriweather'];
  const RADIUS_OPTIONS: Array<{ value: InstitutionTheme['borderRadius']; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'SM' },
    { value: 'md', label: 'MD' },
    { value: 'lg', label: 'LG' },
    { value: 'full', label: 'Full' },
  ];

  // Suppress unused warning — courseId is available for future persistence
  void courseId;

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Course Card Preview</p>
        <CourseCardPreview theme={resolvedTheme} courseTitle="Your Course Title" />
      </div>

      <div className="border-t border-gray-100" />

      {/* Colors */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Colors</p>
        <div className="space-y-0.5">
          <ColorSwatch
            label="Primary"
            value={resolvedTheme.primaryColor}
            onChange={(v) => updateCourseTheme({ primaryColor: v })}
          />
          <ColorSwatch
            label="Accent"
            value={resolvedTheme.accentColor}
            onChange={(v) => updateCourseTheme({ accentColor: v })}
          />
          <ColorSwatch
            label="Background"
            value={resolvedTheme.backgroundColor}
            onChange={(v) => updateCourseTheme({ backgroundColor: v })}
          />
          <ColorSwatch
            label="Text"
            value={resolvedTheme.textColor}
            onChange={(v) => updateCourseTheme({ textColor: v })}
          />
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Typography */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Typography</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Font Family</label>
            <select
              value={resolvedTheme.fontFamily}
              onChange={(e) => updateCourseTheme({ fontFamily: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Font Scale: {resolvedTheme.fontScale}×
            </label>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={resolvedTheme.fontScale}
              onChange={(e) => updateCourseTheme({ fontScale: parseFloat(e.target.value) })}
              className="w-full accent-[#1E3A5F]"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Radius */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Border Radius</p>
        <div className="flex gap-1.5">
          {RADIUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateCourseTheme({ borderRadius: value })}
              className={`flex-1 py-1 text-xs rounded transition-colors ${
                resolvedTheme.borderRadius === value
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Reset */}
      <button
        onClick={() => updateCourseTheme(DEFAULT_THEME)}
        className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  );
}
