import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the store context
vi.mock('../editor-store-context', () => ({
  useEditorStore: vi.fn((selector) => {
    const fakeState = {
      courseTheme: {},
      updateCourseTheme: vi.fn(),
      courseId: 'c1',
    };
    return selector(fakeState);
  }),
}));

vi.mock('@/lib/content/theme', () => ({
  resolveTheme: () => ({
    primaryColor: '#1E3A5F',
    accentColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    fontFamily: 'Inter',
    fontScale: 1,
    borderRadius: 'md',
    slideTransition: 'fade',
  }),
  DEFAULT_THEME: { primaryColor: '#1E3A5F' },
}));

import { CourseThemeEditor } from './course-theme-editor';

describe('CourseThemeEditor', () => {
  it('renders color section', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
  });

  it('renders course card preview', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Course Card Preview')).toBeInTheDocument();
  });

  it('renders typography section', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Typography')).toBeInTheDocument();
  });

  it('renders border radius section', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Border Radius')).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Reset to defaults')).toBeInTheDocument();
  });

  it('renders all color swatches', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Accent')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('renders all border radius options', () => {
    render(<CourseThemeEditor />);
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });
});
