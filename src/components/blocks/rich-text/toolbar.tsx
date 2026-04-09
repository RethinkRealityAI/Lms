'use client';

import { useEditor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';

type Editor = NonNullable<ReturnType<typeof useEditor>>;

interface RichTextToolbarProps {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  { label: 'Sans', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, ui-serif, serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];

const FONT_SIZES = [
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '16px' },
  { label: 'Large', value: '20px' },
  { label: 'XL', value: '24px' },
];

const COLOR_PALETTE = [
  '#000000',
  '#1E3A5F',
  '#DC2626',
  '#0099CA',
  '#16A34A',
  '#9333EA',
  '#EA580C',
  '#6B7280',
  '#FFFFFF',
];

const LINE_HEIGHTS = [
  { label: 'Compact', value: '1.2' },
  { label: 'Normal', value: '1.5' },
  { label: 'Relaxed', value: '2.0' },
];

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active
        ? 'bg-slate-200 text-slate-900'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const divider = <div className="w-px h-5 bg-slate-200 mx-1 self-center shrink-0" />;

  // Detect current font family
  const currentFontFamily = FONT_FAMILIES.find((f) =>
    editor.isActive('textStyle', { fontFamily: f.value })
  )?.value ?? '';

  // Detect current font size — read from stored marks
  const currentFontSize = (() => {
    const attrs = editor.getAttributes('textStyle');
    return (attrs?.fontSize as string | undefined) ?? '';
  })();

  // Detect current text color
  const currentColor = (() => {
    const attrs = editor.getAttributes('textStyle');
    return (attrs?.color as string | undefined) ?? '#000000';
  })();

  return (
    <div className="flex items-center gap-0.5 p-2 border-b bg-slate-50 flex-wrap">
      {/* Font family */}
      <select
        value={currentFontFamily}
        onChange={(e) => {
          const val = e.target.value;
          if (val) {
            editor.chain().focus().setFontFamily(val).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="text-xs rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
        title="Font family"
      >
        <option value="">Font</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size */}
      <select
        value={currentFontSize}
        onChange={(e) => {
          const size = e.target.value;
          if (size) {
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
          }
        }}
        className="text-xs rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300 ml-1"
        title="Font size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {divider}

      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${btn(editor.isActive('heading', { level: 1 }))} text-xs font-bold px-2`}
        title="Heading 1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn(editor.isActive('heading', { level: 2 }))} text-xs font-bold px-2`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${btn(editor.isActive('heading', { level: 3 }))} text-xs font-bold px-2`}
        title="Heading 3"
      >
        H3
      </button>

      {divider}

      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive('bold'))}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive('italic'))}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive('underline'))}
        title="Underline"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      {divider}

      {/* Text color */}
      <div className="flex items-center gap-0.5" title="Text color">
        {COLOR_PALETTE.map((color) => (
          <button
            key={color}
            onClick={() => editor.chain().focus().setColor(color).run()}
            className={`w-4 h-4 rounded-sm border transition-transform hover:scale-110 ${
              currentColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : 'border-slate-300'
            } ${color === '#FFFFFF' ? 'border-slate-300' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {divider}

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btn(editor.isActive({ textAlign: 'left' }))}
        title="Align left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btn(editor.isActive({ textAlign: 'center' }))}
        title="Align center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btn(editor.isActive({ textAlign: 'right' }))}
        title="Align right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>

      {divider}

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive('bulletList'))}
        title="Bullet list"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive('orderedList'))}
        title="Numbered list"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      {divider}

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive('blockquote'))}
        title="Blockquote"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>

      {divider}

      {/* Line height */}
      <select
        onChange={(e) => {
          const lh = e.target.value;
          if (lh) {
            editor.chain().focus().setMark('textStyle', { lineHeight: lh }).run();
          }
        }}
        defaultValue=""
        className="text-xs rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
        title="Line height"
      >
        <option value="">Line height</option>
        {LINE_HEIGHTS.map((lh) => (
          <option key={lh.label} value={lh.value}>
            {lh.label}
          </option>
        ))}
      </select>
    </div>
  );
}
