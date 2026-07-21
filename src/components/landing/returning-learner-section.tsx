'use client';

/**
 * ReturningLearnerSection — landing-page guidance for returning EdApp learners.
 *
 * The HCP program moved off EdApp onto this platform. Legacy learners were
 * imported (their profile, progress and certificates exist here already) but
 * they have NO login yet — auth credentials don't transfer. So the accurate
 * flow, mirroring the signup auto-claim (handle_new_user) + claim-invite path:
 *   - First time here → create an account ONCE with the SAME email used on
 *     EdApp; everything reconnects automatically (no re-enrolling / no rebuilding).
 *   - Already created that login → just sign in.
 *
 * Styled to match the green liquid-glass notification. Anchored at #returning.
 */

import { Mail, LogIn, UserPlus, ShieldCheck, Sparkles } from 'lucide-react';

interface ReturningLearnerSectionProps {
  accent?: string;
  signInHref: string;
  signUpHref: string;
}

/** Soft tint from a #rrggbb accent. */
function tint(hex: string, alpha: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

export function ReturningLearnerSection({ accent = '#059669', signInHref, signUpHref }: ReturningLearnerSectionProps) {
  return (
    <section id="returning" className="scroll-mt-24 py-20 bg-white relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/50 backdrop-blur-2xl shadow-[0_18px_55px_-18px_rgba(15,60,45,0.28)]"
        >
          {/* Liquid-glass green tint */}
          <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tint(accent, '24')} 0%, rgba(255,255,255,0.2) 55%)` }} />
            <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full blur-3xl" style={{ backgroundColor: tint(accent, '3d') }} />
            <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full blur-3xl" style={{ backgroundColor: tint(accent, '22') }} />
          </div>
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/70" />

          <div className="p-8 sm:p-10 md:p-12">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-4" style={{ color: accent }}>
              <Sparkles className="h-4 w-4" />
              Returning from EdApp?
            </h2>

            <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4 max-w-2xl">
              Your account and progress are already here.
            </h3>
            <p className="text-slate-600 font-medium leading-relaxed text-base md:text-lg max-w-2xl mb-8">
              We&rsquo;ve carried over your profile, completed modules, and certificates from EdApp. There&rsquo;s nothing to
              re-enrol in and nothing to rebuild — the one thing to know is which email to use.
            </p>

            {/* The key instruction */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/70 p-5 sm:p-6 mb-8 flex items-start gap-4">
              <div className="shrink-0 rounded-xl p-2.5 bg-white/70 border border-white/70" style={{ color: accent }}>
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm mb-1">Use the same email you used on EdApp</p>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  That&rsquo;s how we recognise you. As long as the email matches, your history reconnects to your account
                  automatically — even the first time you log in here.
                </p>
              </div>
            </div>

            {/* Two paths */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {/* First time — sign up once */}
              <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-5 w-5" style={{ color: accent }} />
                  <h3 className="font-black text-slate-900 text-base">First time on the new platform</h3>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
                  Create your login once with your EdApp email and pick a password. Your profile and progress are
                  restored the moment you sign up — no enrolment forms, no starting over.
                </p>
                <a
                  href={signUpHref}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  <UserPlus className="h-4 w-4" /> Set up my account
                </a>
              </div>

              {/* Returning — sign in */}
              <div className="rounded-2xl bg-white/60 backdrop-blur-md border border-white/60 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <LogIn className="h-5 w-5" style={{ color: accent }} />
                  <h3 className="font-black text-slate-900 text-base">Already set up your login?</h3>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
                  Just sign in and pick up right where you left off. Everything you completed is waiting on your dashboard.
                </p>
                <a
                  href={signInHref}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold border-2 transition-all hover:bg-white/60"
                  style={{ borderColor: accent, color: accent }}
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </a>
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4" style={{ color: accent }} />
              Not sure the emails match, or something looks off? Use the support tools below and we&rsquo;ll link it for you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
