'use client';

import { Award } from 'lucide-react';

interface CompletionSlideProps {
  lessonTitle: string;
  editorMode?: boolean;
}

export function CompletionSlide({ lessonTitle, editorMode }: CompletionSlideProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-10 px-8 text-center gap-6 flex-1 overflow-y-auto">
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
        <Award className="h-10 w-10 text-green-500" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Lesson Complete</p>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{lessonTitle}</h3>
        <p className="text-slate-500 mt-2 text-base">
          {editorMode ? 'This is the completion slide students will see.' : "Congratulations! You've completed this lesson."}
        </p>
      </div>
    </div>
  );
}
