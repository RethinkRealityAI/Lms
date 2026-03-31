'use client';

import { SlideTypeIcon } from './slide-type-icon';
import type { SlideTemplateConfig } from '@/lib/content/slide-templates';

interface TemplateCardProps {
  template: SlideTemplateConfig;
  onSelect: (template: SlideTemplateConfig) => void;
}

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={() => onSelect(template)}
      className="flex flex-col items-start p-4 border-2 border-transparent rounded-xl hover:border-[#1E3A5F] hover:bg-blue-50 transition-all text-left group w-full"
    >
      <div
        className="w-full h-16 rounded-lg mb-3 flex items-center justify-center"
        style={{ backgroundColor: template.accentColor + '20' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: template.accentColor }}
        >
          <SlideTypeIcon type={template.type} className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1E3A5F]">
        {template.name}
      </p>
      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
        {template.description}
      </p>
    </button>
  );
}
