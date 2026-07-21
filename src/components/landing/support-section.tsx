'use client';

/**
 * LandingSupportSection — the "how to get support" section on the public landing
 * page (rendered below the module list, id="support" so the notification banner's
 * "#support" link scrolls here).
 *
 * It teaches visitors the two real ways to reach support, using pixel-faithful
 * replicas of the ACTUAL in-app controls (the red "Report issue" flag in the
 * course viewer, and the navy "Support" FAB on the dashboard) — highlighted with
 * a callout ring — plus the real feedback categories so learners know what kind of
 * detail they can send. Replicas mirror `report-issue-dialog.tsx` and
 * `feedback/support-widget.tsx` so what's shown here matches what they'll click.
 */

import {
  Flag, MessageSquarePlus, Maximize2, MousePointerClick, ListChecks, Send,
  Lightbulb, Bug, LifeBuoy,
} from 'lucide-react';
import { FEEDBACK_TYPES } from '@/lib/content/feedback-taxonomy';

interface LandingSupportSectionProps {
  coverImageUrl: string;
  /** Section accent (institution primary). Used for the callout ring + step chips. */
  accent?: string;
  contactEmail: string;
}

/** Faithful replica of the in-viewer "Report issue" flag (see report-issue-dialog.tsx). */
function ReportIssueFlagReplica() {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[#DC2626] bg-red-50 pointer-events-none"
    >
      <Flag className="w-4 h-4 fill-[#DC2626]" />
      <span className="text-xs font-semibold">Report issue</span>
    </button>
  );
}

/** Faithful replica of the dashboard "Support" FAB (see feedback/support-widget.tsx). */
function SupportFabReplica() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-2xl bg-[#1E3A5F] text-white shadow-lg shadow-slate-900/20 pointer-events-none"
    >
      <MessageSquarePlus className="h-5 w-5" />
      <span className="text-sm font-bold">Support</span>
    </span>
  );
}

/** A soft pulsing callout ring drawing the eye to a highlighted control. */
function CalloutRing({ accent }: { accent: string }) {
  return (
    <>
      <span
        className="absolute -inset-2 rounded-2xl border-2 border-dashed animate-pulse pointer-events-none"
        style={{ borderColor: accent }}
      />
      <span
        className="absolute -inset-2 rounded-2xl pointer-events-none"
        style={{ boxShadow: `0 0 0 6px ${accent}1a` }}
      />
    </>
  );
}

export function LandingSupportSection({ coverImageUrl, accent = '#C8262A', contactEmail }: LandingSupportSectionProps) {
  const steps = [
    { icon: MousePointerClick, title: 'Spot the button', desc: 'Look for the red “Report issue” flag while viewing a lesson, or the “Support” button on your dashboard.' },
    { icon: ListChecks, title: 'Pick what it’s about', desc: 'Choose a category — can’t progress, something’s broken, a suggestion, a bug, and more.' },
    { icon: Send, title: 'Add details & send', desc: 'Add a short note and your email. The exact course, lesson, and slide are attached automatically.' },
  ];

  return (
    <section id="support" className="scroll-mt-24 py-20 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cover header — same imagery as the learning experience */}
        <div className="relative rounded-[2rem] overflow-hidden mb-14 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="relative z-10 p-8 sm:p-12 md:p-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-5">
              <LifeBuoy className="h-4 w-4 text-white" />
              <span className="text-xs font-black uppercase tracking-widest text-white">Support &amp; Feedback</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-4">
              Run into a problem? We&rsquo;re here to help.
            </h2>
            <p className="text-white/80 font-medium leading-relaxed text-base md:text-lg">
              You can report an issue or send feedback right from inside the program — no email required.
              Here&rsquo;s exactly where the buttons are and what to press.
            </p>
          </div>
        </div>

        {/* Two ways to get support */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {/* In a lesson — Report issue flag */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>While viewing a lesson</span>
            <h3 className="text-xl font-black text-slate-900 mt-1 mb-2">Use the red “Report issue” flag</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
              At the top of every lesson slide there&rsquo;s a red flag. Tap it to flag anything that looks
              wrong on the slide you&rsquo;re reading — a broken video, a typo, or content that seems off.
            </p>

            {/* Mock slide top-bar with the highlighted flag */}
            <div className="mt-auto rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">Slide 3 / 12</span>
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex">
                    <CalloutRing accent={accent} />
                    <ReportIssueFlagReplica />
                  </span>
                  <span className="p-1.5 rounded-lg text-slate-300 bg-white border border-slate-200">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard — Support FAB */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.05)] flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>From your dashboard</span>
            <h3 className="text-xl font-black text-slate-900 mt-1 mb-2">Use the “Support” button</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
              On your learning dashboard, the navy <span className="font-bold text-slate-700">Support</span> button
              sits in the bottom-right corner. Use it any time to send a suggestion, report an issue, or flag a bug.
            </p>

            {/* Mock dashboard corner with the highlighted FAB */}
            <div className="mt-auto relative rounded-2xl bg-slate-50 border border-slate-200 h-[132px] overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="h-2.5 w-1/3 rounded-full bg-slate-200" />
                <div className="h-2 w-1/2 rounded-full bg-slate-100" />
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="h-10 rounded-lg bg-white border border-slate-200" />
                  <div className="h-10 rounded-lg bg-white border border-slate-200" />
                  <div className="h-10 rounded-lg bg-white border border-slate-200" />
                </div>
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="relative inline-flex">
                  <CalloutRing accent={accent} />
                  <SupportFabReplica />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-3 gap-5 mb-14">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-white font-black text-sm"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <s.icon className="h-5 w-5 text-slate-400" />
              </div>
              <h4 className="font-black text-slate-900 text-sm mb-1">{s.title}</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* What you can tell us — the real feedback categories */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-7 sm:p-9">
          <h3 className="text-lg font-black text-slate-900 mb-1">What you can tell us</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Every report lets you pick the kind of detail you&rsquo;re sharing — so it reaches the right place fast.
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {([
              { type: 'issue' as const, icon: Flag, tint: '#DC2626' },
              { type: 'suggestion' as const, icon: Lightbulb, tint: '#7C3AED' },
              { type: 'bug' as const, icon: Bug, tint: '#EA580C' },
            ]).map(({ type, icon: Icon, tint }) => (
              <div key={type} className="rounded-2xl bg-white border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4" style={{ color: tint }} />
                  <span className="font-black text-slate-900 text-sm">{FEEDBACK_TYPES[type].pluralLabel}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FEEDBACK_TYPES[type].categories.map((c) => (
                    <span
                      key={c.slug}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-6">
            Prefer email? Reach us any time at{' '}
            <a href={`mailto:${contactEmail}`} className="font-bold hover:underline" style={{ color: accent }}>
              {contactEmail}
            </a>.
          </p>
        </div>
      </div>
    </section>
  );
}
