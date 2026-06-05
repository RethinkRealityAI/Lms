'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Monitor, Tablet, Smartphone } from 'lucide-react';
import CourseViewer from '@/components/student/course-viewer';
import { EmbedDeviceFrame } from './embed-device-frame';

type Device = 'desktop' | 'tablet' | 'mobile';

interface LessonPreviewDialogProps {
  courseId: string;
  /** Called when closing; passes the active device so the editor can stay in sync */
  onClose: (lastDevice?: Device) => void;
  initialLessonId?: string | null;
  initialSlideId?: string | null;
  initialDevice?: Device;
}

export function LessonPreviewDialog({
  courseId,
  onClose,
  initialLessonId,
  initialSlideId,
  initialDevice = 'desktop',
}: LessonPreviewDialogProps) {
  const [device, setDevice] = useState<Device>(initialDevice);

  const DEVICE_BTNS: { id: Device; Icon: typeof Monitor; label: string }[] = [
    { id: 'desktop', Icon: Monitor, label: 'Desktop' },
    { id: 'tablet', Icon: Tablet, label: 'Tablet' },
    { id: 'mobile', Icon: Smartphone, label: 'Mobile' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Play className="h-4 w-4 text-white/70 shrink-0" />
          <span className="text-white text-sm font-semibold shrink-0">Preview</span>
          <span className="text-white/50 text-xs truncate hidden md:inline">Opens on the slide you were editing · no progress is saved</span>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
          {DEVICE_BTNS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              title={`${label} preview`}
              className={`p-1.5 rounded-md transition-all ${
                device === id ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <button
          onClick={() => onClose(device)}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors shrink-0"
        >
          <span>Back to Editor</span>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content — desktop renders the viewer directly; tablet/mobile use a real
          device-frame iframe so the layout matches a physical device exactly. */}
      <div className="flex-1 min-h-0">
        {device === 'desktop' ? (
          <CourseViewer
            courseId={courseId}
            previewMode
            initialLessonId={initialLessonId}
            initialSlideId={initialSlideId}
          />
        ) : (
          <EmbedDeviceFrame
            courseId={courseId}
            device={device}
            initialLessonId={initialLessonId}
            initialSlideId={initialSlideId}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
