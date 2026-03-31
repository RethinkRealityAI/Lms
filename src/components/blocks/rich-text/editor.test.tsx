import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { RichTextEditor } from './editor';

// Mock tiptap modules since they rely on browser APIs
vi.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: () => null,
}));
vi.mock('@tiptap/starter-kit', () => ({ default: {} }));
vi.mock('@tiptap/extension-image', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: () => ({}) } }));

describe('RichTextEditor', () => {
  it('renders nothing when editor is null (SSR / no browser APIs)', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        data={{ html: '<p>Hello</p>', mode: 'standard' }}
        block={{ id: 'test-block-id' }}
        onChange={onChange}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
