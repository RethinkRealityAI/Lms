'use client';

import { Plus } from 'lucide-react';
import { useEditorStore } from './editor-store-context';

export function StructurePanel() {
  const modules = useEditorStore((s) => s.modules);
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);

  return (
    <div className="w-[260px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Structure
        </span>
        <button
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Add Module"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {modules.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-2">No modules yet</p>
            <button className="text-sm text-[#1E3A5F] font-medium hover:underline">
              + Add first module
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {modules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => selectEntity({ type: 'module', id: mod.id })}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedEntity?.type === 'module' && selectedEntity.id === mod.id
                    ? 'bg-[#1E3A5F] text-white'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {mod.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
