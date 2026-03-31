'use client';

import { Settings } from 'lucide-react';
import { useEditorStore } from './editor-store-context';
import { BlockEditorPanel } from './block-editor-panel';
import type { EntitySelection } from '@/types';
import type { LessonData } from '@/lib/stores/editor-store';
import type { Slide } from '@/types';

export function PropertiesPanel() {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const modules = useEditorStore((s) => s.modules);
  const lessons = useEditorStore((s) => s.lessons);
  const slides = useEditorStore((s) => s.slides);

  function renderContent(entity: EntitySelection | null) {
    if (!entity) {
      return (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Settings className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">Select an element to edit its properties</p>
        </div>
      );
    }

    if (entity.type === 'block') {
      return <BlockEditorPanel blockId={entity.id} />;
    }

    if (entity.type === 'course') {
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course Theme</p>
          <p className="text-xs text-gray-400">Theme editor coming in Phase 4</p>
        </div>
      );
    }

    if (entity.type === 'module') {
      const mod = modules.find((m) => m.id === entity.id);
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</p>
          <p className="text-sm font-medium text-gray-700">{mod?.title ?? 'Unknown module'}</p>
          <p className="text-xs text-gray-400">Module property editor coming soon</p>
        </div>
      );
    }

    if (entity.type === 'lesson') {
      let lessonData: LessonData | undefined;
      for (const lessonList of lessons.values()) {
        lessonData = lessonList.find((l) => l.id === entity.id);
        if (lessonData) break;
      }
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lesson</p>
          <p className="text-sm font-medium text-gray-700">{lessonData?.title ?? 'Unknown lesson'}</p>
          <p className="text-xs text-gray-400">Lesson property editor coming soon</p>
        </div>
      );
    }

    if (entity.type === 'slide') {
      let slideData: Slide | undefined;
      for (const slideList of slides.values()) {
        slideData = slideList.find((s) => s.id === entity.id);
        if (slideData) break;
      }
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Slide</p>
          <p className="text-sm font-medium text-gray-700 capitalize">{slideData?.slide_type ?? 'Unknown type'}</p>
          <p className="text-xs text-gray-500">{slideData?.title ?? '(untitled)'}</p>
          <p className="text-xs text-gray-400 mt-2">Slide style editor coming in Phase 4</p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="w-[300px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
        <Settings className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Properties
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent(selectedEntity)}
      </div>
    </div>
  );
}
