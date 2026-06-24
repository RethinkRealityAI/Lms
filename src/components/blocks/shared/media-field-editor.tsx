'use client';

import { Image as ImageIcon, Video, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import { MediaView } from './media-view';
import {
  type MediaField, type MediaPosition, type MediaSize,
  DEFAULT_MEDIA, MEDIA_SIZE_LABEL, hasMedia,
} from '@/lib/content/blocks/shared/media';

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const SIZES: MediaSize[] = ['icon', 'xs', 'sm', 'md', 'lg', 'full'];
const POSITION_META: Record<MediaPosition, { label: string; Icon: typeof ArrowUp }> = {
  top: { label: 'Above', Icon: ArrowUp },
  bottom: { label: 'Below', Icon: ArrowDown },
  left: { label: 'Left', Icon: ArrowLeft },
  right: { label: 'Right', Icon: ArrowRight },
};

function Pill({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
        active ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

export function MediaFieldEditor({
  media,
  onChange,
  pathPrefix,
  position,
  onPositionChange,
  positionOptions = ['top', 'bottom', 'left', 'right'],
  label = 'Media',
}: {
  media?: MediaField | null;
  /** Pass `undefined` to clear the media. */
  onChange: (m: MediaField | undefined) => void;
  pathPrefix: string;
  position?: MediaPosition;
  onPositionChange?: (p: MediaPosition) => void;
  positionOptions?: MediaPosition[];
  label?: string;
}) {
  const m = media ?? DEFAULT_MEDIA;
  const kind = m.kind ?? 'image';
  const set = (patch: Partial<MediaField>) => onChange({ ...m, ...patch });

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        {hasMedia(m) && (
          <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-500">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {/* Kind toggle */}
      <div className="flex gap-1.5">
        <Pill active={kind === 'image'} onClick={() => set({ kind: 'image' })}><span className="inline-flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Image</span></Pill>
        <Pill active={kind === 'video'} onClick={() => set({ kind: 'video' })}><span className="inline-flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Video</span></Pill>
      </div>

      {/* Upload + URL */}
      <DropZoneUploader
        bucket="block-media"
        pathPrefix={pathPrefix}
        accept={kind === 'video' ? 'video/*' : 'image/*'}
        label={`Drop ${kind} or click to upload`}
        hint={kind === 'video' ? 'MP4/WebM — or paste a YouTube/Vimeo URL below' : 'JPG, PNG, WebP, SVG'}
        currentUrl={m.url || undefined}
        onUpload={(url) => set({ url })}
        onRemove={() => set({ url: '' })}
        previewMode={kind === 'video' ? 'filename' : 'image'}
      />
      <input
        type="url"
        value={m.url ?? ''}
        placeholder={kind === 'video' ? 'https://youtube.com/…  or video URL' : 'https://…/image.png'}
        onChange={(e) => set({ url: e.target.value })}
        className={inputClass}
      />

      {hasMedia(m) && (
        <>
          {/* Live preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-2 flex justify-center">
            <div style={{ maxWidth: 220, width: '100%' }}><MediaView media={m} /></div>
          </div>

          {/* Size */}
          <div>
            <p className="text-[11px] font-medium text-gray-600 mb-1">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <Pill key={s} active={(m.size ?? 'md') === s} onClick={() => set({ size: s })}>{MEDIA_SIZE_LABEL[s]}</Pill>
              ))}
            </div>
          </div>

          {/* Position (when the host supports it) */}
          {onPositionChange && (
            <div>
              <p className="text-[11px] font-medium text-gray-600 mb-1">Position</p>
              <div className="flex flex-wrap gap-1.5">
                {positionOptions.map((p) => {
                  const { label: pl, Icon } = POSITION_META[p];
                  return (
                    <Pill key={p} active={position === p} onClick={() => onPositionChange(p)} title={pl}>
                      <span className="inline-flex items-center gap-1"><Icon className="w-3.5 h-3.5" /> {pl}</span>
                    </Pill>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fit + rounded (images) */}
          {kind === 'image' && (
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <Pill active={(m.fit ?? 'contain') === 'contain'} onClick={() => set({ fit: 'contain' })}>Contain</Pill>
                <Pill active={m.fit === 'cover'} onClick={() => set({ fit: 'cover' })}>Cover</Pill>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-auto">
                <input type="checkbox" checked={m.rounded !== false} onChange={(e) => set({ rounded: e.target.checked })} className="accent-[#1A3C6E] w-3.5 h-3.5" />
                Rounded
              </label>
            </div>
          )}

          {/* Alt + caption */}
          <input
            type="text"
            value={m.alt ?? ''}
            placeholder="Alt text (accessibility)"
            onChange={(e) => set({ alt: e.target.value || undefined })}
            className={inputClass}
          />
          <input
            type="text"
            value={m.caption ?? ''}
            placeholder="Caption (optional)"
            onChange={(e) => set({ caption: e.target.value || undefined })}
            className={inputClass}
          />
        </>
      )}
    </div>
  );
}
