'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { RichTextToolbar } from './toolbar';

interface InlineRichTextEditorProps {
  html: string;
  onChange: (html: string) => void;
  onBlur: () => void;
}

export function InlineRichTextEditor({ html, onChange, onBlur }: InlineRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      FontFamily,
    ],
    content: html,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: 'end',
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBlur();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBlur]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-white"
      onClick={e => e.stopPropagation()}
    >
      <div className="shrink-0 shadow-md">
        <RichTextToolbar editor={editor} />
      </div>
      <EditorContent
        editor={editor}
        className="flex-1 overflow-auto prose prose-xl max-w-none p-4 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full"
      />
    </div>
  );
}
