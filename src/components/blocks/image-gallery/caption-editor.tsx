'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link2, Link2Off } from 'lucide-react';

/** Compact rich-text editor for image captions — bold, italic, and links. */
export function CaptionEditor({
  value,
  onChange,
  placeholder = 'Caption (optional) — supports bold, italic & links',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, heading: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Treat an empty paragraph as no caption.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync EXTERNAL value changes into the editor. Tiptap only reads `content` at
  // init, so reordering/removing gallery images (the caption fields are keyed by
  // position) would otherwise leave each caption editor showing stale text. Only
  // setContent when it genuinely differs (typing keeps them equal → no cursor
  // reset); emitUpdate:false avoids looping back through onChange.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const incoming = value || '<p></p>';
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-[#1E3A5F] text-white' : 'text-gray-500 hover:bg-gray-100'}`;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-gray-100 bg-gray-50/60">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={setLink} className={btn(editor.isActive('link'))} title="Add link">
          <Link2 className="w-3.5 h-3.5" />
        </button>
        {editor.isActive('link') && (
          <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={btn(false)} title="Remove link">
            <Link2Off className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <EditorContent
        editor={editor}
        className={[
          'px-3 py-3 text-sm min-h-[6.5rem]',
          'focus-within:outline-none [&_.tiptap]:focus:outline-none',
          '[&_.tiptap]:min-h-[5rem] [&_.tiptap]:leading-relaxed',
          '[&_a]:text-[#1E3A5F] [&_a]:underline',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:float-left',
          '[&_.tiptap_p.is-editor-empty:first-child::before]:h-0',
        ].join(' ')}
      />
    </div>
  );
}
