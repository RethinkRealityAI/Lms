'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Maximize2, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface LessonNavbarProps {
  courseTitle: string;
  userName?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function LessonNavbar({
  courseTitle,
  userName,
  isFullscreen,
  onToggleFullscreen,
}: LessonNavbarProps) {
  if (isFullscreen) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/gansid/student/login';
  };

  return (
    <nav className="h-10 bg-[#0F172A] flex items-center px-4 shrink-0 z-50">
      {/* Left: Back to courses */}
      <Link
        href="/gansid/student"
        className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">My Courses</span>
      </Link>

      {/* Center: Course title */}
      <div className="flex-1 min-w-0 mx-4">
        <p className="text-sm font-semibold text-white truncate text-center">
          {courseTitle}
        </p>
      </div>

      {/* Right: Fullscreen + user */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 text-slate-400 hover:text-white transition-colors rounded"
          title="Toggle fullscreen (F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {userName && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-700">
            <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <span className="text-xs text-slate-400 max-w-[100px] truncate">{userName}</span>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
