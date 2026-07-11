'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle as BaseTextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import type { BlockEditorProps } from '@/lib/content/block-registry';
import type { RichTextData } from '@/lib/content/blocks/rich-text/schema';
import { RichTextToolbar } from './toolbar';

// Extend TextStyle to support fontSize and lineHeight rendering.
// Without this, setMark('textStyle', { fontSize }) stores the attribute but
// never outputs a CSS style, so the size dropdown appeared broken.
const TextStyle = BaseTextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
      },
      lineHeight: {
        default: null,
        parseHTML: (el) => el.style.lineHeight || null,
        renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
      },
    };
  },
});

export function RichTextEditor({ data, onChange }: BlockEditorProps<RichTextData>) {
  const [previewDark, setPreviewDark] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Disable StarterKit's bundled Link AND Underline — we register our own
      // configured versions below. Tiptap v3's StarterKit includes both, so leaving
      // them on duplicated the 'underline' extension ("Duplicate extension names"
      // console warning).
      StarterKit.configure({ link: false, underline: false }),
      Image,
      Link.configure({
        openOnClick: false,
        autolink: true,        // turns typed/pasted URLs into links automatically
        linkOnPaste: true,     // pasting a URL over a selection links the selection
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      Placeholder.configure({ placeholder: 'Start typing your content...' }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: data.html,
    onUpdate: ({ editor }) => {
      onChange({ ...data, html: editor.getHTML() });
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <RichTextToolbar
        editor={editor}
        previewDark={previewDark}
        onTogglePreviewDark={() => setPreviewDark((v) => !v)}
        onSetPreviewDark={setPreviewDark}
      />
      <EditorContent
        editor={editor}
        className={[
          'prose prose-sm max-w-none p-3 min-h-[180px]',
          'focus-within:outline-none [&_.tiptap]:focus:outline-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
          previewDark
            ? '[&_.tiptap_p.is-editor-empty:first-child::before]:text-slate-500 bg-slate-900 text-white prose-invert'
            : '[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400',
        ].join(' ')}
      />
    </div>
  );
}
