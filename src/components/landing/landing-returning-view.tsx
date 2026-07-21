'use client';

/**
 * Presentational renderer for the "Returning from EdApp" landing section.
 *
 * Pure and props-driven so it is reused by BOTH the public landing page
 * (ReturningLearnerSection wrapper) and the admin live preview
 * (ReturningSectionEditor). All copy is data-driven (migration 066) so admins
 * can edit it; DEFAULT_RETURNING_CONTENT mirrors the seeded defaults.
 */

import { Mail, LogIn, UserPlus, ShieldCheck, Sparkles } from 'lucide-react';

export interface LandingReturningContent {
  eyebrow: string;
  heading: string;
  intro: string;
  email_note_title: string;
  email_note_body: string;
  signup_title: string;
  signup_body: string;
  signup_button: string;
  signin_title: string;
  signin_body: string;
  signin_button: string;
  footer_note: string;
  /** null = default green. */
  accent_color: string | null;
}

/** Default copy — kept in sync with the migration-066 seed. */
export const DEFAULT_RETURNING_CONTENT: LandingReturningContent = {
  eyebrow: 'Returning from EdApp?',
  heading: 'Your account and progress are already here.',
  intro:
    'We’ve carried over your profile, completed modules, and certificates from EdApp. There’s nothing to re-enrol in and nothing to rebuild — the one thing to know is which email to use.',
  email_note_title: 'Use the same email you used on EdApp',
  email_note_body:
    'That’s how we recognise you. As long as the email matches, your history reconnects to your account automatically — even the first time you log in here.',
  signup_title: 'First time on the new platform',
  signup_body:
    'Create your login once with your EdApp email and pick a password. Your profile and progress are restored the moment you sign up — no enrolment forms, no starting over.',
  signup_button: 'Set up my account',
  signin_title: 'Already set up your login?',
  signin_body:
    'Just sign in and pick up right where you left off. Everything you completed is waiting on your dashboard.',
  signin_button: 'Sign in',
  footer_note:
    'Not sure the emails match, or something looks off? Use the support tools below and we’ll link it for you.',
  accent_color: null,
};

export const RETURNING_ACCENT_FALLBACK = '#059669';

interface LandingReturningViewProps {
  content: LandingReturningContent;
  signInHref: string;
  signUpHref: string;
  /** Admin live preview — links are inert. */
  previewMode?: boolean;
}

function tint(hex: string, alpha: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

export function LandingReturningView({ content, signInHref, signUpHref, previewMode = false }: LandingReturningViewProps) {
  const accent = content.accent_color || RETURNING_ACCENT_FALLBACK;
  const linkProps = previewMode
    ? { onClick: (e: React.MouseEvent) => e.preventDefault(), href: undefined as string | undefined }
    : {};

  return (
    <section id="returning" className="scroll-mt-24 py-20 bg-white relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/50 backdrop-blur-2xl shadow-[0_18px_55px_-18px_rgba(15,60,45,0.28)]">
          {/* Liquid-glass green tint */}
          <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tint(accent, '24')} 0%, rgba(255,255,255,0.2) 55%)` }} />
            <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: tint(accent, '3d') }} />
            <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: tint(accent, '22') }} />
          </div>
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/70" />

          <div className="p-8 sm:p-10 md:p-12">
            {content.eyebrow && (
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-4" style={{ color: accent }}>
                <Sparkles className="h-4 w-4" />
                {content.eyebrow}
              </h2>
            )}

            <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4 max-w-2xl">
              {content.heading}
            </h3>
            {content.intro && (
              <p className="text-slate-600 font-medium leading-relaxed text-base md:text-lg max-w-2xl mb-8">
                {content.intro}
              </p>
            )}

            {/* Key instruction */}
            {(content.email_note_title || content.email_note_body) && (
              <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/70 p-5 sm:p-6 mb-8 flex items-start gap-4">
                <div className="shrink-0 rounded-xl p-2.5 bg-white/70 border border-white/70" style={{ color: accent }}>
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  {content.email_note_title && <p className="font-black text-slate-900 text-sm mb-1">{content.email_note_title}</p>}
                  {content.email_note_body && <p className="text-sm text-slate-600 font-medium leading-relaxed">{content.email_note_body}</p>}
                </div>
              </div>
            )}

            {/* Two paths */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-5 w-5" style={{ color: accent }} />
                  <h4 className="font-black text-slate-900 text-base">{content.signup_title}</h4>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">{content.signup_body}</p>
                <a
                  {...linkProps}
                  href={previewMode ? undefined : signUpHref}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <UserPlus className="h-4 w-4" /> {content.signup_button}
                </a>
              </div>

              <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <LogIn className="h-5 w-5" style={{ color: accent }} />
                  <h4 className="font-black text-slate-900 text-base">{content.signin_title}</h4>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">{content.signin_body}</p>
                <a
                  {...linkProps}
                  href={previewMode ? undefined : signInHref}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold border-2 transition-all hover:bg-white/60"
                  style={{ borderColor: accent, color: accent }}
                >
                  <LogIn className="h-4 w-4" /> {content.signin_button}
                </a>
              </div>
            </div>

            {content.footer_note && (
              <p className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="h-4 w-4" style={{ color: accent }} />
                {content.footer_note}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
