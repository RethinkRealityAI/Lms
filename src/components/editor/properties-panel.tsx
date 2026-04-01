'use client';

import { useState, useEffect } from 'react';
import { Settings, Type, FileText, Image as ImageIcon, Play, HelpCircle, File as FileIcon, Square, CheckSquare, PanelRightClose, PanelRightOpen, Code, Video } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useEditorStore } from './editor-store-context';
import { BlockEditorPanel } from './block-editor-panel';
import { CourseThemeEditor } from './theme-editor/course-theme-editor';
import { SlideStyleEditor } from './theme-editor/slide-style-editor';
import type { EntitySelection } from '@/types';
import type { LessonData } from '@/lib/stores/editor-store';
import type { Slide } from '@/types';

interface PropertiesPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAddBlock?: (slideId: string, blockType: string) => void;
  onDeleteBlock?: () => void;
}

const AVAILABLE_BLOCKS = [
  { type: 'rich_text', label: 'Rich Text', icon: Type, color: 'text-blue-500 bg-blue-50' },
  { type: 'image_gallery', label: 'Image', icon: ImageIcon, color: 'text-emerald-500 bg-emerald-50' },
  { type: 'video', label: 'Video', icon: Video, color: 'text-red-500 bg-red-50' },
  { type: 'cta', label: 'Button', icon: Square, color: 'text-indigo-500 bg-indigo-50' },
  { type: 'quiz_inline', label: 'Quiz', icon: CheckSquare, color: 'text-orange-500 bg-orange-50' },
  { type: 'callout', label: 'Callout', icon: HelpCircle, color: 'text-yellow-600 bg-yellow-50' },
  { type: 'pdf', label: 'PDF Viewer', icon: FileIcon, color: 'text-rose-500 bg-rose-50' },
  { type: 'iframe', label: 'Embed (iframe)', icon: Code, color: 'text-purple-500 bg-purple-50' },
];

function ModuleEditor({ moduleId }: { moduleId: string }) {
  const modules = useEditorStore((s) => s.modules);
  const updateModule = useEditorStore((s) => s.updateModule);
  const mod = modules.find((m) => m.id === moduleId);

  const [title, setTitle] = useState(mod?.title ?? '');
  const [description, setDescription] = useState(mod?.description ?? '');

  useEffect(() => {
    setTitle(mod?.title ?? '');
    setDescription(mod?.description ?? '');
  }, [moduleId, mod?.title, mod?.description]);

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== mod?.title) {
      updateModule(moduleId, { title: trimmed });
    }
  };

  const handleDescriptionBlur = () => {
    const trimmed = description.trim();
    if (trimmed !== (mod?.description ?? '')) {
      updateModule(moduleId, { description: trimmed });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Module Properties</p>
      <div className="space-y-1.5">
        <Label htmlFor="mod-title" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <Type className="w-3 h-3" /> Title
        </Label>
        <Input
          id="mod-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-9 text-sm"
          maxLength={200}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mod-desc" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Description
        </Label>
        <Textarea
          id="mod-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={3}
          className="text-sm resize-none"
          placeholder="Optional description..."
          maxLength={500}
        />
        <p className="text-[10px] text-gray-400 text-right">{description.length}/500</p>
      </div>
    </div>
  );
}

function LessonEditor({ lessonId }: { lessonId: string }) {
  const lessons = useEditorStore((s) => s.lessons);
  const updateLesson = useEditorStore((s) => s.updateLesson);

  let lessonData: LessonData | undefined;
  let parentModuleId: string | undefined;
  for (const [moduleId, lessonList] of lessons.entries()) {
    lessonData = lessonList.find((l) => l.id === lessonId);
    if (lessonData) {
      parentModuleId = moduleId;
      break;
    }
  }

  const [title, setTitle] = useState(lessonData?.title ?? '');
  const [description, setDescription] = useState(lessonData?.description ?? '');

  useEffect(() => {
    setTitle(lessonData?.title ?? '');
    setDescription(lessonData?.description ?? '');
  }, [lessonId, lessonData?.title, lessonData?.description]);

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== lessonData?.title && parentModuleId) {
      updateLesson(parentModuleId, lessonId, { title: trimmed });
    }
  };

  const handleDescriptionBlur = () => {
    const trimmed = description.trim();
    if (trimmed !== (lessonData?.description ?? '') && parentModuleId) {
      updateLesson(parentModuleId, lessonId, { description: trimmed });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lesson Properties</p>
      <div className="space-y-1.5">
        <Label htmlFor="lesson-title" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <Type className="w-3 h-3" /> Title
        </Label>
        <Input
          id="lesson-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-9 text-sm"
          maxLength={200}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lesson-desc" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Description
        </Label>
        <Textarea
          id="lesson-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={3}
          className="text-sm resize-none"
          placeholder="Optional description..."
          maxLength={500}
        />
        <p className="text-[10px] text-gray-400 text-right">{description.length}/500</p>
      </div>
    </div>
  );
}

export function PropertiesPanel({ collapsed, onToggleCollapse, onAddBlock, onDeleteBlock }: PropertiesPanelProps) {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const slides = useEditorStore((s) => s.slides);
  const blocks = useEditorStore((s) => s.blocks);
  const [activeTab, setActiveTab] = useState<'properties' | 'components'>('properties');

  useEffect(() => {
    if (selectedEntity?.type === 'block') {
      setActiveTab('properties');
    }
  }, [selectedEntity?.id, selectedEntity?.type]);

  let activeSlideId: string | null = null;
  if (selectedEntity?.type === 'slide') {
    activeSlideId = selectedEntity.id;
  } else if (selectedEntity?.type === 'block') {
    for (const [slideId, blockList] of blocks) {
      if (blockList.some(b => b.id === selectedEntity.id)) {
        activeSlideId = slideId;
        break;
      }
    }
  }

  function renderContent(entity: EntitySelection | null) {
    if (activeTab === 'components' && activeSlideId) {
      return (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Elements</p>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_BLOCKS.map((block) => (
              <button
                key={block.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-block-type', block.type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAddBlock?.(activeSlideId!, block.type)}
                disabled={!activeSlideId}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow hover:border-blue-300 transition-all group ${
                  !activeSlideId ? 'opacity-50 cursor-not-allowed hidden' : ''
                }`}
                title={`Click or drag to add ${block.label}`}
              >
                <div className={`p-2 rounded-md ${block.color} group-hover:scale-110 transition-transform`}>
                  <block.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-600">{block.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

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
      return <BlockEditorPanel blockId={entity.id} onDelete={onDeleteBlock} />;
    }

    if (entity.type === 'course') {
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Course Theme</p>
          <CourseThemeEditor />
        </div>
      );
    }

    if (entity.type === 'module') {
      return <ModuleEditor moduleId={entity.id} />;
    }

    if (entity.type === 'lesson') {
      return <LessonEditor lessonId={entity.id} />;
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
          <SlideStyleEditor slideId={entity.id} />
        </div>
      );
    }

    return null;
  }

  const showTabs = activeSlideId !== null;

  return (
    <div className={`shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'w-12' : 'w-[300px]'}`}>
      <div className={`flex flex-col border-b border-gray-100 shrink-0 ${collapsed ? 'py-2.5 items-center' : ''}`}>
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : 'px-3 pt-2.5 pb-2'} shrink-0`}>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Expand Properties' : 'Collapse Properties'}
          >
            {collapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
          {!collapsed && (
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1 overflow-hidden whitespace-nowrap">
              Properties
            </span>
          )}
        </div>
        {!collapsed && showTabs && (
          <div className="flex items-center px-1 pb-1 gap-1">
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${activeTab === 'properties' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveTab('components')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${activeTab === 'components' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
              Components
            </button>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          {renderContent(selectedEntity)}
        </div>
      )}
    </div>
  );
}
