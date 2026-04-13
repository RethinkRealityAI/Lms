'use client';

// ---------------------------------------------------------------------------
// Institution branding map
// ---------------------------------------------------------------------------
const INSTITUTION_BRANDING: Record<string, { name: string; tagline: string; initial: string; learning: string; gradientFrom: string; gradientTo: string }> = {
  gansid: {
    name: 'GANSID',
    tagline: 'Global Action Network for Sickle Cell & Inherited Blood Disorders',
    initial: 'G',
    learning: 'GANSID Learning',
    gradientFrom: '#1A3C6E',
    gradientTo: '#0099CA',
  },
  scago: {
    name: 'SCAGO',
    tagline: 'Sickle Cell Awareness Group of Ontario',
    initial: 'S',
    learning: 'SCAGO Learning',
    gradientFrom: '#C8262A',
    gradientTo: '#1A1A1A',
  },
};

const DEFAULT_BRANDING = INSTITUTION_BRANDING.gansid;

interface TitleSlideProps {
  lessonTitle: string;
  lessonDescription?: string | null;
  titleImageUrl?: string | null;
  courseDate?: string | null;
  institutionSlug?: string;
}

export function TitleSlide({ lessonTitle, lessonDescription, titleImageUrl, courseDate, institutionSlug }: TitleSlideProps) {
  const branding = INSTITUTION_BRANDING[institutionSlug ?? 'gansid'] ?? DEFAULT_BRANDING;

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="absolute inset-0">
        {titleImageUrl ? (
          <img src={titleImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(to bottom right, ${branding.gradientFrom}, ${branding.gradientTo})` }} />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 sm:px-12">
        <p className="text-white/60 text-xs sm:text-sm uppercase tracking-[0.2em] font-bold mb-4">{branding.learning}</p>
        <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-tight max-w-3xl">
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
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black shrink-0">{branding.initial}</div>
          <div>
            <p className="text-sm font-bold text-white/90">{branding.name}</p>
            <p className="text-[11px] text-white/50">{branding.tagline}</p>
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
