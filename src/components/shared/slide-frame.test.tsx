import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlideFrame } from './slide-frame';

describe('SlideFrame', () => {
  it('renders the lesson title', () => {
    render(
      <SlideFrame lessonTitle="Lesson 1" currentSlide={1} totalSlides={5}>
        <div>Content</div>
      </SlideFrame>
    );
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
  });

  it('renders slide counter', () => {
    render(
      <SlideFrame lessonTitle="Test" currentSlide={3} totalSlides={10}>
        <div>Content</div>
      </SlideFrame>
    );
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <SlideFrame lessonTitle="Test" currentSlide={1} totalSlides={1}>
        <div>My slide content</div>
      </SlideFrame>
    );
    expect(screen.getByText('My slide content')).toBeInTheDocument();
  });

  it('renders slide title when provided', () => {
    render(
      <SlideFrame lessonTitle="Lesson 1" slideTitle="Introduction" currentSlide={1} totalSlides={5}>
        <div>Content</div>
      </SlideFrame>
    );
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('does not render slide title when null', () => {
    render(
      <SlideFrame lessonTitle="Lesson 1" slideTitle={null} currentSlide={1} totalSlides={5}>
        <div>Content</div>
      </SlideFrame>
    );
    // Only lesson title, no extra subtitle
    const allText = document.body.textContent;
    expect(allText).toContain('Lesson 1');
    expect(allText).not.toContain('null');
  });

  it('applies custom title color via style', () => {
    render(
      <SlideFrame lessonTitle="Lesson 1" slideTitle="Styled Title" slideTitleColor="#DC2626" currentSlide={1} totalSlides={5}>
        <div>Content</div>
      </SlideFrame>
    );
    const titleEl = screen.getByText('Styled Title');
    expect(titleEl.style.color).toBe('rgb(220, 38, 38)');
  });

  it('uses default slate color when no slideTitleColor is provided', () => {
    render(
      <SlideFrame lessonTitle="Lesson 1" slideTitle="Default Color" currentSlide={1} totalSlides={5}>
        <div>Content</div>
      </SlideFrame>
    );
    const titleEl = screen.getByText('Default Color');
    expect(titleEl.style.color).toBe('rgb(100, 116, 139)'); // #64748b
  });
});
