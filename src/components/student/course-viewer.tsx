'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, Circle, Play, Loader2, Star, Send,
  ChevronLeft, ChevronRight, Award, BookOpen,
  Minimize2, Maximize2, Menu, X, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Lesson, LessonBlock, Progress as ProgressType } from '@/types';
import type { BlockViewerContext } from '@/lib/content/block-registry';
import { LessonBlockRenderer, createFallbackBlockFromLesson } from '@/components/lesson-block-renderer';
import { sortBlocks } from '@/lib/content/lesson-blocks';
import dynamic from 'next/dynamic';
import { TitleSlide } from '@/components/shared/title-slide';
import { SlideContentArea } from '@/components/shared/slide-frame';
import { computeNavState, findNextLesson } from '@/lib/utils/slide-navigation';
import { splitBlocksIntoPages } from '@/lib/utils/split-blocks-into-pages';
import { LessonNavbar } from '@/components/student/lesson-navbar';
import { ShortcutHint } from '@/components/student/shortcut-hint';
import { viewedImagesStorageKey } from '@/lib/content/blocks/image-gallery/display-utils';
import { isGatedQuizType, isQuizSatisfiable } from '@/lib/content/blocks/quiz-inline/validation';
import type { QuizInlineData } from '@/lib/content/blocks/quiz-inline/schema';
import { GRID_COLS, GRID_MARGIN, GRID_CONTAINER_PADDING, getBlockGridLayout, blockSurfaceFillCell } from '@/lib/content/gridConstants';
import { asCourseTheme } from '@/lib/content/course-theme';
import { asInstitutionTheme, resolveEffectiveTheme, type InstitutionTheme } from '@/lib/tenant/institution-theme';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { resolveSlideBackgroundFit, slideBackgroundImageStyle } from '@/lib/content/slide-background';
import { resolveInstitutionSlug, withInstitutionPath } from '@/lib/tenant/path';
import { getMyCourseFeedback, getMyProgramFeedback, upsertCourseFeedbackResponse } from '@/lib/db/course-feedback';
import { resolveCompletionSurveys } from '@/lib/db/survey-assignments';
import { fetchCertificateDisplay, type CertificateDisplay } from '@/lib/content/certificate-display';
import { CertificateCelebration } from '@/components/certificates/certificate-celebration';
import type { SurveyData, SurveyAnswers, SurveyAnswerValue, SurveyQuestion } from '@/lib/content/blocks/survey/schema';
import type { SurveyTemplate } from '@/lib/db/survey-templates';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, CheckCircle2 } from 'lucide-react';

const CanvasSlideViewer = dynamic(
  () => import('./canvas-slide-viewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">Loading canvas...</div> }
);

// ---------------------------------------------------------------------------
// Slide types
// ---------------------------------------------------------------------------
interface SlideSettings {
  background?: string;
  background_image?: string;
  [key: string]: unknown;
}

type Slide =
  | { kind: 'title' }
  | { kind: 'page'; slideId: string; slideTitle?: string | null; blocks: LessonBlock[]; settings?: SlideSettings; slideType?: string; canvasData?: Record<string, unknown> | null }
  | { kind: 'completion' };

// ---------------------------------------------------------------------------
// Confetti celebration — pure CSS, no external deps
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = ['#DC2626', '#0099CA', '#1E3A5F', '#FFD700', '#22C55E'];

function Confetti({ count = 24 }: { count?: number }) {
  const pieces = React.useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,           // % from left
      delay: Math.random() * 1.2,           // stagger start 0–1.2s
      duration: 1.8 + Math.random() * 1.2,  // 1.8–3s fall
      drift: (Math.random() - 0.5) * 60,    // px horizontal drift
      size: 4 + Math.random() * 4,          // 4–8px
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
      isCircle: Math.random() > 0.5,
    })),
  [count]);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { opacity: 1; transform: translateY(-10px) translateX(0px) rotate(0deg) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(calc(100vh - 120px)) translateX(var(--drift)) rotate(var(--rotate)) scale(0.5); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" aria-hidden="true">
        {pieces.map(p => (
          <div
            key={p.id}
            className={p.isCircle ? 'rounded-full' : 'rounded-sm'}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: 0,
              '--drift': `${p.drift}px`,
              '--rotate': `${p.rotate + 360}deg`,
              animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Slide background — matches editor's getSlideBackground (slide-preview.tsx)
// ---------------------------------------------------------------------------
function getSlideBackground(settings?: SlideSettings, fallback?: string): React.CSSProperties {
  const bg = settings?.background ?? fallback;
  if (bg === 'gradient') return { background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)' };
  if (typeof bg === 'string' && bg.startsWith('#')) return { backgroundColor: bg };
  return { backgroundColor: '#FFFFFF' };
}

// ---------------------------------------------------------------------------
// Grid Block Renderer — CSS Grid for blocks with grid positions, vertical stack for legacy
// ---------------------------------------------------------------------------
/** Tailwind justify-* class for a block's vertical content alignment within its cell */
function alignToJustify(align: unknown): string {
  return align === 'center' ? 'justify-center' : align === 'bottom' ? 'justify-end' : 'justify-start';
}

function GridBlockRenderer({ blocks, lessonTitle = '', onQuizCorrect, onBlockComplete, blockStyle, context }: {
  blocks: LessonBlock[];
  lessonTitle?: string;
  onQuizCorrect?: (blockId: string) => void;
  onBlockComplete?: (blockId: string) => void;
  blockStyle?: string;
  context?: BlockViewerContext;
}) {
  if (!blocks.length) return null;

  const mergedContext: BlockViewerContext = {
    ...context,
    blockStyle: blockStyle ?? context?.blockStyle,
    soleBlock: blocks.length === 1,
  };

  // Sole block on the slide. Two behaviours:
  //  • Interactive fill-cell blocks (quiz, match, fill-in-the-blank, survey, slider)
  //    STRETCH to fill the slide so they read big instead of tiny-and-top-stuck.
  //  • Everything else (video, text, table, list, image…) hugs its content and the
  //    "Vertical Position" control places it top / middle / bottom of the slide.
  // The block keeps its chosen width via gridColumn either way.
  if (blocks.length === 1) {
    const block = blocks[0];
    const layout = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
    const stretch = blockSurfaceFillCell(block.block_type);
    const align = (block.data as Record<string, unknown>)?.contentAlign;
    const alignContent = stretch ? 'stretch' : align === 'center' ? 'center' : align === 'bottom' ? 'end' : 'start';
    return (
      <div
        className="w-full grid-viewer flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          alignContent,
          gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
          padding: `${GRID_CONTAINER_PADDING[1]}px ${GRID_CONTAINER_PADDING[0]}px`,
        }}
      >
        <div
          className={stretch ? 'min-w-0 min-h-0 h-full' : 'min-w-0 min-h-0'}
          style={{ gridColumn: `${layout.gridX + 1} / ${layout.gridX + layout.gridW + 1}` }}
        >
          <LessonBlockRenderer block={block} lessonTitle={lessonTitle} onQuizCorrect={onQuizCorrect} onBlockComplete={onBlockComplete} context={mergedContext} />
        </div>
      </div>
    );
  }

  // Check if any block has explicit non-default grid positions
  const hasGridLayout = blocks.some(
    b => typeof b.data?.gridX === 'number' && typeof b.data?.gridW === 'number' && (b.data.gridW as number) < 12
  );

  // If no custom grid layout, render simple vertical stack (backward compatible)
  if (!hasGridLayout) {
    return (
      <div className="flex flex-col gap-2.5">
        {blocks.map(block => (
          <div key={block.id} className="relative overflow-hidden rounded-2xl min-h-0">
            <LessonBlockRenderer block={block} lessonTitle={lessonTitle} onQuizCorrect={onQuizCorrect} onBlockComplete={onBlockComplete} context={mergedContext} />
          </div>
        ))}
      </div>
    );
  }

  // CSS Grid renderer matching editor's react-grid-layout. The cell fills its
  // row track (glass frame) and content is vertically aligned within it,
  // mirroring the editor's contentAlign behavior for WYSIWYG parity.
  return (
    <div
      className="w-full grid-viewer"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: `${GRID_MARGIN[1]}px ${GRID_MARGIN[0]}px`,
        padding: `${GRID_CONTAINER_PADDING[1]}px ${GRID_CONTAINER_PADDING[0]}px`,
      }}
    >
      {blocks.map(block => {
        const layout = getBlockGridLayout((block.data ?? {}) as Record<string, unknown>);
        const justify = alignToJustify((block.data as Record<string, unknown>)?.contentAlign);
        return (
          <div
            key={block.id}
            className="min-w-0 min-h-0"
            style={{
              gridColumn: `${layout.gridX + 1} / ${layout.gridX + layout.gridW + 1}`,
              gridRow: `${layout.gridY + 1} / ${layout.gridY + layout.gridH + 1}`,
            }}
          >
            <div className={`h-full flex flex-col ${justify}`}>
              <LessonBlockRenderer block={block} lessonTitle={lessonTitle} onQuizCorrect={onQuizCorrect} onBlockComplete={onBlockComplete} context={mergedContext} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Wraps a nav button so a tooltip appears on hover when navigation is blocked. */
function NavButtonWithHint({
  disabled,
  hint,
  children,
  className,
  onClick,
  'aria-label': ariaLabel,
}: {
  disabled?: boolean;
  hint?: string | null;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  if (!disabled || !hint) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex relative group focus-within:outline-none">
      <button type="button" disabled onClick={onClick} aria-label={ariaLabel} className={className}>
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 mb-2 z-50 w-max max-w-[240px] px-2.5 py-1.5 text-xs leading-snug text-white bg-slate-800 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg"
      >
        {hint}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Completion Feedback Form — inline survey on the completion slide
// ---------------------------------------------------------------------------
function FeedbackQuestionField({
  question,
  value,
  onChange,
  disabled,
  primaryColor,
}: {
  question: SurveyQuestion;
  value: SurveyAnswerValue | undefined;
  onChange: (value: SurveyAnswerValue) => void;
  disabled?: boolean;
  primaryColor: string;
}) {
  const options = question.options ?? [];

  switch (question.type) {
    case 'true_false':
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((option, i) => {
            const selected = value === option;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  selected
                    ? 'font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={selected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}18`, color: primaryColor } : undefined}
              >
                {question.type === 'multiple_choice' && (
                  <span className="text-slate-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                )}
                {option}
              </button>
            );
          })}
        </div>
      );

    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {options.map((option, i) => {
            const checked = selected.includes(option);
            return (
              <label
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  checked ? 'font-medium' : 'border-slate-200 hover:bg-slate-50'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={checked ? { borderColor: primaryColor, backgroundColor: `${primaryColor}18` } : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (disabled) return;
                    if (checked) onChange(selected.filter(o => o !== option));
                    else onChange([...selected, option]);
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-800">{option}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'text':
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
          className="bg-white"
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Share your thoughts..."
          rows={3}
          className="bg-white resize-y"
        />
      );

    case 'rating': {
      const rating = typeof value === 'number' ? value : 0;
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              className="cursor-pointer hover:scale-110 transition-transform disabled:cursor-not-allowed"
            >
              <Star className={`h-7 w-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
      );
    }

    case 'scale': {
      const min = question.min_value ?? 1;
      const max = question.max_value ?? 10;
      const step = question.increment ?? 1;
      const num = typeof value === 'number' ? value : min;
      const pct = max === min ? 0 : ((num - min) / (max - min)) * 100;
      return (
        <div className="space-y-3 px-1">
          <div className="text-center">
            <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: primaryColor }}>
              {num}
            </span>
          </div>
          <input
            type="range" min={min} max={max} step={step} value={num}
            disabled={disabled}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
            style={{ background: `linear-gradient(to right, ${primaryColor} 0%, ${primaryColor} ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)` }}
          />
          {(question.min_label || question.max_label) && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>{question.min_label ?? min}</span>
              <span>{question.max_label ?? max}</span>
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

function CompletionFeedbackForm({
  template,
  answers,
  onAnswerChange,
  submitted,
  submitting,
  onSubmit,
  primaryColor,
}: {
  template: SurveyTemplate;
  answers: SurveyAnswers;
  onAnswerChange: (questionId: string, value: SurveyAnswerValue) => void;
  submitted: boolean;
  submitting: boolean;
  onSubmit: () => void;
  primaryColor: string;
}) {
  const surveyData: SurveyData = template.data;
  const { title, description, questions = [] } = surveyData;

  if (!questions.length) return null;

  return (
    <div className="w-full max-w-xl shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 text-white rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}>
        <div className="flex items-center gap-2 mb-0.5">
          <ClipboardList className="h-4 w-4 opacity-90 shrink-0" />
          <h4 className="text-base font-bold">{title ?? 'Course Feedback'}</h4>
        </div>
        {description && <p className="text-sm text-white/85 leading-relaxed">{description}</p>}
        <p className="text-xs text-white/70 mt-1">Optional — help us improve this course.</p>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        {submitted ? (
          <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Thanks for your feedback!</p>
              <p className="text-xs text-green-700 mt-0.5">Your response has been recorded.</p>
            </div>
          </div>
        ) : (
          <>
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-snug text-slate-800">
                    {question.question || 'Question'}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                </div>
                <div className="pl-7">
                  <FeedbackQuestionField
                    question={question}
                    value={answers[question.id]}
                    onChange={val => onAnswerChange(question.id, val)}
                    disabled={submitting}
                    primaryColor={primaryColor}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Button
                onClick={onSubmit}
                disabled={submitting}
                className="font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Feedback
              </Button>
              <span className="text-xs text-slate-400">Optional — you can skip this</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CourseViewerProps {
  courseId: string;
  previewMode?: boolean;
  /** When previewing from the editor, open this lesson instead of the first one */
  initialLessonId?: string | null;
  /** When previewing from the editor, jump to this slide within the lesson */
  initialSlideId?: string | null;
  /** Reports the current lesson + slide as the user navigates (for editor resume) */
  onLocationChange?: (lessonId: string | null, slideId: string | null) => void;
  /** Rendered inside a device-frame iframe — fill the full iframe height (no banner) */
  embedded?: boolean;
}

export default function CourseViewer({ courseId, previewMode = false, initialLessonId = null, initialSlideId = null, onLocationChange, embedded = false }: CourseViewerProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressType>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<Record<string, LessonBlock[]>>({});
  const [lessonSlidesMap, setLessonSlidesMap] = useState<Record<string, Array<{ id: string; order_index: number; title?: string | null; settings?: SlideSettings; slide_type?: string; canvas_data?: Record<string, unknown> | null }>>>({});
  const [lessonQuizzes, setLessonQuizzes] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  // Slide viewer
  const [currentSlide, setCurrentSlide] = useState(0);
  const [subPage, setSubPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false); // mobile glass lesson modal
  const [institutionTheme, setInstitutionTheme] = useState<InstitutionTheme>({}); // global theme layer
  const [autoCompleteFired, setAutoCompleteFired] = useState<Record<string, boolean>>({});
  // Confetti — track which lessons have already shown the animation
  const confettiFiredRef = useRef<Record<string, boolean>>({});
  const navDirection = useRef<'forward' | 'backward'>('forward');
  // Guards the one-time jump to the editor-requested slide on initial load
  const appliedInitialSlideRef = useRef(false);
  // Pending cross-lesson navigation (embedded mode) consumed once slides rebuild
  const pendingNavigateRef = useRef<string | null>(null);
  // Reset sub-page when slide changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setSubPage(0); }, [currentSlide, selectedLesson?.id]);
  const [showConfetti, setShowConfetti] = useState(false);
  // Certificate earned state — shown in congratulations modal
  const [celebration, setCelebration] = useState<CertificateDisplay | null>(null);
  // Inline quiz completion tracking — set of blockIds answered correctly per lesson
  const [correctQuizBlocks, setCorrectQuizBlocks] = useState<Record<string, Set<string>>>({});
  // Interactive block completion (e.g. image gallery require-all-clicked) per lesson
  const [completedInteractiveBlocks, setCompletedInteractiveBlocks] = useState<Record<string, Set<string>>>({});
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  // Sequential program lock — set to the blocking (earlier, incomplete) course title
  const [lockedReason, setLockedReason] = useState<string | null>(null);

  // Completion feedback survey (course-level)
  const [feedbackTemplateId, setFeedbackTemplateId] = useState<string | null>(null);
  const [feedbackTemplate, setFeedbackTemplate] = useState<SurveyTemplate | null>(null);
  const [feedbackAnswers, setFeedbackAnswers] = useState<SurveyAnswers>({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Program-level completion survey (shown alongside course survey on final lesson of a program)
  const [programSurvey, setProgramSurvey] = useState<{
    programId: string; programTitle: string; templateId: string; template: SurveyTemplate;
  } | null>(null);
  const [programFeedbackAnswers, setProgramFeedbackAnswers] = useState<SurveyAnswers>({});
  const [programFeedbackSubmitting, setProgramFeedbackSubmitting] = useState(false);
  const [programFeedbackSubmitted, setProgramFeedbackSubmitted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const institutionSlug = resolveInstitutionSlug(pathname);
  const supabase = createClient();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hide the parent layout's full navbar when this component mounts
  useEffect(() => {
    const navbar = document.getElementById('student-navbar');
    const main = document.getElementById('student-main');
    if (navbar) navbar.style.display = 'none';
    if (main) main.style.paddingTop = '0';
    return () => {
      if (navbar) navbar.style.display = '';
      if (main) main.style.paddingTop = '';
    };
  }, []);

  // Fullscreen keyboard shortcuts (F to toggle, Escape to exit)
  useEffect(() => {
    const handleFullscreenKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleFullscreenKey);
    return () => window.removeEventListener('keydown', handleFullscreenKey);
  }, [isFullscreen]);

  useEffect(() => { fetchData(); }, [courseId]);

  // ---------------------------------------------------------------------------
  // Lesson selection — always resets to slide 0
  // ---------------------------------------------------------------------------
  const selectLesson = useCallback((lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentSlide(0);
  }, []);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    setPageLoading(true);
    try {
      // Fetch course first — RLS allows reading published courses without auth,
      // so this never erroneously returns null due to session timing issues.
      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
      if (courseData) setCourse(courseData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPageLoading(false); return; }

      // Sequential program guard — if this course sits inside a sequential program
      // and an earlier-ordered course isn't certified yet, lock the viewer.
      // Defensive: any failure here must never block the course from loading.
      if (!previewMode) {
        try {
          const { data: pcs } = await supabase
            .from('program_courses')
            .select('program_id, programs(sequential)')
            .eq('course_id', courseId);
          const seqProgramIds = (pcs ?? [])
            .filter((pc: any) => {
              const prog = Array.isArray(pc.programs) ? pc.programs[0] : pc.programs;
              return prog?.sequential === true;
            })
            .map((pc: any) => pc.program_id as string);

          if (seqProgramIds.length > 0) {
            const { data: allPcs } = await supabase
              .from('program_courses')
              .select('program_id, course_id, order_index')
              .in('program_id', seqProgramIds)
              .order('order_index', { ascending: true });
            const programCourseIds = [...new Set((allPcs ?? []).map((pc: any) => pc.course_id as string))];

            let certified = new Set<string>();
            if (programCourseIds.length > 0) {
              const { data: certs } = await supabase
                .from('certificates')
                .select('course_id')
                .eq('user_id', user.id)
                .in('course_id', programCourseIds)
                .is('revoked_at', null);
              certified = new Set((certs ?? []).map((c: any) => c.course_id as string));
            }

            for (const pid of seqProgramIds) {
              const seq = (allPcs ?? []).filter((pc: any) => pc.program_id === pid);
              const myIdx = seq.findIndex((pc: any) => pc.course_id === courseId);
              if (myIdx <= 0) continue;
              const blocker = seq.slice(0, myIdx).find((pc: any) => !certified.has(pc.course_id));
              if (blocker) {
                let prevTitle = 'the previous course';
                try {
                  const { data: prev } = await supabase
                    .from('courses').select('title').eq('id', blocker.course_id).maybeSingle();
                  if (prev?.title) prevTitle = prev.title;
                } catch { /* keep fallback title */ }
                setLockedReason(prevTitle);
                setPageLoading(false);
                return; // locked — skip enrollment/lessons entirely
              }
            }
          }
        } catch (err) {
          console.error('Sequential program check failed (ignored):', err);
        }
      }

      const { data: enrollment } = await supabase.from('course_enrollments').select('*')
        .eq('user_id', user.id).eq('course_id', courseId).single();

      // Auto-enroll: if the student isn't enrolled yet, enroll them silently.
      if (!enrollment && courseData) {
        if (!previewMode) {
          await supabase.from('course_enrollments').insert([{ user_id: user.id, course_id: courseId }]);
        }
        setIsEnrolled(true);
      } else {
        setIsEnrolled(!!enrollment);
      }

      const { data: lessonsData } = await supabase.from('lessons').select('*')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);

        // Fetch progress BEFORE picking the initial lesson so we can auto-resume
        // at the first incomplete lesson.
        const progressMap: Record<string, ProgressType> = {};
        if (enrollment && lessonsData.length > 0) {
          const { data: progressData } = await supabase.from('progress').select('*')
            .eq('user_id', user.id).in('lesson_id', lessonsData.map(l => l.id));
          if (progressData) {
            progressData.forEach(p => { progressMap[p.lesson_id] = p; });
            setProgress(progressMap);
          }
        }

        if (lessonsData.length > 0 && !selectedLesson) {
          // Open the editor-requested lesson if provided; otherwise auto-resume at
          // the first incomplete lesson (falls back to the first lesson when all
          // are complete or no progress exists). Only applies on initial load —
          // user/embedded navigation afterwards is untouched.
          const initial = initialLessonId
            ? lessonsData.find(l => l.id === initialLessonId)
            : lessonsData.find(l => !progressMap[l.id]?.completed);
          setSelectedLesson(initial ?? lessonsData[0]);
        }

        const lessonIds = lessonsData.map(l => l.id);
        if (lessonIds.length > 0) {
          // Secondary tiebreaker on `created_at` — some imported lessons have blocks
          // sharing the same order_index; without a deterministic secondary key, Postgres
          // doesn't guarantee stable ordering for ties, which could scramble reading order.
          // `created_at` (insertion order) approximates the authored/import order far
          // better than `id` (a random UUID with no relation to sequence).
          const { data: blocksData } = await supabase.from('lesson_blocks').select('*')
            .in('lesson_id', lessonIds).order('order_index', { ascending: true }).order('created_at', { ascending: true });

          if (blocksData) {
            const grouped: Record<string, LessonBlock[]> = {};
            for (const block of blocksData as LessonBlock[]) {
              if (!grouped[block.lesson_id]) grouped[block.lesson_id] = [];
              grouped[block.lesson_id].push(block);
            }
            Object.keys(grouped).forEach(id => { grouped[id] = sortBlocks(grouped[id]); });
            setLessonBlocks(grouped);
          }

          // Fetch slides to know their order and settings within each lesson
          const { data: slidesData } = await supabase
            .from('slides')
            .select('id, lesson_id, order_index, title, settings, slide_type, canvas_data')
            .in('lesson_id', lessonIds)
            .is('deleted_at', null)
            .order('order_index', { ascending: true });

          if (slidesData) {
            const groupedSlides: Record<string, Array<{ id: string; order_index: number; title?: string | null; settings?: SlideSettings; slide_type?: string; canvas_data?: Record<string, unknown> | null }>> = {};
            for (const slide of slidesData as Array<{ id: string; lesson_id: string; order_index: number; title?: string | null; settings?: SlideSettings; slide_type?: string; canvas_data?: Record<string, unknown> | null }>) {
              if (!groupedSlides[slide.lesson_id]) groupedSlides[slide.lesson_id] = [];
              groupedSlides[slide.lesson_id].push({ id: slide.id, order_index: slide.order_index, title: slide.title, settings: slide.settings, slide_type: slide.slide_type, canvas_data: slide.canvas_data });
            }
            setLessonSlidesMap(groupedSlides);
          }

          const { data: quizzesData } = await supabase.from('quizzes').select('lesson_id').in('lesson_id', lessonIds);
          if (quizzesData) {
            const qm: Record<string, boolean> = {};
            quizzesData.forEach(q => { qm[q.lesson_id] = true; });
            setLessonQuizzes(qm);
          }

          // Rehydrate the quiz gate from persisted answers. Correct answers are
          // upserted to quiz_block_responses as the student plays, but the gate
          // state (correctQuizBlocks) was memory-only — after a reload, revisiting
          // a lesson demanded quizzes the student had already passed.
          if (user) {
            const { data: pastAnswers } = await supabase
              .from('quiz_block_responses')
              .select('lesson_id, block_id')
              .eq('user_id', user.id)
              .eq('is_correct', true)
              .in('lesson_id', lessonIds);
            if (pastAnswers && pastAnswers.length > 0) {
              setCorrectQuizBlocks(prev => {
                const next = { ...prev };
                for (const row of pastAnswers as { lesson_id: string; block_id: string }[]) {
                  const set = new Set(next[row.lesson_id] ?? []);
                  set.add(row.block_id);
                  next[row.lesson_id] = set;
                }
                return next;
              });
            }
          }
        }
      }

      // (Progress is fetched above, before initial lesson selection.)

      // Completion feedback survey — resolve course + program surveys via centralized assignment logic
      try {
        const resolved = user
          ? await resolveCompletionSurveys(supabase, courseId, user.id)
          : { course: null, program: null };

        // Course-level survey
        const fbTemplateId = resolved.course?.templateId ?? null;
        const fbTemplate = resolved.course?.template ?? null;
        setFeedbackTemplateId(fbTemplateId);
        setFeedbackTemplate(fbTemplate);
        if (fbTemplate && user) {
          const existing = await getMyCourseFeedback(supabase, courseId, user.id);
          if (existing) setFeedbackSubmitted(true);
        }

        // Program-level survey
        if (resolved.program && user) {
          setProgramSurvey(resolved.program);
          const existingProg = await getMyProgramFeedback(supabase, resolved.program.programId, user.id).catch(() => null);
          if (existingProg) setProgramFeedbackSubmitted(true);
        }
      } catch (surveyErr) {
        // Survey resolution failures must never break completion — log and continue
        console.error('Survey resolution error (non-fatal):', surveyErr);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setPageLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleMarkComplete = useCallback(async () => {
    if (!selectedLesson) return;
    // Redoing a completed lesson is a pure no-op: without this guard the upsert
    // below OVERWRITES the original completed_at on every revisit (clobbering
    // completion history — including backdated legacy-import dates), re-fires the
    // "Progress saved" toast, and re-calls the certificate RPC. Only an admin
    // reset (which deletes the progress row) makes a lesson completable again.
    if (!previewMode && progress[selectedLesson.id]?.completed === true) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Course-completion gate: when this is the final lesson and a completion
    // survey is required but not yet submitted, withhold completion AND the
    // certificate. The completion slide shows the survey CTA; the dedicated
    // survey page finalizes completion (marks the final lesson + issues the cert)
    // on submit. Already-completed learners pass (feedbackSubmitted or an existing
    // cert make the gate inert), so they are grandfathered.
    const isFinalLesson = lessons.length > 0 && lessons[lessons.length - 1]?.id === selectedLesson.id;
    const surveyGatePending = Boolean(
      course?.completion_survey_required && feedbackTemplate && !feedbackSubmitted,
    );
    if (!previewMode && isFinalLesson && surveyGatePending) return;
    try {
      // Always update local state so sidebar checkmarks appear even in preview mode
      const updatedProgress = { ...progress, [selectedLesson.id]: {
        id: '', user_id: user.id, lesson_id: selectedLesson.id,
        completed: true, completed_at: new Date().toISOString(),
      }};
      setProgress(updatedProgress);

      // Skip DB writes in preview mode
      if (!previewMode) {
        const { error } = await supabase.from('progress').upsert([{
          user_id: user.id, lesson_id: selectedLesson.id,
          completed: true, completed_at: new Date().toISOString(),
        }], { onConflict: 'user_id,lesson_id' });
        if (error) throw error;
        toast.success('Progress saved', { duration: 2000 });

        const allCompleted = lessons.every(l => updatedProgress[l.id]?.completed);
        if (allCompleted && lessons.length > 0) {
          // Server-verified issuance (migration 036): the RPC re-checks lesson
          // completion and resolves the template (course → institution default).
          const { data: certData, error: certError } = await supabase
            .rpc('issue_course_certificate', { p_course_id: courseId });
          if (certError) {
            toast.error('Your certificate could not be issued', { description: certError.message });
          } else if (certData?.certificate_id && !certData.already_issued) {
            const certId = certData.certificate_id as string;
            // Pre-generate PDF (fire-and-forget)
            fetch(`/api/certificates/${certId}/pdf`).catch(() => {});
            // Email the student their certificate (fire-and-forget; no-op if SMTP unconfigured)
            fetch('/api/notify/certificate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ certificateId: certId }),
            }).catch(() => {});
            // Reveal the actual certificate in the celebration overlay
            const display = await fetchCertificateDisplay(supabase, certId);
            setCelebration(
              display ?? {
                certificateId: certId,
                template: null,
                data: {
                  student_name: '',
                  completion_date: '',
                  certificate_number: certData.certificate_number ?? '',
                  institution_name: '',
                },
                courseTitle: course?.title ?? 'this course',
              },
            );
          }
        }
        // Re-fetch progress silently (no jarring page refresh — local state already updated above)
        const lessonIds = lessons.map(l => l.id);
        if (lessonIds.length > 0) {
          const { data: progressData } = await supabase.from('progress').select('*')
            .eq('user_id', user.id).in('lesson_id', lessonIds);
          if (progressData) {
            const pm: Record<string, ProgressType> = {};
            progressData.forEach(p => { pm[p.lesson_id] = p; });
            setProgress(pm);
          }
        }
      }
    } catch (err: any) {
      toast.error('Failed to mark lesson as complete', { description: err.message });
    }
  }, [selectedLesson, progress, lessons, courseId, previewMode, course, feedbackTemplate, feedbackSubmitted]);


  const openReviewModal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('course_reviews').select('id, rating, review_text')
      .eq('course_id', courseId).eq('user_id', user.id).single();
    if (data) {
      setExistingReviewId(data.id);
      setReviewRating(data.rating);
      setReviewText(data.review_text || '');
    } else {
      setExistingReviewId(null);
      setReviewRating(0);
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setReviewLoading(true);
    try {
      if (existingReviewId) {
        const { error } = await supabase.from('course_reviews').update({
          rating: reviewRating, review_text: reviewText, updated_at: new Date().toISOString(),
        }).eq('id', existingReviewId);
        if (error) throw error;
        toast.success('Review updated!');
      } else {
        const { error } = await supabase.from('course_reviews').insert([{
          course_id: courseId, user_id: user.id, rating: reviewRating, review_text: reviewText,
        }]);
        if (error) throw error;
        toast.success('Review submitted! Thank you.');
      }
      setShowReviewModal(false);
    } catch (err: any) {
      toast.error('Failed to submit review', { description: err.message });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackTemplate || !feedbackTemplateId) return;

    // previewMode: show confirmation without writing to DB
    if (previewMode) {
      setFeedbackSubmitted(true);
      toast.success('Feedback preview submitted (not saved)');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !course?.institution_id) {
      toast.error('You must be signed in to submit feedback');
      return;
    }

    setFeedbackSubmitting(true);
    const { error } = await upsertCourseFeedbackResponse(supabase, {
      institutionId: course.institution_id,
      courseId,
      userId: user.id,
      templateId: feedbackTemplateId,
      answers: feedbackAnswers,
    });
    setFeedbackSubmitting(false);

    if (error) {
      toast.error('Failed to submit feedback', { description: error });
      return;
    }
    setFeedbackSubmitted(true);
    toast.success('Thanks for your feedback!');
  };

  const handleSubmitProgramFeedback = async () => {
    if (!programSurvey) return;

    if (previewMode) {
      setProgramFeedbackSubmitted(true);
      toast.success('Program survey preview submitted (not saved)');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !course?.institution_id) {
      toast.error('You must be signed in to submit feedback');
      return;
    }

    setProgramFeedbackSubmitting(true);
    try {
      const { error } = await upsertCourseFeedbackResponse(supabase, {
        institutionId: course.institution_id,
        courseId,
        userId: user.id,
        templateId: programSurvey.templateId,
        answers: programFeedbackAnswers,
        programId: programSurvey.programId,
      });
      if (error) {
        toast.error('Failed to submit program survey', { description: error });
        return;
      }
      setProgramFeedbackSubmitted(true);
      toast.success('Program survey submitted. Thank you!');
    } catch (err: any) {
      toast.error('Failed to submit program survey', { description: err.message });
    } finally {
      setProgramFeedbackSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Slide helpers — group blocks by slide_id, ordered by slide order_index
  // ---------------------------------------------------------------------------
  const currentSlides: Slide[] = React.useMemo(() => {
    if (!selectedLesson) return [];

    const allBlocks = lessonBlocks[selectedLesson.id] ?? [];
    const slides = lessonSlidesMap[selectedLesson.id] ?? [];

    let pageSlides: Array<{ kind: 'page'; slideId: string; slideTitle?: string | null; blocks: LessonBlock[]; settings?: SlideSettings; slideType?: string; canvasData?: Record<string, unknown> | null }> = [];

    if (slides.length > 0 && allBlocks.some(b => b.slide_id)) {
      // Group blocks by slide_id, then order slides by their order_index
      const blocksBySlide: Record<string, LessonBlock[]> = {};
      for (const block of allBlocks) {
        const sid = block.slide_id ?? '__no_slide__';
        if (!blocksBySlide[sid]) blocksBySlide[sid] = [];
        blocksBySlide[sid].push(block);
      }
      const sortedSlides = [...slides].sort((a, b) => a.order_index - b.order_index);
      pageSlides = sortedSlides
        .filter(s => s.slide_type === 'canvas' || (blocksBySlide[s.id]?.length ?? 0) > 0)
        .map(s => ({ kind: 'page' as const, slideId: s.id, slideTitle: s.title, blocks: sortBlocks(blocksBySlide[s.id] ?? []), settings: s.settings, slideType: s.slide_type, canvasData: s.canvas_data }));

      // Any blocks without a slide_id get appended as a final page
      if (blocksBySlide['__no_slide__']?.length) {
        pageSlides.push({ kind: 'page' as const, slideId: '', blocks: sortBlocks(blocksBySlide['__no_slide__']) });
      }
    } else if (allBlocks.length > 0) {
      // No slide metadata — treat all blocks as a single page (legacy fallback)
      pageSlides = [{ kind: 'page' as const, slideId: '', blocks: sortBlocks(allBlocks) }];
    } else {
      // Absolute fallback — synthesise a block from lesson content
      pageSlides = [{ kind: 'page' as const, slideId: '', blocks: [createFallbackBlockFromLesson(selectedLesson)] }];
    }

    return [{ kind: 'title' }, ...pageSlides, { kind: 'completion' }];
  }, [selectedLesson, lessonBlocks, lessonSlidesMap]);

  const totalSlides = currentSlides.length;
  const currentSlideData = currentSlides[currentSlide] ?? null;

  // Course-level theme defaults (header colours, default block style + background).
  const theme = React.useMemo(
    () => asCourseTheme((course as { theme_settings?: unknown } | null)?.theme_settings),
    [course],
  );

  // Institution (global) theme layer. Re-fetched when the tab regains focus/visibility
  // so a global theme change saved in another tab applies without a hard reload.
  useEffect(() => {
    const instId = course?.institution_id;
    if (!instId) return;
    let cancelled = false;
    const fetchTheme = () => {
      supabase.from('institutions').select('theme').eq('id', instId).maybeSingle()
        .then(({ data }) => { if (!cancelled) setInstitutionTheme(asInstitutionTheme(data?.theme)); });
    };
    fetchTheme();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchTheme(); };
    window.addEventListener('focus', fetchTheme);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', fetchTheme);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [course?.institution_id, supabase]);

  // Effective theme = course override → institution → branding fallback.
  const effectiveTheme = React.useMemo(
    () => resolveEffectiveTheme({ course: theme, institution: institutionTheme, branding: getInstitutionBranding(institutionSlug) }),
    [theme, institutionTheme, institutionSlug],
  );

  // Report current location (lesson + DB slide id) so a parent can build an
  // "Open Editor" link that resumes on the slide the admin was viewing.
  // Deps are primitives only; the parent's callback must be stable (useCallback)
  // to avoid a render loop.
  const currentPage = currentSlides[currentSlide];
  const currentPageSlideId = currentPage?.kind === 'page' ? (currentPage.slideId || null) : null;
  useEffect(() => {
    if (!onLocationChange) return;
    onLocationChange(selectedLesson?.id ?? null, currentPageSlideId);
  }, [selectedLesson?.id, currentPageSlideId, onLocationChange]);

  // One-time jump to the editor-requested slide. Must wait until ALL lesson data
  // has loaded (pageLoading === false) — otherwise the effect fires on the
  // synthesized fallback slides during the initial render passes of fetchData,
  // consumes its one-shot guard, and never retries once real slides arrive.
  useEffect(() => {
    if (appliedInitialSlideRef.current) return;
    if (pageLoading) return;
    if (!selectedLesson) return;
    if (initialLessonId && selectedLesson.id !== initialLessonId) return;

    if (!initialSlideId) {
      appliedInitialSlideRef.current = true;
      return;
    }

    const idx = currentSlides.findIndex(s => s.kind === 'page' && s.slideId === initialSlideId);
    if (idx === -1) return;

    appliedInitialSlideRef.current = true;
    if (idx > 0) {
      navDirection.current = 'forward';
      setCurrentSlide(idx);
    }
  }, [pageLoading, selectedLesson, currentSlides, initialLessonId, initialSlideId]);

  // Embedded device-frame: the editor center posts `preview-navigate` when the
  // admin selects a different slide, so the in-frame viewer follows the selection
  // WITHOUT reloading the iframe. Same-lesson jumps are instant; cross-lesson
  // selects the lesson then a pending-ref consumes the jump once slides rebuild.
  useEffect(() => {
    if (!embedded) return;
    function onNavigate(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== 'preview-navigate') return;
      const targetSlideId: string | null = e.data.slideId ?? null;
      if (!targetSlideId) { setCurrentSlide(0); return; } // lesson/title slide
      let targetLesson = selectedLesson;
      const inCurrent = targetLesson && (lessonSlidesMap[targetLesson.id] ?? []).some(s => s.id === targetSlideId);
      if (!inCurrent) {
        targetLesson = lessons.find(l => (lessonSlidesMap[l.id] ?? []).some(s => s.id === targetSlideId)) ?? targetLesson;
      }
      if (targetLesson && targetLesson.id !== selectedLesson?.id) {
        pendingNavigateRef.current = targetSlideId;
        setSelectedLesson(targetLesson);
        setCurrentSlide(0);
      } else {
        const idx = currentSlides.findIndex(s => s.kind === 'page' && s.slideId === targetSlideId);
        if (idx > 0) setCurrentSlide(idx);
      }
    }
    window.addEventListener('message', onNavigate);
    return () => window.removeEventListener('message', onNavigate);
  }, [embedded, selectedLesson, lessons, lessonSlidesMap, currentSlides]);

  // Consume a pending cross-lesson navigation once the new lesson's slides exist
  useEffect(() => {
    const target = pendingNavigateRef.current;
    if (!target) return;
    const idx = currentSlides.findIndex(s => s.kind === 'page' && s.slideId === target);
    if (idx >= 0) {
      pendingNavigateRef.current = null;
      setCurrentSlide(idx > 0 ? idx : 0);
    }
  }, [currentSlides]);

  // Navigation state — uses tested utility for consistency
  const navState = computeNavState(
    currentSlides.map(s => ({ kind: s.kind, settings: s.kind === 'page' ? s.settings : undefined })),
    currentSlide,
  );
  const { isFirstSlide, isLastSlide, isCompletionSlide, isLastContentSlide, navLabel, navUrl } = navState;

  const nextLesson = React.useMemo(() => {
    if (!selectedLesson) return null;
    return findNextLesson(lessons, selectedLesson.id);
  }, [selectedLesson, lessons]);
  const hasQuiz = selectedLesson ? !!lessonQuizzes[selectedLesson.id] : false;

  // Final-lesson survey gate (display flags). Mirrors the withhold condition in
  // handleMarkComplete so the completion slide + footer can message it clearly.
  const isLastLesson =
    !!selectedLesson && lessons.length > 0 && lessons[lessons.length - 1]?.id === selectedLesson.id;
  const surveyGatePendingUI = Boolean(
    isLastLesson && course?.completion_survey_required && feedbackTemplate && !feedbackSubmitted,
  );

  // Quiz gating: count inline quiz blocks for current lesson and check if all answered correctly
  const handleQuizCorrect = useCallback((blockId: string) => {
    if (!selectedLesson) return;
    setCorrectQuizBlocks(prev => {
      const existing = prev[selectedLesson.id] ?? new Set();
      if (existing.has(blockId)) return prev;
      const next = new Set(existing);
      next.add(blockId);
      return { ...prev, [selectedLesson.id]: next };
    });
  }, [selectedLesson]);

  const handleBlockComplete = useCallback((blockId: string) => {
    if (!selectedLesson) return;
    setCompletedInteractiveBlocks(prev => {
      const existing = prev[selectedLesson.id] ?? new Set();
      if (existing.has(blockId)) return prev;
      const next = new Set(existing);
      next.add(blockId);
      return { ...prev, [selectedLesson.id]: next };
    });
  }, [selectedLesson]);

  // Ref so blockContext (declared before goNext) can trigger slide advance from a block.
  const goNextRef = useRef<() => void>(() => {});

  const blockContext = React.useMemo<BlockViewerContext>(() => ({
    courseId,
    lessonId: selectedLesson?.id,
    institutionId: course?.institution_id ?? undefined,
    previewMode,
    theme: effectiveTheme,
    onAutoAdvance: () => goNextRef.current(),
  }), [courseId, selectedLesson?.id, course?.institution_id, previewMode, effectiveTheme]);

  // Only gate on quiz blocks with an interactive question type.
  // Blocks with null/unknown types render a non-interactive placeholder and can never
  // fire onComplete, so including them would permanently block lesson completion.
  // We ALSO exclude misconfigured quizzes (correct answer matches no option, empty, etc.):
  // such a quiz can never fire onCorrect, so gating on it would brick the lesson. The
  // editor surfaces these to admins so the content can be fixed (see quiz-inline/validation).
  // Sourced from currentSlides (not the raw block list) so the gate covers EXACTLY the
  // blocks the student can see: a quiz on a soft-deleted or draft-hidden slide never
  // renders (blocks survive slide deletion; RLS hides non-published slides), so gating
  // on it would brick the lesson — while quizzes shown via the no-slide fallback pages
  // still count.
  // Only REQUIRED quizzes gate (data.required, editor toggle "Required to continue";
  // default true preserves historical behavior; explicit false = practice quiz).
  const isGatingQuizBlock = React.useCallback((b: LessonBlock) =>
    b.block_type === 'quiz_inline' &&
    b.data?.required !== false &&
    isGatedQuizType(b.data?.question_type as string) &&
    isQuizSatisfiable(b.data as Partial<QuizInlineData>), []);

  const currentLessonQuizBlockIds = React.useMemo(() => {
    if (!selectedLesson) return [];
    return currentSlides
      .flatMap(s => (s.kind === 'page' ? s.blocks : []))
      .filter(isGatingQuizBlock)
      .map(b => b.id);
  }, [selectedLesson, currentSlides, isGatingQuizBlock]);

  // A lesson the student already completed never re-gates: quiz-correct state lives
  // in memory + quiz_block_responses, but the authoritative fact is the progress row —
  // without this, revisiting a finished lesson after a reload showed a disabled
  // "Next Lesson" button demanding quizzes the student had already passed.
  const lessonAlreadyCompleted = !!selectedLesson && progress[selectedLesson.id]?.completed === true;

  const allQuizzesComplete = lessonAlreadyCompleted ||
    currentLessonQuizBlockIds.length === 0 ||
    currentLessonQuizBlockIds.every(id => correctQuizBlocks[selectedLesson?.id ?? '']?.has(id));

  const currentSlideRequiredBlockIds = React.useMemo(() => {
    const slide = currentSlides[currentSlide];
    if (!slide || slide.kind !== 'page') return [];
    return slide.blocks
      .filter(b => b.block_type === 'image_gallery' && b.data?.requireAllClicked === true)
      .map(b => b.id);
  }, [currentSlides, currentSlide]);

  const allInteractiveBlocksComplete = currentSlideRequiredBlockIds.length === 0 ||
    currentSlideRequiredBlockIds.every(id => completedInteractiveBlocks[selectedLesson?.id ?? '']?.has(id));

  // Required quizzes gate Next on THEIR OWN slide (not just at the completion slide) —
  // otherwise students skip ahead, reach the final slide, and are confused about why
  // they can't complete the module. Bypassed for already-completed lessons.
  const currentSlideQuizBlockIds = React.useMemo(() => {
    const slide = currentSlides[currentSlide];
    if (!slide || slide.kind !== 'page') return [];
    return slide.blocks.filter(isGatingQuizBlock).map(b => b.id);
  }, [currentSlides, currentSlide, isGatingQuizBlock]);

  const currentSlideQuizzesComplete = lessonAlreadyCompleted ||
    currentSlideQuizBlockIds.length === 0 ||
    currentSlideQuizBlockIds.every(id => correctQuizBlocks[selectedLesson?.id ?? '']?.has(id));

  // Gate: unanswered required quiz on this slide, required images unopened, or
  // reaching the completion slide with any lesson quiz still unanswered (backstop
  // for quizzes skipped via sidebar/keyboard navigation).
  const nextSlideIsCompletion = currentSlides[currentSlide + 1]?.kind === 'completion';
  const nextBlocked =
    (nextSlideIsCompletion && !allQuizzesComplete) ||
    !allInteractiveBlocksComplete ||
    !currentSlideQuizzesComplete;

  const nextBlockedHint = React.useMemo(() => {
    if (!nextBlocked) return null;
    if (!allInteractiveBlocksComplete && selectedLesson) {
      const remaining = currentSlideRequiredBlockIds.filter(
        id => !completedInteractiveBlocks[selectedLesson.id]?.has(id),
      ).length;
      if (remaining > 0) {
        return `Open every required image on this slide (${remaining} block${remaining === 1 ? '' : 's'} remaining).`;
      }
      return 'Open every required image on this slide before continuing.';
    }
    if (!currentSlideQuizzesComplete) {
      return 'Answer the quiz on this slide correctly to continue.';
    }
    if (nextSlideIsCompletion && !allQuizzesComplete) {
      return 'Answer all quiz questions correctly before completing this lesson.';
    }
    return null;
  }, [
    nextBlocked,
    allInteractiveBlocksComplete,
    currentSlideQuizzesComplete,
    nextSlideIsCompletion,
    allQuizzesComplete,
    selectedLesson,
    currentSlideRequiredBlockIds,
    completedInteractiveBlocks,
  ]);

  // Persistent, ALWAYS-VISIBLE reason the primary footer action is disabled.
  // NavButtonWithHint's tooltip is hover-only (group-hover:opacity-100) — invisible on
  // touch devices, which is why students report the button being "greyed out with no
  // provided reason." This banner never depends on hover/focus so it's visible on any
  // device. Also covers the completion-slide "Next Lesson" button, which previously had
  // no hint mechanism at all.
  const footerBlockedHint = React.useMemo(() => {
    if (isCompletionSlide) {
      return nextLesson && !allQuizzesComplete
        ? 'Answer all quiz questions correctly in this lesson before continuing to the next lesson.'
        : null;
    }
    return nextBlocked ? nextBlockedHint : null;
  }, [isCompletionSlide, nextLesson, allQuizzesComplete, nextBlocked, nextBlockedHint]);

  // Restore interactive completion when a block remounts with persisted progress (e.g. image gallery sessionStorage)
  useEffect(() => {
    if (!selectedLesson) return;
    const slide = currentSlides[currentSlide];
    if (!slide || slide.kind !== 'page') return;
    const completed = completedInteractiveBlocks[selectedLesson.id] ?? new Set<string>();
    for (const block of slide.blocks) {
      if (block.block_type !== 'image_gallery' || !block.data?.requireAllClicked) continue;
      if (completed.has(block.id)) continue;
      const imageCount = Array.isArray(block.data?.images)
        ? (block.data.images as unknown[]).filter((i) => (i as { url?: string })?.url).length
        : 0;
      if (imageCount === 0) continue;
      try {
        const raw = sessionStorage.getItem(viewedImagesStorageKey(selectedLesson.id, block.id));
        if (!raw) continue;
        const viewed = JSON.parse(raw) as unknown;
        if (Array.isArray(viewed) && viewed.length >= imageCount) {
          handleBlockComplete(block.id);
        }
      } catch {
        // ignore parse / storage errors
      }
    }
  }, [selectedLesson, currentSlide, currentSlides, completedInteractiveBlocks, handleBlockComplete]);

  const goNext = useCallback(() => {
    navDirection.current = 'forward';
    if (nextBlocked) return;
    setCurrentSlide(i => Math.min(i + 1, totalSlides - 1));
  }, [totalSlides, nextBlocked]);
  goNextRef.current = goNext;
  const goPrev = useCallback(() => {
    navDirection.current = 'backward';
    setCurrentSlide(i => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation (goNext already respects nextBlocked)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // While the lesson menu is open, Escape closes it and arrows don't move slides.
      if (lessonMenuOpen) {
        if (e.key === 'Escape') setLessonMenuOpen(false);
        return;
      }
      if (!selectedLesson) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLesson, goNext, goPrev, lessonMenuOpen]);

  // Auto-mark complete when completion slide reached (only if all quizzes done)
  useEffect(() => {
    if (!selectedLesson) return;
    if (currentSlideData?.kind !== 'completion') return;
    if (progress[selectedLesson.id]?.completed) return;
    if (autoCompleteFired[selectedLesson.id]) return;
    if (!allQuizzesComplete) return;
    setAutoCompleteFired(prev => ({ ...prev, [selectedLesson.id]: true }));
    handleMarkComplete();
  }, [currentSlide, selectedLesson?.id, allQuizzesComplete]);

  // Confetti when completion slide is first shown per lesson
  useEffect(() => {
    if (!selectedLesson) return;
    if (currentSlideData?.kind !== 'completion') {
      setShowConfetti(false);
      return;
    }
    if (confettiFiredRef.current[selectedLesson.id]) return;
    confettiFiredRef.current[selectedLesson.id] = true;
    setShowConfetti(true);
    // Auto-dismiss after animation completes (~3.5s max)
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [currentSlide, selectedLesson?.id, currentSlideData?.kind]);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  const outerHeightClass = isFullscreen || embedded
    ? 'h-screen'                 // embedded in a device-frame iframe — fill it
    : previewMode
      ? 'h-[calc(100vh-3rem)]'   // 3rem = 48px preview banner (h-12)
      : 'h-screen';              // LessonNavbar is inside the component now

  if (pageLoading) {
    return (
      <div className={`${outerHeightClass} flex flex-col overflow-hidden`}>
        <div className="shrink-0 h-16 bg-slate-200 animate-pulse" />
        <div className="flex-1 min-h-0 flex gap-3 p-3">
          <div className="hidden lg:flex flex-col gap-2 w-[260px] shrink-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-xl" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-xl" />
            <div className="flex-1 bg-slate-100 animate-pulse rounded-2xl" />
            <div className="shrink-0 flex justify-between">
              <div className="h-10 w-28 bg-slate-200 animate-pulse rounded-xl" />
              <div className="h-10 w-28 bg-slate-200 animate-pulse rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Course not found.</p>
          <Button onClick={() => router.push(withInstitutionPath('/student', pathname))}>Back to Courses</Button>
        </CardContent></Card>
      </div>
    );
  }

  // Sequential program lock — show a locked panel instead of the course content
  if (lockedReason) {
    return (
      <div className={`${outerHeightClass} flex items-center justify-center bg-[#F8FAFC] p-6`}>
        <Card className="max-w-md w-full border-none shadow-md">
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900">This course is locked</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Complete <span className="font-semibold text-slate-700">{lockedReason}</span> first to unlock
                {course?.title ? <> &quot;{course.title}&quot;</> : ' this course'}.
              </p>
            </div>
            <Button
              className="mt-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold"
              onClick={() => router.push(withInstitutionPath('/student', pathname))}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auto-enrollment is handled in fetchData; we never gate on enrollment here.

  // Only count progress for lessons in this course
  const lessonIdSet = new Set(lessons.map(l => l.id));
  const completedCount = Math.min(
    Object.entries(progress).filter(([id, p]) => p.completed && lessonIdSet.has(id)).length,
    lessons.length,
  );
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  function getSlideAnimation(transition?: string, direction: 'forward' | 'backward' = 'forward'): string {
    switch (transition) {
      case 'slide-horizontal':
        return direction === 'forward'
          ? 'slideFromRight 0.3s ease-out'
          : 'slideFromLeft 0.3s ease-out';
      case 'fade-up':
        return 'fadeUp 0.2s ease-out';
      case 'crossfade':
      default:
        return 'crossfade 0.3s ease-out';
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={`${outerHeightClass} flex flex-col overflow-hidden bg-[#F8FAFC]`}>

      {/* ── Slim Lesson Navbar ─────────────────────────────────────────────── */}
      {!previewMode && (
        <LessonNavbar
          courseTitle={course?.title ?? ''}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
        />
      )}
      {!previewMode && <ShortcutHint />}

      {/* Fullscreen toggle is now in the slide top bar next to slide counter */}

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{existingReviewId ? 'Update Your Review' : 'Leave a Review'}</DialogTitle>
            <DialogDescription>Share your experience with &quot;{course.title}&quot;</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Your Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    className="cursor-pointer hover:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded">
                    <Star className={`h-7 w-7 ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="What did you find most valuable? (optional)"
              value={reviewText} onChange={e => setReviewText(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={reviewLoading}>
              {reviewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {existingReviewId ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Certificate Earned Celebration ───────────────────────────────── */}
      <CertificateCelebration
        open={!!celebration}
        display={celebration}
        onClose={() => setCelebration(null)}
        institutionSlug={resolveInstitutionSlug(pathname)}
        onViewCertificates={() => {
          setCelebration(null);
          router.push(withInstitutionPath('/student/certificates', pathname));
        }}
      />

      {/* ── Compact course header (hidden in fullscreen) ─────────────────── */}
      {!isFullscreen && (
        <div className="bg-[#0F172A] px-4 sm:px-6 lg:px-8 py-2 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white truncate flex-1">{course.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-32 bg-white/20 rounded-full h-1.5"
                role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}
                aria-label="Overall course progress">
                <div className="bg-[#0099CA] h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="text-xs font-bold text-white">{progressPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 sm:p-4 overflow-hidden">

        {/* Mobile lesson selection now lives in a glass modal opened from the footer
            hamburger — frees the vertical space the old dropdown consumed. */}

        {/* "Show Lessons" toggle — desktop only, when sidebar collapsed */}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            aria-label="Show lessons sidebar"
            className="hidden lg:flex items-center gap-1.5 shrink-0 self-start mt-1 text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded">
            <ChevronRight className="h-4 w-4" />Lessons
          </button>
        )}

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <div className="hidden lg:flex flex-col shrink-0 min-h-0" style={{ width: '260px' }}>
            <Card className="flex flex-col h-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white">
              <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-slate-100 shrink-0">
                <CardTitle className="text-base font-black text-slate-900">Lessons</CardTitle>
                <button onClick={() => setSidebarOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors rounded focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2" aria-label="Collapse sidebar">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div role="list" aria-label="Course lessons" className="h-full overflow-y-auto divide-y divide-slate-100">
                  {lessons.map(lesson => (
                    <button key={lesson.id} role="listitem" onClick={() => selectLesson(lesson)}
                      aria-current={selectedLesson?.id === lesson.id ? 'true' : undefined}
                      aria-label={`${lesson.title}${progress[lesson.id]?.completed ? ' (completed)' : ''}`}
                      className={`w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset ${
                        selectedLesson?.id === lesson.id
                          ? 'bg-blue-50 text-[#1E3A5F] border-l-2 border-[#1E3A5F]'
                          : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                      }`}
                    >
                      {progress[lesson.id]?.completed
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                      <span className="text-sm font-medium leading-snug">{lesson.title}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Slide viewer */}
        <div className="flex-1 min-h-0 max-w-5xl mx-auto w-full">
          <Card className="flex flex-col h-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-white overflow-hidden">
            {selectedLesson ? (
              <div className="flex flex-col h-full">

                {/* Top bar: lesson eyebrow + slide title (prominent) + counter + progress bar */}
                <div className="px-5 pt-3 pb-3 shrink-0 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      {/* Lesson title = small eyebrow / kicker */}
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider block break-words leading-tight"
                        style={{ color: effectiveTheme.lessonTitleColor }}
                      >
                        {selectedLesson.title}
                      </span>
                      {/* Slide title = the prominent headline */}
                      {currentSlideData?.kind === 'page' && currentSlideData.slideTitle && (
                        <span
                          className="text-lg sm:text-xl font-black block break-words leading-tight mt-0.5"
                          style={{ color: (currentSlideData.settings?.title_color as string) || effectiveTheme.slideTitleColor }}
                        >
                          {currentSlideData.slideTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span className="text-sm font-bold tabular-nums" style={{ color: effectiveTheme.numberColor }}>
                        {currentSlide + 1} / {totalSlides}
                      </span>
                      <button
                        onClick={() => setIsFullscreen(prev => !prev)}
                        className="p-1 text-slate-400 hover:text-[#1E3A5F] transition-colors rounded"
                        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Toggle fullscreen (F)'}
                      >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="w-full rounded-full h-[3px]"
                    style={{ backgroundColor: effectiveTheme.progressTrackColor }}
                    role="progressbar" aria-valuenow={Math.round(((currentSlide + 1) / totalSlides) * 100)} aria-valuemin={0} aria-valuemax={100}
                    aria-label="Slide progress">
                    <div className="h-[3px] rounded-full transition-all duration-300"
                      style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%`, backgroundColor: effectiveTheme.progressColor }} />
                  </div>
                </div>

                {/* Slide content — fills remaining, scrolls internally */}
                <div
                  key={`${selectedLesson.id}-${currentSlide}`}
                  role="region" aria-label="Slide content"
                  className="flex-1 overflow-hidden flex flex-col"
                  style={{
                    animation: getSlideAnimation(
                      currentSlideData?.kind === 'page' ? (currentSlideData.settings?.transition as string) : undefined,
                      navDirection.current,
                    ),
                  }}
                >

                  {/* TITLE SLIDE — full-height, non-scrollable */}
                  {currentSlideData?.kind === 'title' && (
                    <TitleSlide
                      lessonTitle={selectedLesson.title}
                      lessonDescription={selectedLesson.description}
                      moduleName={course?.title}
                      titleImageUrl={selectedLesson.title_image_url}
                      titleSlideSettings={selectedLesson.title_slide_settings}
                      courseDate={course?.created_at ? new Date(course.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }) : null}
                      institutionSlug={institutionSlug}
                      titleLogoUrl={effectiveTheme.titleLogoUrl}
                      gradientFrom={effectiveTheme.titleGradientFrom}
                      gradientTo={effectiveTheme.titleGradientTo}
                      defaultBackgroundImageUrl={effectiveTheme.defaultTitleBackgroundUrl}
                    />
                  )}

                  {/* CANVAS SLIDE — read-only tldraw viewer */}
                  {currentSlideData?.kind === 'page' && currentSlideData.slideType === 'canvas' && currentSlideData.canvasData ? (
                    <div className="flex-1 min-h-0">
                      <CanvasSlideViewer
                        canvasData={currentSlideData.canvasData}
                        blocks={currentSlideData.blocks}
                        onQuizCorrect={handleQuizCorrect}
                      />
                    </div>
                  ) : null}

                  {/* CONTENT SLIDE — matches editor slide-preview.tsx rendering */}
                  {currentSlideData?.kind === 'page' && !(currentSlideData.slideType === 'canvas' && currentSlideData.canvasData) && (() => {
                    const bgStyle = getSlideBackground(currentSlideData.settings, effectiveTheme.defaultBackground);
                    const backgroundImage = typeof currentSlideData.settings?.background_image === 'string'
                      ? currentSlideData.settings.background_image
                      : (theme.default_background_image || null);
                    const backgroundFit = resolveSlideBackgroundFit(currentSlideData.settings?.background_fit);
                    const pages = splitBlocksIntoPages(currentSlideData.blocks);
                    const hasPages = pages.length > 1;

                    return (
                      <div className="relative flex-1 flex flex-col overflow-hidden" style={bgStyle}>
                        {backgroundImage && (
                          <div
                            className="absolute inset-0"
                            style={slideBackgroundImageStyle(backgroundImage, backgroundFit)}
                          >
                            <div className="absolute inset-0 bg-black/20" />
                          </div>
                        )}
                        <div className="relative z-10 flex-1 overflow-y-auto">
                          <SlideContentArea>
                            <GridBlockRenderer
                              blocks={hasPages ? pages[subPage] ?? pages[0] : currentSlideData.blocks}
                              lessonTitle={selectedLesson.title}
                              onQuizCorrect={handleQuizCorrect}
                              onBlockComplete={handleBlockComplete}
                              blockStyle={(currentSlideData.settings?.block_style as string | undefined) ?? effectiveTheme.defaultBlockStyle}
                              context={blockContext}
                            />
                          </SlideContentArea>
                        </div>
                        {/* Page dots — only when slide has page breaks */}
                        {hasPages && (
                          <div className="relative z-10 shrink-0 flex items-center justify-center gap-2 py-1.5 bg-white/60 backdrop-blur-sm border-t border-gray-100">
                            {pages.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setSubPage(i)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  i === subPage ? 'bg-[#1E3A5F] scale-125' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Page ${i + 1}`}
                              />
                            ))}
                            <span className="text-[10px] text-gray-400 ml-1">{subPage + 1}/{pages.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* COMPLETION SLIDE */}
                  {currentSlideData?.kind === 'completion' && (
                    <div className="relative flex flex-col items-center gap-5 sm:gap-6 flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-8 sm:pb-10">
                      {showConfetti && <Confetti />}
                      {/* Hero — centred (compact on mobile so the survey stays visible) */}
                      <div className="flex flex-col items-center text-center gap-4 sm:gap-5 w-full shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-50 flex items-center justify-center animate-bounce [animation-iteration-count:1] [animation-duration:0.8s]">
                          <Award className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            {isLastLesson ? 'Module Complete' : 'Lesson Complete'}
                          </p>
                          <h3 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">{selectedLesson.title}</h3>
                          {surveyGatePendingUI ? (
                            <p className="text-slate-600 mt-1.5 text-sm sm:text-base font-medium">
                              To receive your certificate, please complete the module survey and click{' '}
                              <span className="font-bold">Submit</span>.
                            </p>
                          ) : (
                            <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                              Congratulations! You&apos;ve completed this {isLastLesson ? 'module' : 'lesson'}.
                            </p>
                          )}
                        </div>
                        {/* Leave a Review — only on last lesson, not in preview */}
                        {!previewMode && isLastLesson && (
                          <Button variant="outline" onClick={openReviewModal}
                            className="border-yellow-400 text-yellow-700 font-bold hover:bg-yellow-50">
                            <Star className="mr-2 h-4 w-4" />Leave a Review
                          </Button>
                        )}
                      </div>

                      {/* Course completion survey — opens on a dedicated, scrollable page */}
                      {feedbackTemplate && isLastLesson && (
                        <div className="w-full max-w-xl">
                          {feedbackSubmitted ? (
                            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-800">
                              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                              Course survey complete — thank you!
                            </div>
                          ) : course?.completion_survey_required ? (
                            /* REQUIRED survey — the certificate is gated on it, so make it unmissable */
                            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 text-center shadow-sm">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Award className="h-6 w-6 text-amber-500 shrink-0" />
                                <p className="font-black text-slate-900">Your certificate is one step away</p>
                              </div>
                              <p className="text-sm text-slate-600 mt-1 mb-4">
                                Module complete! To receive your certificate, please complete the module survey
                                and click the <span className="font-bold">Submit</span> button.
                              </p>
                              <Button
                                disabled={previewMode}
                                onClick={() => router.push(withInstitutionPath(`/student/courses/${courseId}/survey`, pathname))}
                                style={{ backgroundColor: effectiveTheme.progressColor ?? '#1A3C6E' }}
                                className="font-bold text-white hover:opacity-90 h-11 px-6"
                              >
                                {previewMode ? 'Complete Module Survey (disabled in preview)' : 'Complete Module Survey'}
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            /* Optional survey — softer ask */
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                              <ClipboardList className="h-7 w-7 mx-auto mb-2" style={{ color: effectiveTheme.progressColor ?? '#1A3C6E' }} />
                              <p className="font-bold text-slate-900">Please complete this course survey</p>
                              <p className="text-sm text-slate-500 mt-1 mb-4">
                                Your feedback helps us improve this course.
                              </p>
                              <Button
                                disabled={previewMode}
                                onClick={() => router.push(withInstitutionPath(`/student/courses/${courseId}/survey`, pathname))}
                                style={{ backgroundColor: effectiveTheme.progressColor ?? '#1A3C6E' }}
                                className="font-bold text-white hover:opacity-90"
                              >
                                {previewMode ? 'Complete Course Survey (disabled in preview)' : 'Complete Course Survey'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Program survey — shown when this lesson completes a full program */}
                      {programSurvey && isLastLesson && (
                        <div className="w-full max-w-xl space-y-1">
                          <div className="flex items-center gap-2 px-1">
                            <Badge variant="outline" className="text-xs font-semibold text-purple-700 border-purple-200 bg-purple-50">
                              Program survey
                            </Badge>
                            <span className="text-xs text-slate-500">{programSurvey.programTitle}</span>
                          </div>
                          <CompletionFeedbackForm
                            template={programSurvey.template}
                            answers={programFeedbackAnswers}
                            onAnswerChange={(qId, val) => setProgramFeedbackAnswers(prev => ({ ...prev, [qId]: val }))}
                            submitted={programFeedbackSubmitted}
                            submitting={programFeedbackSubmitting}
                            onSubmit={handleSubmitProgramFeedback}
                            primaryColor="#7C3AED"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Always-visible reason the primary action below is disabled (not hover-only —
                    works on touch devices). See footerBlockedHint above. */}
                {footerBlockedHint && (
                  <div className="shrink-0 px-4 py-2 bg-amber-50 border-t border-amber-100 text-center">
                    <p className="text-xs font-semibold text-amber-800">{footerBlockedHint}</p>
                  </div>
                )}

                {/* Navigation Footer — always visible */}
                <div className="relative shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
                  {/* Left: Previous */}
                  <button
                    onClick={goPrev}
                    disabled={isFirstSlide}
                    aria-label="Previous slide"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  {/* Centre: lesson menu (mobile only) — opens the glass lesson modal */}
                  <button
                    onClick={() => setLessonMenuOpen(true)}
                    aria-label="Browse lessons"
                    aria-haspopup="dialog"
                    style={effectiveTheme.chromeAccent ? { color: effectiveTheme.chromeAccent } : undefined}
                    className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center h-11 w-11 rounded-2xl text-slate-700 bg-white/55 backdrop-blur-xl backdrop-saturate-150 border border-white/70 shadow-lg shadow-slate-900/10 ring-1 ring-black/[0.03] hover:bg-white/80 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  {/* Right: Context-dependent primary action */}
                  <div className="flex items-center gap-3">
                    {/* Take Quiz in footer when on completion slide with quizzes */}
                    {isCompletionSlide && hasQuiz && (
                      <button
                        onClick={() => selectedLesson && router.push(withInstitutionPath(`/student/courses/${courseId}/lessons/${selectedLesson.id}/quiz`, pathname))}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10 rounded-xl transition-colors"
                      >
                        <Play className="h-4 w-4" />
                        Take Quiz
                      </button>
                    )}

                    {/* Primary nav button */}
                    {isCompletionSlide ? (
                      nextLesson ? (
                        <button
                          onClick={() => selectLesson(nextLesson)}
                          disabled={!allQuizzesComplete}
                          aria-label="Next lesson"
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#1E3A5F] hover:bg-[#162d4a] rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                        >
                          Next Lesson <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : surveyGatePendingUI && !previewMode ? (
                        /* Survey gates the certificate — make it the primary footer action */
                        <button
                          onClick={() => router.push(withInstitutionPath(`/student/courses/${courseId}/survey`, pathname))}
                          aria-label="Complete module survey"
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#991B1B] rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                        >
                          Complete Module Survey <ChevronRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(withInstitutionPath('/student', pathname))}
                          aria-label="Back to dashboard"
                          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#1e293b] rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                        >
                          Back to Dashboard
                        </button>
                      )
                    ) : isLastContentSlide ? (
                      <NavButtonWithHint
                        onClick={navUrl ? () => window.open(navUrl, '_blank') : goNext}
                        disabled={!navUrl && nextBlocked}
                        hint={!navUrl ? nextBlockedHint : null}
                        aria-label="Complete lesson"
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#991B1B] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                      >
                        {navLabel || 'Complete Lesson'} <ChevronRight className="h-4 w-4" />
                      </NavButtonWithHint>
                    ) : !isLastSlide ? (
                      <NavButtonWithHint
                        onClick={navUrl ? () => window.open(navUrl, '_blank') : goNext}
                        disabled={!navUrl && nextBlocked}
                        hint={!navUrl ? nextBlockedHint : null}
                        aria-label="Next slide"
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#1E3A5F] hover:bg-[#162d4a] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                      >
                        {navLabel || 'Next'} <ChevronRight className="h-4 w-4" />
                      </NavButtonWithHint>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                  <BookOpen className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-700 mb-2">Ready to Learn?</h3>
                <p className="text-slate-400 font-medium text-sm max-w-xs text-center">
                  Select a lesson from the sidebar to start this module.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Mobile glass lesson modal (opened from the footer hamburger) ─────── */}
      {lessonMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[95] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Lessons"
        >
          {/* Backdrop */}
          <button
            aria-label="Close lessons"
            onClick={() => setLessonMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          />
          {/* Glass sheet */}
          <div className="relative w-full max-h-[78vh] flex flex-col rounded-t-[1.75rem] border-t border-white/60 bg-white/75 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_-10px_50px_rgba(15,23,42,0.28)] animate-in slide-in-from-bottom duration-300 ease-out">
            {/* Grab handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <span className="h-1.5 w-12 rounded-full bg-slate-400/60" />
            </div>
            {/* Header */}
            <div className="px-5 pt-1 pb-3 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900 leading-tight">Lessons</h3>
                <p className="text-xs font-bold text-green-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-3 w-3 shrink-0" /> {completedCount}/{lessons.length} completed
                </p>
              </div>
              <button
                onClick={() => setLessonMenuOpen(false)}
                aria-label="Close lessons"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Lesson list */}
            <div role="list" aria-label="Course lessons" className="flex-1 overflow-y-auto px-3 pb-5 space-y-1.5">
              {lessons.map((lesson, i) => {
                const active = selectedLesson?.id === lesson.id;
                const done = progress[lesson.id]?.completed;
                return (
                  <button
                    key={lesson.id}
                    role="listitem"
                    onClick={() => { selectLesson(lesson); setLessonMenuOpen(false); }}
                    aria-current={active ? 'true' : undefined}
                    style={active && effectiveTheme.chromeAccent ? { boxShadow: `inset 3px 0 0 ${effectiveTheme.chromeAccent}` } : undefined}
                    className={`w-full text-left px-3.5 py-3 rounded-2xl flex items-center gap-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                      active
                        ? 'bg-white/90 text-slate-900 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/10 border border-white'
                        : 'bg-white/45 hover:bg-white/75 border border-white/60 text-slate-600'
                    }`}
                  >
                    <span
                      className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        done ? 'bg-green-100 text-green-600'
                          : active ? 'bg-slate-900/10 text-slate-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`text-sm leading-snug min-w-0 flex-1 break-words ${active ? 'font-bold' : 'font-semibold'}`}>{lesson.title}</span>
                    {active && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
