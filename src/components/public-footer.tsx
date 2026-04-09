'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { ContactModal } from '@/components/contact-modal';

interface PublicFooterProps {
  /** Brand name shown in the footer. Defaults to generic. */
  brandName?: string;
  brandAccent?: string;
  tagline?: string;
  copyright?: string;
}

export function PublicFooter({
  brandName = 'E-Learning',
  brandAccent = 'Platform',
  tagline = 'Empowering patients, advocates, and healthcare providers with the training and resources they need to make a lasting difference.',
  copyright = '\u00A9 2026 All rights reserved.',
}: PublicFooterProps) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      <footer className="mt-auto py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-8 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black tracking-tighter">
              <span className="text-slate-900">{brandName}</span>{' '}
              <span className="text-[#0099CA] font-light">{brandAccent}</span>
            </span>
          </div>
          <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto leading-relaxed">
            {tagline}
          </p>
          <div className="flex justify-center gap-8 mb-10">
            <Link href="/privacy-policy" className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors">
              Terms of Service
            </Link>
            <button
              onClick={() => setContactOpen(true)}
              className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors"
            >
              Contact Support
            </button>
          </div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
            {copyright}
          </div>
        </div>
      </footer>
    </>
  );
}
