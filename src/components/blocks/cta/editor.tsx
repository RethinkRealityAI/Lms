'use client';

import type { BlockEditorProps } from '@/lib/content/block-registry';
import type {
  CtaAlign,
  CtaButtonStyle,
  CtaData,
  CtaFontSize,
  CtaRadius,
} from '@/lib/content/blocks/cta/schema';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const sectionHeaderClass =
  'text-xs font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100';

const BUTTON_STYLES: { value: CtaButtonStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'outline', label: 'Outline' },
  { value: 'soft', label: 'Soft' },
];
const FONT_SIZES: { value: CtaFontSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];
const ALIGNMENTS: { value: CtaAlign; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
const RADII: { value: CtaRadius; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'full', label: 'Pill' },
];

function StyleChip<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 min-w-[3rem] px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
            value === opt.value
              ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus:outline-none ${
          checked ? 'bg-[#1A3C6E]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value?: string;
  fallback: string;
  onChange: (v: string | undefined) => void;
}) {
  const pickerValue = value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer bg-white"
          aria-label={`${label} picker`}
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          disabled={!value}
          className="text-[10px] font-medium text-gray-500 hover:text-[#1A3C6E] disabled:opacity-40 disabled:cursor-not-allowed px-1"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function CTAEditor({ data, onChange }: BlockEditorProps<CtaData>) {
  const update = (patch: Partial<CtaData>) => onChange({ ...data, ...patch });
  const style = data.button_style ?? 'solid';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className={sectionHeaderClass}>Content</p>
        <div>
          <label className={labelClass}>Description text</label>
          <textarea
            value={data.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Optional text displayed above the button"
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
        <div>
          <label className={labelClass}>Button label</label>
          <input
            type="text"
            value={data.button_label || ''}
            onChange={(e) => update({ button_label: e.target.value })}
            placeholder="Click Here"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>URL</label>
          <input
            type="url"
            value={data.url ?? ''}
            onChange={(e) => update({ url: e.target.value || undefined })}
            placeholder="https://example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderClass}>Appearance</p>

        <div>
          <label className={labelClass}>Button style</label>
          <StyleChip
            options={BUTTON_STYLES}
            value={style}
            onChange={(button_style) => update({ button_style })}
          />
        </div>

        <div>
          <label className={labelClass}>Font size</label>
          <StyleChip
            options={FONT_SIZES}
            value={data.font_size ?? 'md'}
            onChange={(font_size) => update({ font_size })}
          />
        </div>

        <div>
          <label className={labelClass}>Corners</label>
          <StyleChip
            options={RADII}
            value={data.radius ?? 'lg'}
            onChange={(radius) => update({ radius })}
          />
        </div>

        <div>
          <label className={labelClass}>Alignment</label>
          <StyleChip
            options={ALIGNMENTS}
            value={data.align ?? 'center'}
            onChange={(align) => update({ align })}
          />
        </div>

        <Toggle
          label="Full-width button"
          checked={data.full_width ?? false}
          onChange={(full_width) => update({ full_width })}
        />
        <Toggle
          label="Show link icon"
          checked={data.show_icon !== false}
          onChange={(show_icon) => update({ show_icon })}
        />
      </div>

      <div className="space-y-2.5">
        <p className={sectionHeaderClass}>Colors</p>
        <ColorRow
          label={style === 'solid' ? 'Button color' : 'Accent color'}
          value={data.button_color}
          fallback="#1E3A5F"
          onChange={(button_color) => update({ button_color })}
        />
        <ColorRow
          label="Label color"
          value={data.text_color}
          fallback={style === 'solid' ? '#ffffff' : '#1E3A5F'}
          onChange={(text_color) => update({ text_color })}
        />
        <ColorRow
          label="Description color"
          value={data.description_color}
          fallback="#374151"
          onChange={(description_color) => update({ description_color })}
        />
        <p className="text-[10px] text-gray-400">Leave a color unset to inherit from the slide theme.</p>
      </div>
    </div>
  );
}
