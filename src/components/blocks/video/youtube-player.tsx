'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipForward, Youtube, ExternalLink } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Shared IFrame API loader (one script, one ready promise for all players) ──
// No API key required — this is the free YouTube IFrame Player API, not the Data API.
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const finish = () => {
      if (w.YT?.Player) resolve();
    };

    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      finish();
    };

    if (w.YT?.Player) {
      resolve();
      return;
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const poll = window.setInterval(() => {
      if (w.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 50);
    window.setTimeout(() => window.clearInterval(poll), 15000);
  });

  return ytApiPromise;
}

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  start?: number;
  end?: number;
  autoplay?: boolean;
  showSkip?: boolean;
  /** Disable end-detection side effects (used in the editor preview). */
  inert?: boolean;
  onEnded?: () => void;
  onSkip?: () => void;
}

export function YouTubePlayer({
  videoId, title, start, end, autoplay, showSkip, inert, onEnded, onSkip,
}: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [ready, setReady] = useState(false);
  // Facade pattern: the YouTube iframe is only created once the learner presses our
  // play button (or autoplay is on). This keeps YouTube's own red play button +
  // "Watch on YouTube" pre-roll overlay from showing under ours — only OUR control
  // is ever visible. The click is also the user gesture that lets it play with sound.
  const [started, setStarted] = useState<boolean>(!!autoplay);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resolvedTitle, setResolvedTitle] = useState(title ?? '');

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    endedRef.current = false;
    const host = document.createElement('div');
    host.style.width = '100%';
    host.style.height = '100%';
    mountRef.current?.appendChild(host);
    loadYouTubeApi().then(() => {
      if (cancelled || !host.isConnected) return;
      const w = window as any;
      if (!w.YT?.Player) return;
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      playerRef.current = new w.YT.Player(host, {
        videoId,
        playerVars: {
          // We only build the player when the user wants it playing, so always
          // autoplay — the click provides the gesture for sound.
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          disablekb: 0,
          playsinline: 1,
          iv_load_policy: 3,
          ...(origin ? { origin } : {}),
          start: start && start > 0 ? Math.floor(start) : undefined,
          end: end && end > 0 ? Math.floor(end) : undefined,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            setReady(true);
            setDuration(e.target.getDuration() || 0);
            setMuted(e.target.isMuted?.() ?? false);
            if (!title) {
              const vd = e.target.getVideoData?.();
              if (vd?.title) setResolvedTitle(vd.title);
            }
          },
          onStateChange: (e: any) => {
            const YT = (window as any).YT;
            if (e.data === YT.PlayerState.PLAYING) { setPlaying(true); setDuration(e.target.getDuration() || 0); }
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) {
              setPlaying(false);
              if (!endedRef.current && !inert) { endedRef.current = true; onEndedRef.current?.(); }
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy?.(); } catch { /* noop */ }
      playerRef.current = null;
      try { host.remove(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, started]);

  // Reset to the facade when the video changes.
  useEffect(() => { setStarted(!!autoplay); setPlaying(false); setReady(false); }, [videoId, autoplay]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      setCurrent(p.getCurrentTime() || 0);
      const d = p.getDuration?.() || 0;
      if (d && d !== duration) setDuration(d);
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, duration]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo(); else p.playVideo();
  }, [playing]);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  }, []);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current;
    if (!p) return;
    const t = Number(e.target.value);
    p.seekTo(t, true);
    setCurrent(t);
  }, []);

  const goFullscreen = useCallback(() => {
    const p = playerRef.current;
    if (p?.getIframe) {
      const iframe = p.getIframe() as HTMLIFrameElement | undefined;
      if (iframe?.requestFullscreen) {
        iframe.requestFullscreen();
        return;
      }
    }
    const el = wrapRef.current;
    if (el?.requestFullscreen) el.requestFullscreen();
  }, []);

  const max = end && end > 0 ? Math.min(end, duration || end) : duration;
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const displayTitle = resolvedTitle || title || 'Video';

  const playOrStart = () => (started ? togglePlay() : setStarted(true));

  return (
    <div ref={wrapRef} className="w-full flex flex-col">
      {/* Title — full width, wraps instead of truncating */}
      <div className="flex items-start gap-2 px-3.5 py-2.5 border-b border-current/10 shrink-0">
        <Youtube className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden />
        <span className="text-sm font-semibold leading-snug line-clamp-2 min-w-0 flex-1">
          {displayTitle}
        </span>
      </div>

      {/* Video — full-width 16:9 so it reads big on mobile instead of collapsing */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        {started ? (
          <div ref={mountRef} className="absolute inset-0 w-full h-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        )}
        {(!started || !playing) && (
          <button
            type="button"
            onClick={() => (started ? togglePlay() : setStarted(true))}
            aria-label={started ? (playing ? 'Pause' : 'Play') : 'Play video'}
            className="absolute inset-0 z-10 flex items-center justify-center group bg-black/0 hover:bg-black/10 transition-colors"
          >
            <span className="flex items-center justify-center w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full bg-black/60 backdrop-blur-sm shadow-lg transition-transform group-hover:scale-105">
              <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}
      </div>

      {/* Controls — wraps on narrow widths so enlarge + YouTube link stay visible */}
      <div className="shrink-0 border-t border-current/10 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button type="button" onClick={playOrStart} className="opacity-90 hover:opacity-100 shrink-0" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <span className="text-[11px] font-medium opacity-70 tabular-nums shrink-0 w-9 text-right">{fmt(current)}</span>
          <input
            type="range"
            min={start && start > 0 ? Math.floor(start) : 0}
            max={Math.max(1, Math.floor(max))}
            value={Math.floor(current)}
            onChange={seek}
            className="flex-1 min-w-[5rem] h-1.5 accent-red-500 cursor-pointer"
            style={{ background: `linear-gradient(to right, #ef4444 ${pct}%, rgba(128,128,128,0.25) ${pct}%)`, borderRadius: 9999 }}
            aria-label="Seek"
          />
          <span className="text-[11px] font-medium opacity-70 tabular-nums shrink-0 w-9">{fmt(max)}</span>
          <button type="button" onClick={toggleMute} className="opacity-80 hover:opacity-100 shrink-0" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button type="button" onClick={goFullscreen} className="opacity-80 hover:opacity-100 shrink-0" aria-label="Enlarge video">
            <Maximize2 className="w-4 h-4" />
          </button>
          {showSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center gap-1 text-[11px] font-semibold opacity-80 hover:opacity-100 shrink-0"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 underline-offset-2 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Watch on YouTube
          </a>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(displayTitle)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 opacity-70 hover:opacity-100 underline-offset-2 hover:underline"
          >
            More videos like this
          </a>
        </div>
      </div>
    </div>
  );
}
