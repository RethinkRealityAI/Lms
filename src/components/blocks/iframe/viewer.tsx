'use client';
import type { BlockViewerProps } from '@/lib/content/block-registry';

export default function IframeViewer({ data, block }: BlockViewerProps<{ url: string; height?: number }>) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: data.height ?? 600 }} title={block.title} />;
}
