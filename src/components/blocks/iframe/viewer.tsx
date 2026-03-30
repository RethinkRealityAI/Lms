'use client';
export default function IframeViewer({ data, block }: { data: { url: string; height?: number }; block: { title?: string } }) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: data.height ?? 600 }} title={block.title} />;
}
