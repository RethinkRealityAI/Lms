'use client';

import { MessageCircle, Info } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { CalloutData } from '@/lib/content/blocks/callout/schema';
import { RichTextEditor } from '../rich-text/editor';
import { DropZoneUploader } from '@/components/editor/drop-zone-uploader';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const sectionHeaderClass = 'text-xs font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 mb-3';

// ── Callout variant config ───────────────────────────────────────────────────

const VARIANTS: { value: CalloutData['variant']; label: string; activeClass: string }[] = [
  { value: 'info',    label: 'Info',    activeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'warning', label: 'Warning', activeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'tip',     label: 'Tip',     activeClass: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'success', label: 'Success', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

// ── Speech bubble config ─────────────────────────────────────────────────────

const BUBBLE_STYLES: { value: CalloutData['bubble_style']; label: string; dot: string }[] = [
  { value: 'light',  label: 'Light',  dot: 'bg-white border border-gray-300' },
  { value: 'dark',   label: 'Dark',   dot: 'bg-slate-900' },
  { value: 'accent', label: 'Accent', dot: 'bg-indigo-100 border border-indigo-300' },
];

const AVATAR_STYLES: { value: CalloutData['avatar_style']; label: string; shapeClass: string }[] = [
  { value: 'circle',  label: 'Circle',  shapeClass: 'rounded-full' },
  { value: 'square',  label: 'Square',  shapeClass: 'rounded-none' },
  { value: 'rounded', label: 'Rounded', shapeClass: 'rounded-lg' },
];

// ── Shared helpers ───────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  renderOption,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
  renderOption?: (opt: { value: T; label: string }) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
            value === opt.value
              ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          {renderOption ? renderOption(opt) : opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Callout tab ──────────────────────────────────────────────────────────────

function CalloutTab({ data, onChange, blockId }: { data: CalloutData; onChange: (d: CalloutData) => void; blockId: string }) {
  const htmlRichData: RichTextData = { html: data.html ?? '', mode: 'standard' as const };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Variant</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIANTS.map(({ value, label, activeClass }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, variant: value })}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                data.variant === value
                  ? `${activeClass} ring-2 ring-offset-1 ring-[#1E3A5F]`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          value={data.title ?? ''}
          onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          placeholder="Optional callout heading"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Content</label>
        <RichTextEditor
          data={htmlRichData}
          block={{ id: `callout-html-${blockId}` }}
          onChange={(rich) => onChange({ ...data, html: rich.html })}
        />
      </div>
    </div>
  );
}

// ── Speech Bubble tab ────────────────────────────────────────────────────────

function SpeechBubbleTab({ data, onChange, blockId }: { data: CalloutData; onChange: (d: CalloutData) => void; blockId: string }) {
  const bubbleRichData: RichTextData = { html: data.bubble_text ?? '', mode: 'standard' as const };

  return (
    <div className="space-y-5">
      {/* Message */}
      <div>
        <p className={sectionHeaderClass}>Message</p>
        <RichTextEditor
          data={bubbleRichData}
          block={{ id: `callout-bubble-${blockId}` }}
          onChange={(rich) => onChange({ ...data, bubble_text: rich.html })}
        />
      </div>

      {/* Speaker */}
      <div className="space-y-3">
        <p className={sectionHeaderClass}>Speaker</p>

        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={data.author_name ?? ''}
            onChange={(e) => onChange({ ...data, author_name: e.target.value || undefined })}
            placeholder="e.g. Karen Fleming"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Title / Role</label>
          <input
            type="text"
            value={data.author_title ?? ''}
            onChange={(e) => onChange({ ...data, author_title: e.target.value || undefined })}
            placeholder="e.g. Clinical Nurse Specialist"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Avatar image</label>
          <DropZoneUploader
            bucket="block-media"
            pathPrefix="blocks/callout/avatars/"
            accept="image/*"
            label="Drop avatar or click to upload"
            hint="JPG, PNG, WebP — square images work best"
            currentUrl={data.avatar_url}
            onUpload={(url) => onChange({ ...data, avatar_url: url })}
            onRemove={() => onChange({ ...data, avatar_url: undefined })}
            previewMode="image"
          />
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-3">
        <p className={sectionHeaderClass}>Layout</p>

        <div>
          <label className={labelClass}>Avatar position</label>
          <PillGroup
            options={[
              { value: 'left' as const, label: '← Left' },
              { value: 'right' as const, label: 'Right →' },
            ]}
            value={data.direction}
            onChange={(v) => onChange({ ...data, direction: v })}
          />
        </div>

        <div>
          <label className={labelClass}>Avatar shape</label>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_STYLES.map(({ value, label, shapeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...data, avatar_style: value })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                  data.avatar_style === value
                    ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span className={`w-3.5 h-3.5 bg-gray-400 shrink-0 ${shapeClass}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bubble style */}
      <div>
        <p className={sectionHeaderClass}>Bubble Style</p>
        <div className="flex flex-wrap gap-1.5">
          {BUBBLE_STYLES.map(({ value, label, dot }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, bubble_style: value })}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                data.bubble_style === value
                  ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className={`w-3 h-3 rounded-sm shrink-0 ${dot}`} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main editor ──────────────────────────────────────────────────────────────

export function CalloutEditor({ data, onChange, block }: BlockEditorProps<CalloutData>) {
  const mode = data.mode ?? 'callout';

  return (
    <div className="space-y-4">
      {/* Mode tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {([
          { value: 'callout',      label: 'Callout',       icon: <Info className="w-3.5 h-3.5" /> },
          { value: 'speech_bubble', label: 'Speech Bubble', icon: <MessageCircle className="w-3.5 h-3.5" /> },
        ] as const).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange({ ...data, mode: tab.value })}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${
              mode === tab.value
                ? 'bg-[#1A3C6E] text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {mode === 'callout' ? (
        <CalloutTab data={data} onChange={onChange} blockId={block.id} />
      ) : (
        <SpeechBubbleTab data={data} onChange={onChange} blockId={block.id} />
      )}
    </div>
  );
}
