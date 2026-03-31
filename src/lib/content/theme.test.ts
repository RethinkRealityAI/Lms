import { describe, it, expect } from 'vitest';
import { ThemeSchema, resolveTheme, DEFAULT_THEME, themeToCssVariables } from './theme';

describe('ThemeSchema', () => {
  it('fills defaults for empty object', () => {
    const result = ThemeSchema.parse({});
    expect(result.primaryColor).toBe('#1E3A5F');
    expect(result.accentColor).toBe('#DC2626');
    expect(result.fontFamily).toBe('Inter');
    expect(result.fontScale).toBe(1);
    expect(result.borderRadius).toBe('md');
    expect(result.slideTransition).toBe('fade');
  });

  it('accepts valid overrides', () => {
    const result = ThemeSchema.parse({ primaryColor: '#FF0000', fontScale: 1.25 });
    expect(result.primaryColor).toBe('#FF0000');
    expect(result.fontScale).toBe(1.25);
    expect(result.accentColor).toBe('#DC2626');
  });

  it('rejects invalid fontScale', () => {
    expect(() => ThemeSchema.parse({ fontScale: 5 })).toThrow();
  });
});

describe('resolveTheme', () => {
  it('returns defaults when no overrides', () => {
    const result = resolveTheme({});
    expect(result).toEqual(DEFAULT_THEME);
  });

  it('merges institution theme', () => {
    const result = resolveTheme({ institution: { primaryColor: '#111111' } });
    expect(result.primaryColor).toBe('#111111');
    expect(result.accentColor).toBe('#DC2626');
  });

  it('course overrides institution', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111' },
      course: { primaryColor: '#222222' },
    });
    expect(result.primaryColor).toBe('#222222');
  });

  it('slide overrides course overrides institution', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111' },
      course: { primaryColor: '#222222' },
      slide: { primaryColor: '#333333' },
    });
    expect(result.primaryColor).toBe('#333333');
  });

  it('partial overrides preserve other fields', () => {
    const result = resolveTheme({
      institution: { primaryColor: '#111111', fontFamily: 'Roboto' },
      course: { primaryColor: '#222222' },
    });
    expect(result.primaryColor).toBe('#222222');
    expect(result.fontFamily).toBe('Roboto');
  });
});

describe('themeToCssVariables', () => {
  it('converts theme to CSS variable object', () => {
    const vars = themeToCssVariables(DEFAULT_THEME);
    expect(vars['--theme-primary']).toBe('#1E3A5F');
    expect(vars['--theme-accent']).toBe('#DC2626');
    expect(vars['--theme-bg']).toBe('#FFFFFF');
    expect(vars['--theme-text']).toBe('#0F172A');
    expect(vars['--theme-font']).toBe('Inter');
    expect(vars['--theme-font-scale']).toBe('1');
    expect(vars['--theme-radius']).toBe('md');
  });
});
