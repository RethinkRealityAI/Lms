'use client';

import { Layout, Layers } from 'lucide-react';
import { useEditorStore } from './editor-store-context';
import type { Slide } from '@/types';

interface SlideThumbnailProps {
  slide: Slide;
}

export function SlideThumbnail({ slide }: SlideThumbnailProps) {
  const blocks = useEditorStore((s) => s.blocks.get(slide.id) ?? []);
  const settings = (slide.settings ?? {}) as Record<string, unknown>;
  const bg = (settings.background as string) || '#FFFFFF';
  const bgStyle = bg === 'gradient'
    ? { background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)' }
    : bg.startsWith('#')
      ? { backgroundColor: bg }
      : { backgroundColor: '#FFFFFF' };

  if (slide.slide_type === 'title') {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden" style={bgStyle}>
        <span className="text-[6px] font-bold text-white truncate px-0.5">Title</span>
      </div>
    );
  }

  if (slide.slide_type === 'canvas') {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
        <Layers className="w-3 h-3 text-gray-400" />
      </div>
    );
  }

  const firstBlock = blocks[0];
  if (!firstBlock) {
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
        <Layout className="w-3 h-3 text-gray-300" />
      </div>
    );
  }

  if (firstBlock.block_type === 'rich_text' || firstBlock.block_type === 'callout') {
    const html = (firstBlock.data as Record<string, unknown>)?.html as string ?? '';
    const text = html.replace(/<[^>]*>/g, '').trim().slice(0, 20);
    return (
      <div className="w-12 h-8 rounded border border-gray-200 flex items-center p-0.5 overflow-hidden shrink-0" style={bgStyle}>
        <span className="text-[5px] leading-tight text-gray-600 line-clamp-3">{text || '...'}</span>
      </div>
    );
  }

  if (firstBlock.block_type === 'image_gallery') {
    const images = (firstBlock.data as Record<string, unknown>)?.images as Array<{ url?: string }> ?? [];
    const url = images[0]?.url;
    if (url) {
      return (
        <div className="w-12 h-8 rounded border border-gray-200 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
        </div>
      );
    }
  }

  return (
    <div className="w-12 h-8 rounded border border-gray-200 flex items-center justify-center bg-gray-50 shrink-0" style={bgStyle}>
      <Layout className="w-3 h-3 text-gray-400" />
    </div>
  );
}
