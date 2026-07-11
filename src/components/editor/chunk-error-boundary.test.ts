import { describe, it, expect } from 'vitest';
import { isChunkLoadError } from './chunk-error-boundary';

describe('isChunkLoadError', () => {
  it('detects ChunkLoadError by name', () => {
    const e = new Error('boom');
    e.name = 'ChunkLoadError';
    expect(isChunkLoadError(e)).toBe(true);
  });

  it('detects the common chunk-load failure messages', () => {
    expect(isChunkLoadError(new Error('Loading chunk 73590 failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Failed to load chunk /_next/static/chunks/fa25aa959592e326.js'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module: https://x/editor.js'))).toBe(true);
    expect(isChunkLoadError(new Error("Refused to execute script because its MIME type ('text/plain') is not executable"))).toBe(true);
  });

  it('does not misclassify ordinary render errors', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'pairs')"))).toBe(false);
    expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(false);
  });

  it('tolerates null / undefined', () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
