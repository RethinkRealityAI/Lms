'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

const CHUNK_RELOAD_KEY = 'gansid.chunkReloadAt';

/**
 * A lazily-loaded component (React.lazy / next/dynamic) fails to load its JS
 * chunk. The overwhelmingly common cause is a NEW DEPLOY: the open page's build
 * manifest references old chunk hashes that the server has already replaced, so
 * the chunk 404s (served as text/plain → "MIME type not executable" /
 * ChunkLoadError). Detect these so we can transparently recover by reloading.
 */
export function isChunkLoadError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  if (!e) return false;
  if (e.name === 'ChunkLoadError') return true;
  return /Loading chunk\s+\S+\s+failed|Failed to load chunk|error loading dynamically imported module|Importing a module script failed|'text\/plain'|MIME type/i.test(
    e.message ?? '',
  );
}

interface Props {
  children: React.ReactNode;
  /** Short label for logs (e.g. the block type). */
  label?: string;
}

interface State {
  hasError: boolean;
  chunk: boolean;
  reloading: boolean;
}

/**
 * Error boundary for lazily-loaded editor components. Without it, a failed
 * chunk load (a rejected `import()`, which Suspense re-throws) propagates past
 * the Suspense boundary and crashes the ENTIRE editor tree. With it, the failure
 * is contained to this subtree and, for a stale-deploy chunk error, we reload
 * ONCE to pick up the fresh build (the editor auto-saves, so no work is lost).
 * The reload is guarded so a genuinely-missing chunk can't cause a reload loop —
 * after one attempt the user gets a manual "Reload" button instead.
 */
export class ChunkErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, chunk: false, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, chunk: isChunkLoadError(error), reloading: false };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      try {
        const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
        // One reload per 15s window — recovers from a stale deploy without looping
        // when the chunk is genuinely gone.
        if (!Number.isFinite(last) || Date.now() - last > 15_000) {
          window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
          this.setState({ reloading: true });
          window.location.reload();
          return;
        }
      } catch {
        /* sessionStorage unavailable — fall through to the manual reload UI */
      }
    }
    console.error(`Editor boundary caught${this.props.label ? ` [${this.props.label}]` : ''}:`, error);
  }

  private reload = () => {
    try {
      window.location.reload();
    } catch {
      /* ignore */
    }
  };

  render() {
    if (this.state.reloading) {
      return (
        <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" /> Updating to the latest version…
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-800 mb-1">
            {this.state.chunk ? 'This editor needs a refresh' : 'This panel hit an error'}
          </p>
          <p className="text-amber-700 mb-3 text-xs leading-relaxed">
            {this.state.chunk
              ? 'A newer version was just deployed, so this component failed to load. Reload to pick it up — your saved changes are safe.'
              : 'Something went wrong rendering this editor. Reloading usually fixes it.'}
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload editor
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
