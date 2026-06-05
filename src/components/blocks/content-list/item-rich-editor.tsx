'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link2, Check, Unlink } from 'lucide-react';

type Editor = NonNullable<ReturnType<typeof useEditor>>;

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
        className={`p-1 rounded transition-colors ${
          active ? 'bg-[#1A3C6E]/15 text-[#1A3A5F]' : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Insert or edit link"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-8 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-2">
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    apply();
                  }
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="https://example.com"
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A3A5F]"
              />
              <button
                type="button"
                onClick={apply}
                title="Apply link"
                className="p-1.5 rounded-md bg-[#1A3C6E] text-white hover:bg-[#0F172A]"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              {active && (
                <button
                  type="button"
                  onClick={remove}
                  title="Remove link"
                  className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-500"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface ItemRichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function ItemRichEditor({
  content,
  onChange,
  placeholder = 'Enter list item text…',
}: ItemRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  // Sync EXTERNAL content changes into the editor. Tiptap only reads `content` at
  // init, so without this, reordering or removing items (the list is keyed by
  // position) leaves each editor pinned to its slot showing stale text while the
  // underlying data — and the slide canvas — reorders correctly. We only call
  // setContent when the incoming prop genuinely differs from what the editor holds,
  // so typing (where prop === getHTML()) never resets the cursor, and emitUpdate is
  // false to avoid a feedback loop back through onUpdate → onChange.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 bg-gray-50/80">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-[#1A3C6E]/15 text-[#1A3A5F]' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-[#1A3C6E]/15 text-[#1A3A5F]' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <LinkControl editor={editor} />
      </div>
      <EditorContent
        editor={editor}
        className="tiptap prose prose-sm max-w-none px-3 py-2 min-h-[4.5rem] text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-0"
      />
    </div>
  );
}
