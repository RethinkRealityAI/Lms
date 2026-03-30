'use client';
export default function PdfViewer({ data, block }: { data: { url: string }; block: { title?: string } }) {
  return <iframe src={data.url} className="w-full rounded-lg" style={{ height: 600 }} title={block.title} />;
}
