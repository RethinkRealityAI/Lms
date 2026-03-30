'use client';
export default function VideoViewer({ data }: { data: { url: string; poster?: string; caption?: string } }) {
  return (
    <div className="space-y-2">
      <video src={data.url} poster={data.poster} controls className="w-full rounded-lg" style={{ maxHeight: 500 }}>
        Your browser does not support the video tag.
      </video>
      {data.caption && <p className="text-sm text-muted-foreground">{data.caption}</p>}
    </div>
  );
}
