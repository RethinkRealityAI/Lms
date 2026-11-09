'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Message names the host page listens for. Keep in sync with docs/embedding.md. */
const HEIGHT_MSG = 'lms-embed-height';
const NAVIGATE_MSG = 'lms-embed-navigate';

/**
 * Reports this document's content height to the host page when we are inside an
 * iframe, so the embed can size itself to the page instead of being pinned to a
 * fixed height.
 *
 * Why this exists: the SCAGO site embeds the LMS at a fixed height chosen for
 * the (tall) landing page. Inside an iframe `100vh` resolves to the IFRAME's
 * height, so every shorter page — sign-in especially — was laid out inside a
 * viewport thousands of pixels tall, leaving a blank white screen above the
 * actual content. Letting the frame follow the content removes the dead space
 * and the phantom inner scrollbar.
 *
 * Two details that are easy to get wrong:
 *
 *  1. `min-h-screen` makes the document at least as tall as the iframe, so
 *     measuring naively yields "however tall the frame already is" and the
 *     frame can only ever grow — a ratchet. We add a `lms-embedded` class to
 *     <html> so a scoped rule in globals.css relaxes that minimum, letting the
 *     document collapse to its true content height.
 *  2. Navigating inside an iframe does not move the HOST page's scroll
 *     position. Someone who scrolls down the landing page and clicks "Sign in"
 *     would land on a short page while the host is still scrolled past it. We
 *     emit a navigate message so the host can bring the frame back into view.
 *
 * No-ops entirely when not framed, so it costs nothing on the normal site.
 */
export function EmbedHeightReporter() {
  const pathname = usePathname();

  useEffect(() => {
    // `window.top` access throws in some cross-origin cases; treat that as framed.
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch {
      framed = true;
    }
    if (!framed) return;

    const root = document.documentElement;
    root.classList.add('lms-embedded');

    let last = 0;
    let frame = 0;

    const post = () => {
      frame = 0;
      const body = document.body;
      if (!body) return;
      // Measure the BODY, never documentElement: <html>.scrollHeight is floored
      // at the viewport (i.e. the current iframe height), so using it would just
      // echo the frame's existing size back and the embed could never shrink.
      const height = Math.ceil(
        Math.max(body.scrollHeight, body.getBoundingClientRect().height)
      );
      // Ignore sub-pixel jitter; otherwise a resize observer can loop forever.
      if (!height || Math.abs(height - last) < 2) return;
      last = height;
      window.parent.postMessage({ type: HEIGHT_MSG, height, path: pathname }, '*');
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(post);
    };

    schedule();

    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    if (document.body) observer.observe(document.body);

    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule);

    // Images finishing late (and web fonts) change height after first paint.
    const timers = [150, 500, 1200, 2500].map((ms) => window.setTimeout(schedule, ms));

    return () => {
      observer.disconnect();
      window.removeEventListener('load', schedule);
      window.removeEventListener('resize', schedule);
      timers.forEach((t) => window.clearTimeout(t));
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  // Bring the top of the new page into view after an in-frame navigation.
  //
  // Navigating inside an iframe does not move the HOST page's scroll position,
  // so someone who scrolls down the landing page and clicks "Enrol free" ends
  // up looking at whatever part of the frame they were already on — usually
  // blank space below the new, shorter page.
  //
  // Belt and braces, because we cannot count on the host cooperating:
  //   1. postMessage, which a host running our snippet acts on precisely; and
  //   2. scrollIntoView on our own top element. A scroll started inside a frame
  //      walks up through ancestor scrolling boxes, so this nudges the host even
  //      cross-origin. It is best-effort — browsers gate it on user activation,
  //      which a link click satisfies — and harmless when it does nothing.
  useEffect(() => {
    let framed = false;
    try {
      framed = window.self !== window.top;
    } catch {
      framed = true;
    }
    if (!framed) return;

    window.parent.postMessage({ type: NAVIGATE_MSG, path: pathname }, '*');

    // Reset our own scroll first, then ask to be revealed in the host.
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => {
      const top = document.body?.firstElementChild;
      if (top instanceof HTMLElement) {
        try {
          top.scrollIntoView({ block: 'start', behavior: 'smooth' });
        } catch {
          /* older browsers: ignore */
        }
      }
    }, 60);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
