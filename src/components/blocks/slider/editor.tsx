'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { SliderData } from '@/lib/content/blocks/slider/schema';
import { RichTextEditor } from '../rich-text/editor';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const sectionClass = 'space-y-3';
const sectionHeaderClass = 'text-xs font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100';

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? undefined : Number(raw));
      }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 cursor-pointer focus:outline-none',
          checked ? 'bg-[#1A3C6E]' : 'bg-gray-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm',
            'transform transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function SliderEditor({ data, onChange, block }: BlockEditorProps<SliderData>) {
  const minVal = data.min_value ?? 1;
  const maxVal = data.max_value ?? 10;

  const update = (patch: Partial<SliderData>) => onChange({ ...data, ...patch });

  // Adapter: bridge RichTextEditor's data shape to the slider's question field
  const questionRichData: RichTextData = { html: data.question ?? '', mode: 'standard' as const };
  const handleQuestionChange = (richData: RichTextData) => update({ question: richData.html });

  return (
    <div className="space-y-5">
      {/* Question */}
      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Content</p>
        <div>
          <label className={labelClass}>Question</label>
          <RichTextEditor
            data={questionRichData}
            block={{ id: `slider-q-${block.id}` }}
            onChange={handleQuestionChange}
          />
        </div>
      </div>

      {/* Scale */}
      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Scale</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Min value</label>
            <NumberInput
              value={data.min_value}
              onChange={(v) => update({ min_value: v ?? 1 })}
              step={data.increment ?? 1}
            />
          </div>
          <div>
            <label className={labelClass}>Max value</label>
            <NumberInput
              value={data.max_value}
              onChange={(v) => update({ max_value: v ?? 10 })}
              step={data.increment ?? 1}
            />
          </div>
          <div>
            <label className={labelClass}>Increment</label>
            <NumberInput
              value={data.increment}
              onChange={(v) => update({ increment: v ?? 1 })}
              min={0.001}
              step={0.5}
              placeholder="1"
            />
          </div>
          <div>
            <label className={labelClass}>Decimals</label>
            <NumberInput
              value={data.decimals}
              onChange={(v) => update({ decimals: Math.min(4, Math.max(0, Math.round(v ?? 0))) })}
              min={0}
              max={4}
              step={1}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Prefix</label>
            <input
              type="text"
              value={data.prefix ?? ''}
              onChange={(e) => update({ prefix: e.target.value || undefined })}
              placeholder="e.g. $"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Suffix</label>
            <input
              type="text"
              value={data.suffix ?? ''}
              onChange={(e) => update({ suffix: e.target.value || undefined })}
              placeholder="e.g. %"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Default value</label>
          <NumberInput
            value={data.default_value}
            onChange={(v) => update({ default_value: v })}
            min={minVal}
            max={maxVal}
            step={data.increment ?? 1}
            placeholder={`${minVal + Math.round((maxVal - minVal) / 2)} (midpoint)`}
          />
          <p className="mt-1 text-xs text-gray-400">Leave blank to start at midpoint.</p>
        </div>
      </div>

      {/* Labels */}
      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Labels</p>
        <div>
          <label className={labelClass}>Minimum label</label>
          <input
            type="text"
            value={data.min_label ?? ''}
            onChange={(e) => update({ min_label: e.target.value || undefined })}
            placeholder="e.g. None / Minimal knowledge"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Maximum label</label>
          <input
            type="text"
            value={data.max_label ?? ''}
            onChange={(e) => update({ max_label: e.target.value || undefined })}
            placeholder="e.g. In-depth knowledge"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Prompt text</label>
          <input
            type="text"
            value={data.prompt ?? ''}
            onChange={(e) => update({ prompt: e.target.value || undefined })}
            placeholder="e.g. Drag to select a response"
            className={inputClass}
          />
        </div>
      </div>

      {/* Settings */}
      <div className={sectionClass}>
        <p className={sectionHeaderClass}>Settings</p>
        <Toggle
          checked={data.show_ticks !== false}
          onChange={(v) => update({ show_ticks: v })}
          label="Show tick marks"
        />
        <Toggle
          checked={data.required === true}
          onChange={(v) => update({ required: v })}
          label="Required"
        />
      </div>
    </div>
  );
}
