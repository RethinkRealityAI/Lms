'use client';
import { H5PPlayer } from '@/components/h5p/h5p-player';
export default function H5PViewer({ data, block }: { data: { contentKey: string }; block: { title?: string } }) {
  return <H5PPlayer title={block.title ?? ''} contentKey={String(data.contentKey)} metadata={data} />;
}
