'use client';
import type { BlockViewerProps } from '@/lib/content/block-registry';
import { H5PPlayer } from '@/components/h5p/h5p-player';

export default function H5PViewer({ data, block }: BlockViewerProps<{ contentKey: string; [key: string]: unknown }>) {
  return <H5PPlayer title={block.title ?? ''} contentKey={String(data.contentKey)} metadata={data} />;
}
