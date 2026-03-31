import { describe, it, expect } from 'vitest';
import type { Slide, SlideTemplate, ContentActivityLog, InstitutionTheme, SlideType } from './index';

describe('Editor types', () => {
  it('Slide type has required fields', () => {
    const slide: Slide = {
      id: 'test-id',
      lesson_id: 'lesson-id',
      slide_type: 'content',
      title: 'Test Slide',
      order_index: 0,
      status: 'draft',
      settings: {},
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(slide.slide_type).toBe('content');
  });

  it('SlideType union covers all types', () => {
    const types: SlideType[] = ['title', 'content', 'media', 'quiz', 'disclaimer', 'interactive', 'cta'];
    expect(types).toHaveLength(7);
  });

  it('InstitutionTheme has color fields', () => {
    const theme: InstitutionTheme = {
      primaryColor: '#1E3A5F',
      accentColor: '#DC2626',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      fontFamily: 'Inter',
      fontScale: 1,
      borderRadius: 'md',
      slideTransition: 'fade',
    };
    expect(theme.primaryColor).toBe('#1E3A5F');
  });
});
