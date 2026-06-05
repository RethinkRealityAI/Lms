'use client';

import { getInstitutionBranding } from '@/lib/tenant/branding';
import type { TitleSlideSettings } from '@/lib/content/title-slide-settings';
import { TITLE_SIZE_CLASSES } from '@/lib/content/title-slide-settings';

interface TitleSlideProps {
  lessonTitle: string;
  lessonDescription?: string | null;
  /** Per-lesson background image — highest priority background source. */
  titleImageUrl?: string | null;
  courseDate?: string | null;
  institutionSlug?: string;
  titleSlideSettings?: TitleSlideSettings | null;
  /** Default title-slide logo from the theme cascade (course → institution). */
  titleLogoUrl?: string | null;
  /** Gradient start colour from the theme cascade. Falls back to branding.primaryColor. */
  gradientFrom?: string | null;
  /** Gradient end colour from the theme cascade. Falls back to branding.secondaryColor. */
  gradientTo?: string | null;
  /** Default title-slide background image from the theme cascade (overrides gradient). */
  defaultBackgroundImageUrl?: string | null;
}

export function TitleSlide({
  lessonTitle,
  lessonDescription,
  titleImageUrl,
  courseDate,
  institutionSlug,
  titleSlideSettings,
  titleLogoUrl,
  gradientFrom,
  gradientTo,
  defaultBackgroundImageUrl,
}: TitleSlideProps) {
  const branding = getInstitutionBranding(institutionSlug ?? 'gansid');
  const titleSize = titleSlideSettings?.title_size ?? 'md';
  const titleColor = titleSlideSettings?.title_color ?? '#FFFFFF';
  const footerText = titleSlideSettings?.footer_text ?? branding.acronym;
  // Per-lesson logo → course/institution default → initial avatar.
  const footerLogoUrl = titleSlideSettings?.footer_logo_url ?? titleLogoUrl ?? undefined;

  // Background priority: per-lesson image → theme default image → gradient
  const bgImage = titleImageUrl || defaultBackgroundImageUrl || null;
  const gradStart = gradientFrom || branding.primaryColor;
  const gradEnd   = gradientTo   || branding.secondaryColor;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="absolute inset-0">
        {bgImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(to bottom right, ${gradStart}, ${gradEnd})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 sm:px-12">
        <p className="text-white/60 text-xs sm:text-sm uppercase tracking-[0.2em] font-bold mb-4">{branding.programTitle}</p>
        <h2
          className={`${TITLE_SIZE_CLASSES[titleSize]} font-black leading-tight max-w-3xl`}
          style={{ color: titleColor }}
        >
          {lessonTitle}
        </h2>
        {lessonDescription && (
          <p className="text-white/70 text-sm sm:text-base lg:text-lg leading-relaxed mt-4 max-w-2xl">
            {lessonDescription}
          </p>
        )}
      </div>

      <div className="relative z-10 shrink-0 flex items-center justify-between px-6 py-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          {footerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={footerLogoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 bg-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black shrink-0">
              {footerText.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white/90">{footerText}</p>
            <p className="text-[11px] text-white/50">{branding.fullName}</p>
          </div>
        </div>
        {courseDate && (
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-white/40">{courseDate}</p>
          </div>
        )}
      </div>
    </div>
  );
}
