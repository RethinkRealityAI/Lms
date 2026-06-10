import { describe, it, expect } from 'vitest';
import { interpolateTemplate, renderStoredEmailTemplate, escapeHtml } from './render';

describe('interpolateTemplate', () => {
  it('replaces known merge tags', () => {
    expect(interpolateTemplate('Hello {{name}}', { name: 'Alex' })).toBe('Hello Alex');
  });

  it('leaves unknown tags empty', () => {
    expect(interpolateTemplate('Hi {{missing}}', {})).toBe('Hi ');
  });
});

describe('escapeHtml', () => {
  it('escapes unsafe characters', () => {
    expect(escapeHtml('<script>"&"')).toBe('&lt;script&gt;&quot;&amp;&quot;');
  });
});

describe('renderStoredEmailTemplate', () => {
  it('wraps body in institution layout by default', () => {
    const { subject, html } = renderStoredEmailTemplate({
      institutionSlug: 'gansid',
      subjectTemplate: 'Hello {{recipientName}}',
      bodyHtmlTemplate: '<p>{{greeting}}</p>',
      variables: { recipientName: 'Sam', greeting: 'Hi Sam,' },
    });
    expect(subject).toBe('Hello Sam');
    expect(html).toContain('GANSID Learning');
    expect(html).toContain('Hi Sam,');
  });
});
