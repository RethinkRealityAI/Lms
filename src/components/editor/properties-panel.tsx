'use client';

import { Settings } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

export function PropertiesPanel() {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);

  return (
    <div className="w-[300px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 shrink-0">
        <Settings className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Properties
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedEntity ? (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Settings className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">
              Select an element to edit its properties
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Selected
              </p>
              <p className="text-sm font-medium text-gray-700 capitalize">
                {selectedEntity.type}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {selectedEntity.id.slice(0, 16)}...
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Full property editors coming in Phase 3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
