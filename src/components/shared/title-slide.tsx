'use client';

interface TitleSlideProps {
  lessonTitle: string;
  lessonDescription?: string | null;
  titleImageUrl?: string | null;
  courseDate?: string | null;
}

export function TitleSlide({ lessonTitle, lessonDescription, titleImageUrl, courseDate }: TitleSlideProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="absolute inset-0">
        {titleImageUrl ? (
          <img src={titleImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 sm:px-12">
        <p className="text-white/60 text-xs sm:text-sm uppercase tracking-[0.2em] font-bold mb-4">GANSID Learning</p>
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
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-black shrink-0">G</div>
          <div>
            <p className="text-sm font-bold text-white/90">GANSID</p>
            <p className="text-[11px] text-white/50">Global Action Network for Sickle Cell &amp; Inherited Blood Disorders</p>
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
