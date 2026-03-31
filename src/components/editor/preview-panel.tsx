'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function PreviewPanel() {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const selectedEntity = useEditorStore((s) => s.selectedEntity);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</span>
        <div className="flex items-center gap-0.5">
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`p-1.5 rounded transition-colors ${
                device === d ? 'bg-gray-200 text-gray-700' : 'hover:bg-gray-100 text-gray-400'
              }`}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
            >
              {d === 'desktop' && <Monitor className="w-4 h-4" />}
              {d === 'tablet' && <Tablet className="w-4 h-4" />}
              {d === 'mobile' && <Smartphone className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center p-6 overflow-auto">
        <div
          className="bg-white rounded-xl shadow-lg border border-gray-200 transition-all duration-300 flex flex-col"
          style={{
            width: DEVICE_WIDTHS[device],
            maxWidth: '100%',
            minHeight: '500px',
          }}
        >
          {!selectedEntity ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-12">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Monitor className="w-6 h-6 text-gray-300" />
                </div>
                <p>Select a lesson or slide to preview</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8">
              <p>Live preview coming in Phase 2</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 py-3 bg-white border-t border-gray-200 shrink-0">
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500">No slide selected</span>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
