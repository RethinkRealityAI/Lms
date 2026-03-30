'use client';
import type { BlockViewerProps } from '@/lib/content/block-registry';

export default function PdfViewer({ data, block }: BlockViewerProps<{ url: string }>) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: 600 }} title={block.title} />;
}
