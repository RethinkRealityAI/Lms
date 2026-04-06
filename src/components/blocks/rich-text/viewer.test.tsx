import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RichTextViewer from './viewer';

const stubBlock = { id: 'test-block', title: 'Test', is_visible: true };

function renderHtml(html: string) {
  const { container } = render(
    <RichTextViewer data={{ html, mode: 'standard' }} block={stubBlock} />
  );
  return container;
}

describe('RichTextViewer sanitizeHtml', () => {
  it('renders normal HTML content', () => {
    const container = renderHtml('<p>Hello <strong>world</strong></p>');
    expect(container.querySelector('p')?.textContent).toBe('Hello world');
    expect(container.querySelector('strong')).toBeTruthy();
  });

  it('strips script tags', () => {
    const container = renderHtml(
      '<p>Before</p><script>alert("xss")</script><p>After</p>'
    );
    expect(container.innerHTML).not.toContain('<script');
    expect(container.innerHTML).not.toContain('alert');
    expect(container.textContent).toContain('Before');
    expect(container.textContent).toContain('After');
  });

  it('strips script tags with attributes', () => {
    const container = renderHtml(
      '<script type="text/javascript">evil()</script><p>Safe</p>'
    );
    expect(container.innerHTML).not.toContain('<script');
    expect(container.textContent).toContain('Safe');
  });

  it('strips images with relative SCORM paths', () => {
    const container = renderHtml(
      '<p>Text</p><img src="fit_content_assets/image.jpg" alt="scorm" />'
    );
    expect(container.innerHTML).not.toContain('<img');
    expect(container.innerHTML).not.toContain('fit_content_assets');
    expect(container.textContent).toContain('Text');
  });

  it('strips images with other relative paths', () => {
    const container = renderHtml(
      '<img src="assets/photo.png" alt="relative" /><p>Content</p>'
    );
    expect(container.innerHTML).not.toContain('<img');
    expect(container.textContent).toContain('Content');
  });

  it('preserves images with absolute https URLs', () => {
    const container = renderHtml(
      '<img src="https://example.com/img.jpg" alt="external" />'
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/img.jpg');
  });

  it('preserves images with http URLs', () => {
    const container = renderHtml(
      '<img src="http://example.com/img.jpg" alt="http" />'
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('preserves images with data: URIs', () => {
    const container = renderHtml(
      '<img src="data:image/png;base64,abc123" alt="data" />'
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toContain('data:image/png');
  });

  it('handles empty HTML', () => {
    const container = renderHtml('');
    const prose = container.querySelector('.prose');
    expect(prose).toBeTruthy();
    expect(prose?.innerHTML).toBe('');
  });

  it('renders sequence mode with sorted segments', () => {
    const { container } = render(
      <RichTextViewer
        block={stubBlock}
        data={{
          html: '',
          mode: 'sequence',
          segments: [
            { text: '<p>Second</p>', reveal_order: 2 },
            { text: '<p>First</p>', reveal_order: 1 },
          ],
        }}
      />
    );
    const divs = container.querySelectorAll('.prose');
    expect(divs).toHaveLength(2);
    expect(divs[0].textContent).toBe('First');
    expect(divs[1].textContent).toBe('Second');
  });

  it('strips script tags inside sequence segments', () => {
    const { container } = render(
      <RichTextViewer
        block={stubBlock}
        data={{
          html: '',
          mode: 'sequence',
          segments: [
            { text: '<p>Safe</p><script>evil()</script>', reveal_order: 0 },
          ],
        }}
      />
    );
    expect(container.innerHTML).not.toContain('<script');
    expect(container.textContent).toContain('Safe');
  });
});
