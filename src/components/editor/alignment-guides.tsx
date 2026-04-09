'use client';

interface AlignmentGuidesProps {
  guides: Array<{ type: 'vertical' | 'horizontal'; position: number }>;
}

export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {guides.map((guide, i) => (
        guide.type === 'vertical' ? (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l border-dashed border-blue-400"
            style={{ left: `${(guide.position / 12) * 100}%` }}
          />
        ) : (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t border-dashed border-blue-400"
            style={{ top: `${guide.position}px` }}
          />
        )
      ))}
    </div>
  );
}

/** Compute alignment guides for a dragging block against other blocks */
export function computeAlignmentGuides(
  draggingId: string,
  currentLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>,
): Array<{ type: 'vertical' | 'horizontal'; position: number }> {
  const dragging = currentLayout.find(l => l.i === draggingId);
  if (!dragging) return [];

  const guides: Array<{ type: 'vertical' | 'horizontal'; position: number }> = [];
  const others = currentLayout.filter(l => l.i !== draggingId);

  for (const other of others) {
    // Vertical guides (column alignment)
    if (dragging.x === other.x) guides.push({ type: 'vertical', position: dragging.x });
    if (dragging.x + dragging.w === other.x + other.w) guides.push({ type: 'vertical', position: dragging.x + dragging.w });
    if (dragging.x === other.x + other.w) guides.push({ type: 'vertical', position: dragging.x });
    if (dragging.x + dragging.w === other.x) guides.push({ type: 'vertical', position: dragging.x + dragging.w });
  }

  // Deduplicate
  const seen = new Set<string>();
  return guides.filter(g => {
    const key = `${g.type}-${g.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
