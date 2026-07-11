'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import {
  Trash2, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
} from 'lucide-react';
import { getBlockType } from '@/lib/content/block-registry';
import { getCompatibleTypes, transformBlockData } from '@/lib/content/block-type-compat';
import { GRID_COLS, getBlockGridLayout, blockSurfaceFillCell } from '@/lib/content/gridConstants';
import { resolveEffectiveTheme } from '@/lib/tenant/institution-theme';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import { useEditorStore } from './editor-store-context';
import { BlockTemplateToolbar } from './block-template-toolbar';
import { extractLayout } from '@/lib/db/block-templates';
import type { BlockData } from '@/lib/stores/editor-store';

/** Block types that don't use the generic template library (survey has its own; page breaks have no content). */
const NO_TEMPLATE_LIBRARY = new Set(['survey', 'page_break']);

const WIDTH_PRESETS: { label: string; w: number; title: string }[] = [
  { label: 'S', w: 4, title: 'Small — one third' },
  { label: 'M', w: 6, title: 'Medium — half' },
  { label: 'L', w: 8, title: 'Large — two thirds' },
  { label: 'Full', w: GRID_COLS, title: 'Full width' },
];

// Minimum heights (rem) for fill-cell interactive blocks. "Auto" clears the override
// so the block hugs its content (or fills more automatically when it's alone).
const HEIGHT_PRESETS: { label: string; rem: number | undefined; title: string }[] = [
  { label: 'Auto', rem: undefined, title: 'Fit content (fills more when it’s the only block)' },
  { label: 'M', rem: 18, title: 'Medium height' },
  { label: 'L', rem: 26, title: 'Large height' },
  { label: 'XL', rem: 36, title: 'Extra large — fills most of the slide' },
];

interface BlockEditorPanelProps {
  blockId: string;
  onDelete?: () => void;
}

export function BlockEditorPanel({ blockId, onDelete }: BlockEditorPanelProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const setBlockWidth = useEditorStore((s) => s.setBlockWidth);
  const switchBlockType = useEditorStore((s) => s.switchBlockType);
  const slides = useEditorStore((s) => s.slides);
  const themeSettings = useEditorStore((s) => s.themeSettings);
  const institutionTheme = useEditorStore((s) => s.institutionTheme);
  const pathname = usePathname();
  const devicePreview = useEditorStore((s) => s.devicePreview);
  const breakpoint = devicePreview === 'mobile' ? 'mobile' : devicePreview === 'tablet' ? 'tablet' : 'desktop';

  // Find the block across all slides
  let foundBlock: { slideId: string; block: BlockData } | null = null;
  for (const [slideId, slideBlocks] of blocks) {
    const block = slideBlocks.find((b) => b.id === blockId);
    if (block) {
      foundBlock = { slideId, block };
      break;
    }
  }

  if (!foundBlock) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">Block not found</p>
    );
  }

  const { slideId, block } = foundBlock;
  // The vertical-position control is only meaningful when this is the ONLY block on
  // the slide AND the block hugs its content (video, text, table, list, image…).
  // Fill-cell blocks (quiz, match, survey…) already stretch to fill the slide, so
  // positioning them would do nothing — the control is hidden for those.
  const isSoleBlock = (blocks.get(slideId)?.length ?? 0) === 1;
  const showVerticalPosition = isSoleBlock && !blockSurfaceFillCell(block.block_type);
  const definition = getBlockType(block.block_type);

  if (!definition?.EditorComponent) {
    return (
      <div className="rounded-lg border border-gray-200 p-3 text-center">
        <p className="text-xs text-gray-500">No editor available</p>
        <p className="text-xs text-gray-400 mt-1">Block type: {block.block_type}</p>
      </div>
    );
  }

  const EditorComponent = definition.EditorComponent;
  // Default block style comes from the full theme cascade (course → institution →
  // system default), not just the course settings — a slide-level block_style
  // still overrides it below. slides is Map<lessonId, Slide[]> — search all
  // lesson arrays for this slideId.
  const effectiveTheme = resolveEffectiveTheme({
    course: themeSettings,
    institution: institutionTheme,
    branding: getInstitutionBranding(resolveInstitutionSlug(pathname)),
  });
  let slideBlockStyle: string = effectiveTheme.defaultBlockStyle;
  for (const slideArray of slides.values()) {
    const found = slideArray.find((s) => s.id === slideId);
    if (found) {
      const bs = (found.settings as Record<string, unknown> | undefined)?.block_style;
      if (typeof bs === 'string') slideBlockStyle = bs;
      break;
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
          {definition.label}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          {definition.category}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete block"
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Reusable template library — save this block's content or load a saved one. */}
      {!NO_TEMPLATE_LIBRARY.has(block.block_type) && (
        <BlockTemplateToolbar
          blockType={block.block_type}
          blockLabel={definition.label}
          data={(block.data ?? {}) as Record<string, unknown>}
          onApply={(templateData) => {
            // Keep the target block's own position/size; replace only its content.
            const layout = extractLayout((block.data ?? {}) as Record<string, unknown>);
            updateBlock(slideId, blockId, { data: { ...templateData, ...layout } });
          }}
        />
      )}

      {(() => {
        const compatibleTypes = getCompatibleTypes(block.block_type);
        if (compatibleTypes.length === 0) return null;
        return (
          <div className="px-4 py-2 border-b border-gray-100">
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Block Type</label>
            <select
              value={block.block_type}
              onChange={(e) => {
                const newType = e.target.value;
                const newData = transformBlockData(block.block_type, newType, (block.data ?? {}) as Record<string, unknown>);
                switchBlockType(slideId, block.id, newType, newData);
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white capitalize"
            >
              <option value={block.block_type}>{block.block_type.replace(/_/g, ' ')}</option>
              {compatibleTypes.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        );
      })()}
      {/* ── Vertical position on the slide (sole, content-hugging blocks only) ── */}
      {showVerticalPosition && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Vertical Position
          </p>
          <div className="flex gap-1">
            {([
              { value: undefined,  Icon: AlignStartVertical,  title: 'Top (default)' },
              { value: 'center',   Icon: AlignCenterVertical, title: 'Middle' },
              { value: 'bottom',   Icon: AlignEndVertical,    title: 'Bottom' },
            ] as const).map(({ value, Icon, title }) => {
              const current = (block.data as Record<string,unknown>)?.contentAlign;
              const isActive = current === value || (value === undefined && !current);
              return (
                <button
                  key={title}
                  type="button"
                  title={title}
                  onClick={() => {
                    const newData = { ...(block.data as Record<string,unknown>) };
                    if (value === undefined) {
                      delete newData.contentAlign;
                    } else {
                      newData.contentAlign = value;
                    }
                    updateBlock(slideId, blockId, { data: newData });
                  }}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Positions this component on the slide. Open Preview to see it.
          </p>
        </div>
      )}

      {/* ── Block width (height stays auto-fit to content) ───────────────── */}
      {(() => {
        const grid = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
        const w = grid.gridW;
        const isFull = w >= GRID_COLS;
        const alignOf = (): 'left' | 'center' | 'right' | null => {
          if (grid.gridX === 0) return 'left';
          if (grid.gridX === GRID_COLS - w) return 'right';
          if (grid.gridX === Math.floor((GRID_COLS - w) / 2)) return 'center';
          return null;
        };
        const activeAlign = alignOf();
        return (
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Width</p>
              {!WIDTH_PRESETS.some((p) => p.w === w) && (
                <span className="text-[10px] text-gray-400">{w}/{GRID_COLS} cols</span>
              )}
            </div>
            <div className="flex gap-1">
              {WIDTH_PRESETS.map((p) => {
                const isActive = w === p.w;
                return (
                  <button
                    key={p.label}
                    type="button"
                    title={p.title}
                    onClick={() => setBlockWidth(slideId, blockId, p.w)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {!isFull && (
              <div className="flex gap-1 mt-1.5">
                {([
                  { value: 'left', Icon: AlignHorizontalJustifyStart, title: 'Align left' },
                  { value: 'center', Icon: AlignHorizontalJustifyCenter, title: 'Align center' },
                  { value: 'right', Icon: AlignHorizontalJustifyEnd, title: 'Align right' },
                ] as const).map(({ value, Icon, title }) => (
                  <button
                    key={value}
                    type="button"
                    title={title}
                    onClick={() => setBlockWidth(slideId, blockId, w, value)}
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-all ${
                      activeAlign === value
                        ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5">
              Drag a block’s side handles to fine-tune width.
            </p>
          </div>
        );
      })()}

      {/* ── Block height (interactive / fill-cell blocks only) ───────────── */}
      {blockSurfaceFillCell(block.block_type) && (() => {
        const data = (block.data ?? {}) as Record<string, unknown>;
        const current = typeof data.block_min_h === 'number' ? (data.block_min_h as number) : undefined;
        const setHeight = (rem: number | undefined) => {
          const next = { ...data };
          if (rem == null) delete next.block_min_h;
          else next.block_min_h = rem;
          updateBlock(slideId, blockId, { data: next });
        };
        return (
          <div className="px-4 py-2.5 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Height</p>
            <div className="flex gap-1">
              {HEIGHT_PRESETS.map((p) => {
                const isActive = current === p.rem || (p.rem === undefined && current === undefined);
                return (
                  <button
                    key={p.label}
                    type="button"
                    title={p.title}
                    onClick={() => setHeight(p.rem)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Sets a minimum height so interactive blocks fill the slide nicely. “Auto” fits content.
            </p>
          </div>
        );
      })()}

      <Suspense
        key={block.id}
        fallback={
          <div className="animate-pulse bg-gray-100 rounded-lg h-32" />
        }
      >
        <EditorComponent
          data={block.data}
          block={{ id: block.id, title: '' }}
          slideBlockStyle={slideBlockStyle}
          breakpoint={breakpoint}
          onChange={(newData) => {
            updateBlock(slideId, blockId, { data: newData as Record<string, unknown> });
          }}
        />
      </Suspense>
    </div>
  );
}
