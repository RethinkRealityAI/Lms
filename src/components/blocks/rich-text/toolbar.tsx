'use client';

import { useState } from 'react';
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
  Moon,
  Sun,
  Link2,
  Check,
  Unlink,
} from 'lucide-react';

type Editor = NonNullable<ReturnType<typeof useEditor>>;

/** Link button + URL popover. Apply to a selection, edit an existing link, or remove. */
function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const active = editor.isActive('link');

  function openPopover() {
    setUrl((editor.getAttributes('link')?.href as string | undefined) ?? '');
    setOpen(true);
  }
  function apply() {
    const href = url.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const withProto = /^(https?:|mailto:|tel:)/i.test(href) ? href : `https://${href}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: withProto }).run();
    }
    setOpen(false);
  }
  function remove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        className={`p-1.5 rounded transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
        title="Insert / edit link"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-9 left-0 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-2">
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } if (e.key === 'Escape') setOpen(false); }}
                placeholder="https://example.com"
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
              <button type="button" onClick={apply} title="Apply link"
                className="p-1.5 rounded-md bg-[#1E3A5F] text-white hover:bg-[#0F172A] transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              {active && (
                <button type="button" onClick={remove} title="Remove link"
                  className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 px-0.5">Select text first, or pasting a URL auto-links it.</p>
          </div>
        </>
      )}
    </div>
  );
}

interface RichTextToolbarProps {
  editor: Editor | null;
  previewDark?: boolean;
  onTogglePreviewDark?: () => void;
  onSetPreviewDark?: (dark: boolean) => void;
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

export function RichTextToolbar({ editor, previewDark, onTogglePreviewDark, onSetPreviewDark }: RichTextToolbarProps) {
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

  // Detect current text color — normalize to uppercase so '#ffffff' === '#FFFFFF'
  const currentColor = (() => {
    const attrs = editor.getAttributes('textStyle');
    return ((attrs?.color as string | undefined) ?? '#000000').toUpperCase();
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
          // Setting fontSize: null removes the attribute from the mark; fontSize: value renders it.
          editor.chain().focus().setMark('textStyle', { fontSize: size || null }).run();
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
        {COLOR_PALETTE.map((color) => {
          const isSelected = currentColor === color.toUpperCase();
          const isWhite = color === '#FFFFFF';
          return (
            <button
              key={color}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                // Auto-switch editor bg: dark for white text, light for everything else
                if (isWhite) {
                  onSetPreviewDark?.(true);
                } else {
                  onSetPreviewDark?.(false);
                }
              }}
              className={[
                'w-4 h-4 rounded-sm transition-transform hover:scale-110',
                isSelected
                  ? 'ring-2 ring-offset-1 ring-blue-500 scale-110'
                  : isWhite ? 'border border-slate-300' : 'border border-transparent',
              ].join(' ')}
              style={{ backgroundColor: color }}
              title={color}
            />
          );
        })}
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

      {/* Link */}
      <LinkControl editor={editor} />

      {divider}

      {/* Line height */}
      <select
        onChange={(e) => {
          const lh = e.target.value;
          editor.chain().focus().setMark('textStyle', { lineHeight: lh || null }).run();
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

      {onTogglePreviewDark && (
        <>
          {divider}
          <button
            type="button"
            onClick={onTogglePreviewDark}
            className={`${btn(!!previewDark)} flex items-center gap-1 px-2 text-xs`}
            title={previewDark ? 'Switch to light background' : 'Switch to dark background (for white text)'}
          >
            {previewDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </>
      )}
    </div>
  );
}
