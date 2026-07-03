'use client';

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, Pencil, Monitor, Tablet, Smartphone } from 'lucide-react';
import { withInstitutionPath } from '@/lib/tenant/path';
import CourseViewer from '@/components/student/course-viewer';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<Exclude<Device, 'desktop'>, { w: number; label: string }> = {
  tablet: { w: 834, label: 'Tablet' },
  mobile: { w: 390, label: 'Mobile' },
};

// ── Embedded mode: just the viewer, sized to the iframe (a real device width) ──
function EmbedView({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  const initialLessonId = searchParams.get('lesson');
  const initialSlideId = searchParams.get('slide');

  // Report position to the parent window so the device-frame parent can keep the
  // "Open Editor" resume link in sync as the user navigates inside the iframe.
  const report = useCallback((lessonId: string | null, slideId: string | null) => {
    try {
      window.parent?.postMessage({ type: 'preview-location', lessonId, slideId }, window.location.origin);
    } catch { /* cross-origin guard */ }
  }, []);

  return (
    // z-[60] covers the admin layout nav (z-50) inside the iframe document
    <div className="fixed inset-0 z-[60] bg-white">
      <CourseViewer
        courseId={courseId}
        previewMode
        embedded
        initialLessonId={initialLessonId}
        initialSlideId={initialSlideId}
        onLocationChange={report}
      />
    </div>
  );
}

// ── Full preview chrome: banner + device toggle + content ──────────────────────
function PreviewChrome({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLessonId = searchParams.get('lesson');
  const initialSlideId = searchParams.get('slide');

  const [device, setDevice] = useState<Device>('desktop');
  const [loc, setLoc] = useState<{ lessonId: string | null; slideId: string | null }>({
    lessonId: initialLessonId,
    slideId: initialSlideId,
  });

  // Stable callback + equality guard — avoids a setState/effect feedback loop
  const handleLocationChange = useCallback((lessonId: string | null, slideId: string | null) => {
    setLoc(prev => (prev.lessonId === lessonId && prev.slideId === slideId ? prev : { lessonId, slideId }));
  }, []);

  // Receive position updates from the device-frame iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'preview-location') {
        handleLocationChange(e.data.lessonId ?? null, e.data.slideId ?? null);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [handleLocationChange]);

  // Editor link tracks the LIVE position (updated via onLocationChange / postMessage)
  const editorQuery = (() => {
    const qs = new URLSearchParams();
    if (loc.lessonId) qs.set('lesson', loc.lessonId);
    if (loc.slideId) qs.set('slide', loc.slideId);
    return qs.toString();
  })();
  const editorHref = withInstitutionPath(`/admin/courses/${courseId}/editor${editorQuery ? `?${editorQuery}` : ''}`, pathname);

  // The iframe src is seeded from the INITIAL position only — it must NOT depend on
  // live `loc`, or each postMessage would change the src and reload the iframe.
  const embedHref = (() => {
    const qs = new URLSearchParams({ embed: '1' });
    if (initialLessonId) qs.set('lesson', initialLessonId);
    if (initialSlideId) qs.set('slide', initialSlideId);
    return withInstitutionPath(`/admin/courses/${courseId}/preview?${qs.toString()}`, pathname);
  })();

  const DEVICE_BTNS: { id: Device; Icon: typeof Monitor; label: string }[] = [
    { id: 'desktop', Icon: Monitor, label: 'Desktop' },
    { id: 'tablet', Icon: Tablet, label: 'Tablet' },
    { id: 'mobile', Icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Preview banner */}
      <div className="shrink-0 h-12 bg-[#1E3A5F] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-white/70" />
          <span className="text-white text-sm font-semibold">Preview · viewing as a student</span>
          <span className="text-white/40 text-sm hidden sm:inline">·</span>
          <span className="text-white/60 text-xs hidden sm:inline">gates are live; progress isn&apos;t saved</span>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
          {DEVICE_BTNS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setDevice(id)}
              title={`${label} preview`}
              className={`p-1.5 rounded-md transition-all ${
                device === id ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={withInstitutionPath('/admin', pathname)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Courses</span>
            <span className="sm:hidden">Courses</span>
          </Link>
          <div className="w-px h-4 bg-white/20" />
          <Link
            href={editorHref}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open Editor</span>
            <span className="sm:hidden">Editor</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {device === 'desktop' ? (
          <CourseViewer
            courseId={courseId}
            previewMode
            initialLessonId={initialLessonId}
            initialSlideId={initialSlideId}
            onLocationChange={handleLocationChange}
          />
        ) : (
          // Real device simulation — the iframe's own width drives CSS media/container
          // queries, so the layout switches exactly like a physical device of this size.
          <div className="h-full w-full flex items-center justify-center bg-slate-100 p-4 overflow-auto">
            <div
              className="bg-white rounded-[2.2rem] shadow-2xl ring-1 ring-black/10 overflow-hidden border-[10px] border-slate-900 shrink-0"
              style={{ width: DEVICE_SIZES[device].w, maxWidth: '100%', height: '100%', maxHeight: '100%' }}
            >
              <iframe
                key={device}
                src={embedHref}
                title={`${DEVICE_SIZES[device].label} preview`}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewContent({ courseId }: { courseId: string }) {
  const searchParams = useSearchParams();
  if (searchParams.get('embed') === '1') {
    return <EmbedView courseId={courseId} />;
  }
  return <PreviewChrome courseId={courseId} />;
}

export default function AdminPreviewPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = React.use(paramsPromise);

  return (
    <Suspense fallback={<div className="fixed inset-0 z-[60] bg-white" />}>
      <PreviewContent courseId={params.id} />
    </Suspense>
  );
}
