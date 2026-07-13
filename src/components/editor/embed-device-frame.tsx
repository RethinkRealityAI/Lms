'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { withInstitutionPath } from '@/lib/tenant/path';
import { DEVICE_FRAME } from '@/lib/content/device-frames';

interface EmbedDeviceFrameProps {
  courseId: string;
  device: 'tablet' | 'mobile';
  /** Slide to seed the frame with (the in-frame viewer opens here) */
  initialLessonId?: string | null;
  initialSlideId?: string | null;
  /** Reports the in-frame viewer position (for the editor "resume" link) */
  onLocationChange?: (lessonId: string | null, slideId: string | null) => void;
  /** When this changes, the frame navigates (no reload) to that slide */
  navigateSlideId?: string | null;
}

/**
 * Renders the real student CourseViewer inside an <iframe> sized to a device, so
 * the iframe's own width drives the CSS media/container queries — i.e. the preview
 * is byte-for-byte what a physical device of that width shows. The iframe loads the
 * preview route in `?embed=1` mode. Position is round-tripped via postMessage:
 *  - inbound  `preview-navigate` → the editor selection drives the in-frame slide
 *  - outbound `preview-location` → the in-frame slide drives the "Open Editor" link
 */
export function EmbedDeviceFrame({
  courseId,
  device,
  initialLessonId,
  initialSlideId,
  onLocationChange,
  navigateSlideId,
}: EmbedDeviceFrameProps) {
  const pathname = usePathname();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  // src is seeded from the MOUNT-TIME slide only (deps exclude the slide ids) — if
  // it changed with the live slide the iframe would reload on every navigation.
  const src = useMemo(() => {
    const qs = new URLSearchParams({ embed: '1' });
    if (initialLessonId) qs.set('lesson', initialLessonId);
    if (initialSlideId) qs.set('slide', initialSlideId);
    return withInstitutionPath(`/admin/courses/${courseId}/preview?${qs.toString()}`, pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, pathname, device]);

  // Inbound position reports from the in-frame viewer
  useEffect(() => {
    if (!onLocationChange) return;
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'preview-location') {
        onLocationChange!(e.data.lessonId ?? null, e.data.slideId ?? null);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onLocationChange]);

  // Drive the in-frame slide from the editor selection (no reload)
  useEffect(() => {
    if (navigateSlideId === undefined) return;
    const w = iframeRef.current?.contentWindow;
    if (w && readyRef.current) {
      w.postMessage({ type: 'preview-navigate', slideId: navigateSlideId ?? null }, window.location.origin);
    }
  }, [navigateSlideId]);

  const cfg = DEVICE_FRAME[device];
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-100/80 p-4 overflow-auto">
      <div
        className={`bg-white ${cfg.radius} shadow-2xl ring-1 ring-black/10 overflow-hidden ${cfg.bezel} border-slate-900 shrink-0`}
        style={{ aspectRatio: cfg.aspectRatio, maxWidth: cfg.maxWidth, height: '100%' }}
      >
        <iframe
          ref={iframeRef}
          key={device}
          src={src}
          title={`${device} preview`}
          className="w-full h-full border-0 bg-white"
          onLoad={() => { readyRef.current = true; }}
        />
      </div>
    </div>
  );
}
