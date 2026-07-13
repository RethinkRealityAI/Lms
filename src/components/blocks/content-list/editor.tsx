'use client';

import { ChevronUp, ChevronDown, Plus, Trash2, GripVertical, List, PanelTopOpen } from 'lucide-react';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type {
  AccordionDefaultOpen,
  AccordionIcon,
  AccordionIconPosition,
  ContentListBulletStyle,
  ContentListData,
  ContentListDisplayMode,
  ContentListFontSize,
  ContentListItem,
  ContentListItemAnimation,
} from '@/lib/content/blocks/content-list/schema';
import { ItemRichEditor } from './item-rich-editor';
import { MediaFieldEditor } from '@/components/blocks/shared/media-field-editor';

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent';

const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
const sectionHeaderClass =
  'text-xs font-semibold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100';

const BULLET_STYLES: { value: ContentListBulletStyle; label: string }[] = [
  { value: 'disc', label: 'Disc' },
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'dash', label: 'Dash' },
  { value: 'decimal', label: 'Numbered' },
  { value: 'none', label: 'None' },
];

const FONT_SIZES: { value: ContentListFontSize; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const ITEM_ANIMATIONS: { value: ContentListItemAnimation; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'From left' },
  { value: 'right', label: 'From right' },
  { value: 'up', label: 'From below' },
  { value: 'down', label: 'From above' },
];

const ACCORDION_ICONS: { value: AccordionIcon; label: string }[] = [
  { value: 'caret', label: 'Caret' },
  { value: 'plus', label: 'Plus / minus' },
];

const ICON_POSITIONS: { value: AccordionIconPosition; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
];

const DEFAULT_OPEN: { value: AccordionDefaultOpen; label: string }[] = [
  { value: 'none', label: 'All closed' },
  { value: 'first', label: 'First open' },
  { value: 'all', label: 'All open' },
];

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

function OptionalColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const pickerValue = value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#64748b';

  return (
    <div className="space-y-1">
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
      {!value && <p className="text-[10px] text-gray-400">Inheriting from slide</p>}
    </div>
  );
}

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
          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all font-medium ${
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

function ItemEditor({
  item,
  index,
  total,
  animationsEnabled,
  uniformAnimation,
  isAccordion,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: ContentListItem;
  index: number;
  total: number;
  animationsEnabled: boolean;
  uniformAnimation: boolean;
  isAccordion: boolean;
  onChange: (item: ContentListItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <GripVertical className="h-4 w-4" />
          {isAccordion ? 'Panel' : 'Item'} {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
            aria-label="Move item up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index >= total - 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
            aria-label="Move item down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-100 text-red-600 ml-1"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isAccordion ? (
        <div>
          <label className={labelClass}>Title (header)</label>
          <input
            type="text"
            value={item.title ?? ''}
            onChange={(e) => onChange({ ...item, title: e.target.value })}
            placeholder="e.g. What is sickle cell disease?"
            className={inputClass}
          />
        </div>
      ) : null}

      <div>
        <label className={labelClass}>{isAccordion ? 'Content (shown when expanded)' : 'Text'}</label>
        <ItemRichEditor
          key={`item-editor-${index}`}
          content={item.html || '<p></p>'}
          onChange={(html) => onChange({ ...item, html })}
          placeholder={isAccordion ? 'Enter the panel content… paste or type links' : 'Enter list item text… paste or type links'}
        />
      </div>

      {animationsEnabled && !uniformAnimation ? (
        <div>
          <label className={labelClass}>Entrance animation</label>
          <select
            value={item.animation ?? 'left'}
            onChange={(e) =>
              onChange({
                ...item,
                animation: e.target.value as ContentListItemAnimation,
              })
            }
            className={inputClass}
          >
            {ITEM_ANIMATIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function ContentListEditor({ data, onChange, block }: BlockEditorProps<ContentListData>) {
  const items = data.items ?? [];
  const enableAnimations = data.enable_animations ?? true;
  const uniformAnimation = data.animation_uniform ?? false;
  const displayMode: ContentListDisplayMode = data.display_mode ?? 'list';
  const isAccordion = displayMode === 'accordion';

  const update = (patch: Partial<ContentListData>) => onChange({ ...data, ...patch });

  const setItem = (index: number, item: ContentListItem) => {
    const next = items.map((it, i) => (i === index ? item : it));
    update({ items: next });
  };

  const addItem = () =>
    update({
      items: [
        ...items,
        isAccordion
          ? { title: '', html: '<p></p>', animation: 'up' }
          : { html: '<p></p>', animation: 'left' },
      ],
    });

  const removeItem = (index: number) => update({ items: items.filter((_, i) => i !== index) });

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    update({ items: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className={sectionHeaderClass}>Optional heading</p>
        <input
          type="text"
          value={data.heading ?? ''}
          onChange={(e) => update({ heading: e.target.value || undefined })}
          placeholder="Leave blank if the slide title is enough"
          className={inputClass}
        />
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderClass}>Image / video (optional)</p>
        <MediaFieldEditor
          media={data.media}
          onChange={(media) => update({ media })}
          pathPrefix={`blocks/content-list/${block.id}/`}
          position={data.media_position ?? 'left'}
          onPositionChange={(media_position) => update({ media_position })}
          label="List media"
        />
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderClass}>Display</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ display_mode: 'list' })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm rounded-lg border font-medium transition-all ${
              !isAccordion
                ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            type="button"
            onClick={() => update({ display_mode: 'accordion' })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm rounded-lg border font-medium transition-all ${
              isAccordion
                ? 'bg-[#1A3C6E] text-white border-[#1A3C6E]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <PanelTopOpen className="w-4 h-4" /> Accordion
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          {isAccordion
            ? 'Each panel has a clickable title that expands to reveal its content.'
            : 'A classic bulleted or numbered list.'}
        </p>
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderClass}>Style</p>

        {!isAccordion ? (
          <div>
            <label className={labelClass}>Bullet style</label>
            <StyleChip
              options={BULLET_STYLES}
              value={data.bullet_style ?? 'disc'}
              onChange={(bullet_style) => update({ bullet_style })}
            />
          </div>
        ) : null}

        {isAccordion ? (
          <>
            <div>
              <label className={labelClass}>Toggle icon</label>
              <StyleChip
                options={ACCORDION_ICONS}
                value={data.accordion_icon ?? 'caret'}
                onChange={(accordion_icon) => update({ accordion_icon })}
              />
            </div>
            <div>
              <label className={labelClass}>Icon position</label>
              <StyleChip
                options={ICON_POSITIONS}
                value={data.accordion_icon_position ?? 'right'}
                onChange={(accordion_icon_position) => update({ accordion_icon_position })}
              />
            </div>
            <div>
              <label className={labelClass}>Open on load</label>
              <StyleChip
                options={DEFAULT_OPEN}
                value={data.accordion_default_open ?? 'none'}
                onChange={(accordion_default_open) => update({ accordion_default_open })}
              />
            </div>
            <Toggle
              label="Allow multiple panels open"
              checked={data.accordion_multiple ?? false}
              onChange={(accordion_multiple) => update({ accordion_multiple })}
            />
            <OptionalColorRow
              label="Accent color"
              value={data.accordion_accent_color}
              onChange={(accordion_accent_color) => update({ accordion_accent_color })}
            />
          </>
        ) : null}

        <div>
          <label className={labelClass}>Font size</label>
          <StyleChip
            options={FONT_SIZES}
            value={data.font_size ?? 'auto'}
            onChange={(font_size) => update({ font_size })}
          />
          <p className="text-[10px] text-gray-400 mt-1.5">
            Auto matches slide body text (L on phone, XL on tablet/desktop). S–XL are fixed sizes.
          </p>
        </div>

        {!isAccordion ? (
          <OptionalColorRow
            label="Bullet color"
            value={data.bullet_color}
            onChange={(bullet_color) => update({ bullet_color })}
          />
        ) : null}
        <OptionalColorRow
          label="Text color"
          value={data.text_color}
          onChange={(text_color) => update({ text_color })}
        />
      </div>

      <div className="space-y-3">
        <p className={sectionHeaderClass}>Animation</p>
        <Toggle
          label="Animate items on reveal"
          checked={enableAnimations}
          onChange={(enable_animations) => update({ enable_animations })}
        />
        {enableAnimations ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Duration (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={data.animation_duration_ms ?? 500}
                  onChange={(e) =>
                    update({
                      animation_duration_ms: e.target.value === '' ? 500 : Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Stagger delay (ms)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={data.animation_stagger_ms ?? 120}
                  onChange={(e) =>
                    update({
                      animation_stagger_ms: e.target.value === '' ? 120 : Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-gray-700">Same direction for all items</span>
              <input
                type="checkbox"
                checked={uniformAnimation}
                onChange={(e) =>
                  update({
                    animation_uniform: e.target.checked,
                    // Seed a direction the first time it's turned on so the dropdown isn't empty.
                    ...(e.target.checked && !data.animation_direction
                      ? { animation_direction: 'left' as ContentListItemAnimation }
                      : {}),
                  })
                }
                className="accent-[#1A3C6E] w-4 h-4"
              />
            </label>

            {uniformAnimation ? (
              <div>
                <label className={labelClass}>Direction (applies to all items)</label>
                <select
                  value={data.animation_direction ?? 'left'}
                  onChange={(e) =>
                    update({ animation_direction: e.target.value as ContentListItemAnimation })
                  }
                  className={inputClass}
                >
                  {ITEM_ANIMATIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <p className={sectionHeaderClass}>{isAccordion ? `Panels (${items.length})` : `Items (${items.length})`}</p>
        {items.map((item, index) => (
          <ItemEditor
            key={index}
            item={item}
            index={index}
            total={items.length}
            animationsEnabled={enableAnimations}
            uniformAnimation={uniformAnimation}
            isAccordion={isAccordion}
            onChange={(next) => setItem(index, next)}
            onRemove={() => removeItem(index)}
            onMoveUp={() => moveItem(index, -1)}
            onMoveDown={() => moveItem(index, 1)}
          />
        ))}
        <button
          type="button"
          onClick={addItem}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-[#1A3C6E] border-2 border-dashed border-gray-200 rounded-xl hover:border-[#1A3C6E] hover:bg-[#1A3C6E]/5 transition-all"
        >
          <Plus className="w-4 h-4" /> {isAccordion ? 'Add panel' : 'Add item'}
        </button>
      </div>
    </div>
  );
}
