'use client';
// cache-bust: 2026-06-02
import { useState } from 'react';
import {
  Link, Upload, LayoutGrid, SlidersHorizontal, GalleryHorizontal,
  Image as ImageIcon, Rows3, Columns3, AlignLeft, AlignRight, AlignCenter,
} from 'lucide-react';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import { ColorSwatch } from '@/components/editor/theme-editor/color-swatch';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { ImageGalleryData } from '@/lib/content/blocks/image-gallery/schema';
import {
  DISPLAY_SIZE_LABEL,
  captionColorUsesInherit,
  resolveCaptionColor,
} from '@/lib/content/blocks/image-gallery/display-utils';
import { CaptionEditor } from './caption-editor';

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent min-h-[2.75rem]';

const sectionClass = 'pt-4 border-t border-gray-200 space-y-3';
const sectionLabelClass = 'text-xs font-semibold text-gray-500 uppercase tracking-wider';

type ImageEntry = ImageGalleryData['images'][number];

const DISPLAY_MODES: {
  value: ImageGalleryData['mode'];
  label: string;
  icon: typeof LayoutGrid;
  description: string;
}[] = [
  { value: 'single',   label: 'Single',   icon: ImageIcon,          description: 'One image, shown full width. The simplest option.' },
  { value: 'gallery',  label: 'Grid',     icon: LayoutGrid,          description: 'Multiple images in a column grid (2–4 across, or stacked).' },
  { value: 'slider',   label: 'Slider',   icon: SlidersHorizontal,   description: 'One image at a time with Previous / Next. Good for steps.' },
  { value: 'carousel', label: 'Carousel', icon: GalleryHorizontal,   description: 'Several images visible, auto-advancing. Pauses on hover.' },
];

// ─── Image source picker ──────────────────────────────────────────────────────

function ImageSource({ img, onUpdate }: { img: ImageEntry; onUpdate: (patch: Partial<ImageEntry>) => void }) {
  const [entryMode, setEntryMode] = useState<'url' | 'upload'>(img.url ? 'url' : 'upload');
  return (
    <>
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        <button type="button" onClick={() => setEntryMode('upload')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors ${entryMode === 'upload' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
          <Upload className="w-3 h-3" />Upload
        </button>
        <button type="button" onClick={() => setEntryMode('url')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors ${entryMode === 'url' ? 'bg-[#1E3A5F] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
          <Link className="w-3 h-3" />URL
        </button>
      </div>
      {entryMode === 'url' ? (
        <input type="url" value={img.url} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://… image URL" className={inputClass} />
      ) : (
        <DropZoneUploader
          bucket="block-media" pathPrefix="images/" accept="image/*"
          label="Drop image or click to upload"
          currentUrl={img.url || undefined}
          onUpload={(url) => onUpdate({ url })}
          previewMode="image"
        />
      )}
    </>
  );
}

function ImageEntryEditor({ img, index, showHeader, onUpdate, onRemove }: {
  img: ImageEntry; index: number; showHeader: boolean;
  onUpdate: (patch: Partial<ImageEntry>) => void; onRemove?: () => void;
}) {
  return (
    <div className="p-3 border border-gray-200 rounded-lg space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Image {index + 1}</span>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
          )}
        </div>
      )}
      <ImageSource img={img} onUpdate={onUpdate} />
      <input type="text" value={img.alt ?? ''} onChange={(e) => onUpdate({ alt: e.target.value || undefined })}
        placeholder="Alt text (for accessibility)" className={inputClass} />
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Caption</label>
        <CaptionEditor value={img.caption ?? ''} onChange={(html) => onUpdate({ caption: html || null })} />
      </div>
    </div>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────

export function ImageGalleryEditor({ data, onChange, slideBlockStyle }: BlockEditorProps<ImageGalleryData>) {
  const [hoveredMode, setHoveredMode] = useState<ImageGalleryData['mode'] | null>(null);

  // Always safe-guard images array
  const images = data.images ?? [];
  const mode = data.mode ?? 'single';
  const isSingle = mode === 'single';
  const isGrid = mode === 'gallery';

  function updateImage(index: number, patch: Partial<ImageEntry>) {
    const list = images.length > 0 ? images : [{ url: '', caption: '', alt: '' }];
    const updated = list.map((img, i) => (i === index ? { ...img, ...patch } : img));
    onChange({ ...data, images: updated });
  }
  function addImage() {
    onChange({ ...data, images: [...images, { url: '', caption: '', alt: '' }] });
  }
  function removeImage(index: number) {
    onChange({ ...data, images: images.filter((_, i) => i !== index) });
  }

  const activeMode = DISPLAY_MODES.find((m) => m.value === mode);
  const previewDescription = hoveredMode
    ? DISPLAY_MODES.find((m) => m.value === hoveredMode)?.description
    : activeMode?.description;

  const singleImage: ImageEntry = images[0] ?? { url: '', caption: '', alt: '' };

  const inheritCaption = captionColorUsesInherit(data.captionColor);
  const previewCaptionColor = resolveCaptionColor(data.captionColor, slideBlockStyle);

  const promptPosition = data.promptPosition ?? 'none';

  return (
    <div className="space-y-4 px-4 pb-4">

      {/* ── 1. Display mode ── */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Display Mode</label>
        <div className="grid grid-cols-4 gap-1.5">
          {DISPLAY_MODES.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button"
              onClick={() => onChange({ ...data, mode: value })}
              onMouseEnter={() => setHoveredMode(value)} onMouseLeave={() => setHoveredMode(null)}
              className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg border transition-colors ${
                mode === value ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F] hover:text-[#1E3A5F]'
              }`}>
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
        {previewDescription && <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">{previewDescription}</p>}
      </div>

      {/* ── 2. Appearance ── */}
      <div className={sectionClass}>
        <p className={sectionLabelClass}>Appearance</p>

        {/* Aspect Ratio */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Original', value: 'original' },
              { label: '16:9', value: '16/9' },
              { label: '4:3', value: '4/3' },
              { label: '1:1', value: '1/1' },
            ].map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => onChange({ ...data, aspectRatio: opt.value === 'original' ? undefined : opt.value })}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  (data.aspectRatio ?? 'original') === opt.value ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Image Fit */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Image Fit</label>
          <div className="flex gap-1.5">
            {[
              { label: 'Contain (show all)', value: 'contain' as const },
              { label: 'Cover (fill frame)',  value: 'cover'   as const },
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => onChange({ ...data, objectFit: opt.value })}
                className={`flex-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  (data.objectFit ?? 'contain') === opt.value ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Display size */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Height</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(DISPLAY_SIZE_LABEL) as Array<keyof typeof DISPLAY_SIZE_LABEL>).map((size) => (
              <button key={size} type="button" onClick={() => onChange({ ...data, displaySize: size })}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                  (data.displaySize ?? 'md') === size ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}>{DISPLAY_SIZE_LABEL[size]}</button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">Use Contain fit to show the full image.</p>
        </div>

        {/* Caption color */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Caption Color</label>
          <div className="flex gap-1.5 mb-2">
            <button type="button" onClick={() => onChange({ ...data, captionColor: undefined })}
              className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                inheritCaption ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}>
              Match slide style
            </button>
            <button type="button" onClick={() => onChange({ ...data, captionColor: previewCaptionColor })}
              className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                !inheritCaption ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
              }`}>
              Custom
            </button>
          </div>
          {inheritCaption ? (
            <p className="text-[10px] text-gray-400">
              Uses the slide block style text color
              <span className="inline-block w-3 h-3 rounded-sm border border-gray-200 align-middle ml-1.5" style={{ backgroundColor: previewCaptionColor }} />
              <span className="font-mono ml-1">{previewCaptionColor}</span>
            </p>
          ) : (
            <ColorSwatch label="Caption" value={data.captionColor ?? previewCaptionColor} onChange={(v) => onChange({ ...data, captionColor: v })} />
          )}
        </div>
      </div>

      {/* ── 3. Grid options (gallery mode only) ── */}
      {isGrid && (
        <div className={sectionClass}>
          <p className={sectionLabelClass}>Grid Layout</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Arrangement</label>
            <div className="flex gap-1.5">
              {([
                { value: 'sideBySide' as const, label: 'Side by side', icon: Columns3 },
                { value: 'stacked'    as const, label: 'Stacked',       icon: Rows3 },
              ]).map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => onChange({ ...data, gridLayout: value })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                    (data.gridLayout ?? 'sideBySide') === value ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          {(data.gridLayout ?? 'sideBySide') === 'sideBySide' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Columns</label>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => onChange({ ...data, columns: n })}
                    className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      (data.columns ?? 2) === n ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                    }`}>{n} col{n > 1 ? 's' : ''}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Lightbox & Interaction ── */}
      <div className={sectionClass}>
        <p className={sectionLabelClass}>Lightbox &amp; Interaction</p>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={data.clickForMore === true}
            onChange={(e) => {
              const enabled = e.target.checked;
              onChange({ ...data, clickForMore: enabled, enableLightbox: true, captionInGrid: enabled ? false : data.captionInGrid });
            }}
            className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
          <span className="text-sm text-gray-700">Click for more information</span>
        </label>
        {data.clickForMore && (
          <p className="text-[10px] text-gray-400 pl-6 -mt-1">
            Hides captions in the grid; opens a card popup with the full caption on tap.
          </p>
        )}

        {!data.clickForMore && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data.captionInGrid !== false}
              onChange={(e) => onChange({ ...data, captionInGrid: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
            <span className="text-sm text-gray-700">Show captions under images</span>
          </label>
        )}

        {data.clickForMore && (
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Tap hint text</label>
            <input type="text" value={data.clickHint ?? 'Tap for more'}
              onChange={(e) => onChange({ ...data, clickHint: e.target.value })}
              placeholder="Tap for more" className={inputClass} />
          </div>
        )}

        {!data.clickForMore && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data.enableLightbox !== false}
              onChange={(e) => onChange({ ...data, enableLightbox: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
            <span className="text-sm text-gray-700">Click to enlarge (lightbox)</span>
          </label>
        )}

        {(data.clickForMore || data.enableLightbox !== false) && (
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.markClicked !== false}
                onChange={(e) => onChange({ ...data, markClicked: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
              <span className="text-sm text-gray-700">Show viewed indicator on opened images</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.requireAllClicked === true}
                onChange={(e) => onChange({ ...data, requireAllClicked: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]" />
              <span className="text-sm text-gray-700">Require all images to be opened before continuing</span>
            </label>
          </>
        )}
      </div>

      {/* ── 5. Prompt / caption for the whole block ── */}
      <div className={sectionClass}>
        <p className={sectionLabelClass}>Block Prompt</p>
        <p className="text-[11px] text-gray-400 -mt-1">Optional text shown above or below the entire image block — use for instructions or context.</p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
          <div className="flex gap-1.5">
            {([
              { value: 'none'   as const, label: 'Hidden',  icon: null },
              { value: 'top'    as const, label: '↑ Above', icon: null },
              { value: 'bottom' as const, label: '↓ Below', icon: null },
            ]).map(({ value, label }) => (
              <button key={value} type="button" onClick={() => onChange({ ...data, promptPosition: value })}
                className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  promptPosition === value ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1E3A5F]'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {promptPosition !== 'none' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prompt text</label>
            <textarea
              value={data.prompt ?? ''}
              onChange={(e) => onChange({ ...data, prompt: e.target.value || undefined })}
              placeholder="e.g. Tap each image to learn more"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>

      {/* ── 6. Images (always last) ── */}
      <div className={sectionClass}>
        <p className={sectionLabelClass}>Images</p>

        {isSingle ? (
          <ImageEntryEditor img={singleImage} index={0} showHeader={false} onUpdate={(patch) => updateImage(0, patch)} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''}</span>
              <button type="button" onClick={addImage}
                className="px-2 py-1 text-xs bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors">+ Add Image</button>
            </div>
            {images.length === 0 && (
              <p className="text-xs text-gray-400 italic py-2">No images yet. Click &quot;Add Image&quot; to get started.</p>
            )}
            {images.map((img, i) => (
              <ImageEntryEditor key={i} img={img} index={i} showHeader onUpdate={(patch) => updateImage(i, patch)} onRemove={() => removeImage(i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
