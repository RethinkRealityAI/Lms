'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Users,
  ArrowRight,
  Stethoscope,
  GraduationCap,
  Award,
  Laptop,
  Clock,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
  UserPlus,
  PlayCircle,
  Timer,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { PublicNav } from '@/components/public-nav';
import { PublicFooter } from '@/components/public-footer';
import { LandingNotification } from '@/components/landing/landing-notification';
import { LandingSupportSection } from '@/components/landing/support-section';
import { ReturningLearnerSection } from '@/components/landing/returning-learner-section';
import { CoverImage } from '@/components/landing/cover-image';
import { resolveInstitutionSlug, withInstitutionPath } from '@/lib/tenant/path';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import {
  SCAGO_MODULES,
  SCAGO_LANDING_IMAGES,
  SCAGO_TOTAL_LESSONS,
  SCAGO_TOTAL_CREDITS,
} from '@/lib/content/scago-curriculum';

/** Small uppercase eyebrow above a section heading — keeps section rhythm consistent. */
function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p
      className="font-bold tracking-[0.2em] uppercase text-xs mb-3"
      style={{ color }}
    >
      {children}
    </p>
  );
}

function GansidHero({ pathname }: { pathname: string }) {
  return (
    <section className="relative pt-36 pb-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tight">
              E-Learning for <br />
              <span className="text-[#0099CA]">Patients</span> &amp; <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#991B1B] to-[#DC2626]">Healthcare Providers</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl font-medium">
              A comprehensive online training platform connecting patient advocacy organizations and healthcare professionals with the education they need to drive meaningful change.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto h-16 rounded-2xl px-10 text-lg font-bold shadow-2xl shadow-red-200 bg-[#DC2626] hover:bg-[#991B1B] active:scale-95 transition-all">
                <Link href={withInstitutionPath('/login?tab=signup', pathname)}>Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto h-16 rounded-2xl px-10 text-lg font-bold border-2 border-slate-200 hover:border-slate-300">
                <Link href="#programs">Explore Programs</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 p-8 bg-white/40 backdrop-blur-2xl border border-white/50 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]">
              <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-100 group relative">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070"
                  alt="E-Learning Platform"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-5 w-5 text-[#0099CA]" />
                      <span className="font-bold">Expert-Crafted Courses</span>
                    </div>
                    <p className="text-sm text-white/80">Self-paced modules designed by leading professionals in their fields.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-100/50 rounded-full blur-2xl animate-pulse delay-700" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function GansidPrograms({ pathname }: { pathname: string }) {
  return (
    <section id="programs" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[#DC2626] font-black tracking-widest uppercase text-sm mb-4">Training Programs</h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
            Specialized tracks for <span className="text-[#0099CA]">every role</span> in the healthcare ecosystem.
          </h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Patient Organizations Program */}
          <Link href={withInstitutionPath('/patient-organizations', pathname)} className="group">
            <div className="h-full p-10 rounded-[3rem] bg-gradient-to-br from-red-50 to-white border border-red-100 hover:shadow-2xl hover:shadow-red-100/50 hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-[#DC2626]/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-[#DC2626]" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-[#DC2626] transition-colors">
                Patient Organizations
              </h4>
              <p className="text-slate-600 font-medium leading-relaxed mb-6">
                An 8-module capacity building program covering advocacy, fundraising, leadership, project management, communication, strategic planning, and grant writing. Designed for patient organization members seeking to increase their effectiveness.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {['Advocacy', 'Fundraising', 'Leadership', 'Grant Writing'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-[#DC2626] border border-red-100">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#DC2626] group-hover:gap-3 transition-all uppercase tracking-wider">
                Explore Program <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* Clinicians Program */}
          <Link href={withInstitutionPath('/clinicians', pathname)} className="group">
            <div className="h-full p-10 rounded-[3rem] bg-gradient-to-br from-blue-50 to-white border border-blue-100 hover:shadow-2xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 bg-[#0099CA]/10 rounded-2xl flex items-center justify-center mb-6">
                <Stethoscope className="h-8 w-8 text-[#0099CA]" />
              </div>
              <h4 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-[#0099CA] transition-colors">
                Clinicians &amp; Healthcare Providers
              </h4>
              <p className="text-slate-600 font-medium leading-relaxed mb-6">
                Evidence-based online training modules addressing gaps in diagnosis, acute and chronic management, and long-term care for inherited blood disorders. Designed for clinical professionals across all specialties.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {['Diagnosis', 'Clinical Care', 'Evidence-Based', 'Best Practices'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-[#0099CA] border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#0099CA] group-hover:gap-3 transition-all uppercase tracking-wider">
                Explore Program <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SCAGO — HCP education program
 * ------------------------------------------------------------------ */

function ScagoHero({ pathname, branding }: { pathname: string; branding: ReturnType<typeof getInstitutionBranding> }) {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Ambient brand wash */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-15%] right-[-5%] w-[45%] h-[55%] bg-[#C8262A]/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[50%] bg-[#F0E7CC]/70 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <img
              src={branding.logoUrl}
              alt={branding.fullName}
              className="h-14 w-auto mb-8"
            />

            {/* Accreditation is the strongest trust signal — lead with it */}
            <div className="inline-flex items-center gap-2 mb-7 pl-2 pr-4 py-1.5 rounded-full bg-white border border-[#C8262A]/15 shadow-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8262A] text-white text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                Accredited
              </span>
              <span className="text-[13px] font-semibold text-slate-700">
                Up to {SCAGO_TOTAL_CREDITS} Mainpro+ credits &middot; CFPC
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6">
              Sickle cell care,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C8262A] to-[#1A1A1A]">
                taught properly.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl mb-8">
              {branding.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                size="lg"
                asChild
                className="h-14 rounded-xl px-8 text-base font-bold bg-[#C8262A] hover:bg-[#a01f22] shadow-xl shadow-[#C8262A]/20 active:scale-[0.98] transition-all"
              >
                <Link href={withInstitutionPath('/login?tab=signup', pathname)}>
                  Start learning free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 rounded-xl px-8 text-base font-bold border-2 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50"
              >
                <Link href="#curriculum">Browse the 13 modules</Link>
              </Button>
            </div>

            <p className="text-sm text-slate-500">
              Already learned with us on EdApp?{' '}
              <Link
                href={withInstitutionPath('/login', pathname)}
                className="font-semibold text-[#C8262A] underline decoration-[#C8262A]/30 underline-offset-2 hover:decoration-[#C8262A]"
              >
                Sign in to restore your progress
              </Link>
            </p>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] overflow-hidden shadow-[0_30px_70px_-20px_rgba(26,26,26,0.35)] ring-1 ring-black/5">
              <CoverImage
                src={SCAGO_LANDING_IMAGES.hero}
                alt="A physician explaining sickle cell care to a young patient"
                loading="eager"
                className="w-full aspect-[4/3]"
                imgClassName="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/75 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
                <div className="flex items-center gap-2 mb-1.5">
                  <Stethoscope className="h-4 w-4 text-[#F0E7CC]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F0E7CC]">
                    Evidence-based
                  </span>
                </div>
                <p className="text-white font-semibold leading-snug">
                  Built with Ontario clinicians and people living with sickle cell disease.
                </p>
              </div>
            </div>

            {/* Floating stat chip — top-right so it never sits over the caption */}
            <div className="absolute -top-5 -right-3 sm:-right-5 bg-white rounded-2xl px-5 py-3.5 shadow-xl ring-1 ring-black/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F0E7CC] flex items-center justify-center">
                  <Timer className="h-[18px] w-[18px] text-[#C8262A]" />
                </div>
                <div>
                  <p className="text-[20px] font-black text-slate-900 leading-none">
                    &lt;10 min
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    per micro-lesson
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Thin band of the four numbers that matter, all derived from real data. */
function ScagoStats() {
  const stats = [
    { icon: Layers, value: `${SCAGO_MODULES.length}`, label: 'Modules' },
    { icon: BookOpen, value: `${SCAGO_TOTAL_LESSONS}`, label: 'Micro-lessons' },
    { icon: Award, value: `${SCAGO_TOTAL_CREDITS}`, label: 'Mainpro+ credits' },
    { icon: Clock, value: 'Self-paced', label: 'Start & stop anytime' },
  ];

  return (
    <section className="border-y border-slate-200/80 bg-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Deliberately plain div/span markup rather than dl/dt/dd: the spec only
            allows dt/dd directly inside dl (or inside a single grouping div), so
            the icon + text layout below would be invalid nesting that browsers
            silently reparent — which shows up as a React hydration mismatch. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-white/10 lg:divide-y-0 lg:divide-x">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3.5 px-2 py-6 lg:px-8">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-white/[0.07] flex items-center justify-center">
                <Icon className="h-5 w-5 text-[#F0E7CC]" />
              </div>
              <div className="min-w-0">
                <span className="block text-xl md:text-2xl font-black text-white leading-none truncate">
                  {value}
                </span>
                <span className="block text-[11px] md:text-xs font-semibold text-white/55 mt-1 truncate">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Program goal / audience / format — three peers instead of two stacked slabs. */
function ScagoOverview() {
  const cards = [
    {
      icon: Heart,
      title: 'Why it exists',
      body:
        'To improve the knowledge, skills, and actions of healthcare providers who care for people with sickle cell disease — reducing health inequities and improving access to safe, equitable care.',
    },
    {
      icon: Users,
      title: 'Who it is for',
      body:
        'Providers who are new to caring for people with sickle cell disease, and experienced clinicians who want a deeper understanding of the condition and the lived experience of patients.',
    },
    {
      icon: PlayCircle,
      title: 'How it works',
      body:
        `Thirteen modules broken into ${SCAGO_TOTAL_LESSONS} micro-lessons, each under ten minutes. Work through them in any order, on any device, and pick up exactly where you left off.`,
    },
  ];

  return (
    <section id="program" className="py-20 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <SectionLabel color="#C8262A">The programme</SectionLabel>
          <h2 className="text-3xl md:text-[2.75rem] font-black text-slate-900 tracking-tight leading-[1.15]">
            Continuing education built around
            <span className="text-[#C8262A]"> how clinicians actually work.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-[#C8262A]/25 hover:shadow-[0_18px_40px_-18px_rgba(200,38,42,0.25)] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-[#F0E7CC] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5 text-[#C8262A]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2.5">{title}</h3>
              <p className="text-[15px] text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Three-step orientation so a first-time visitor knows exactly what happens. */
function ScagoHowItWorks({ pathname }: { pathname: string }) {
  const steps = [
    {
      icon: UserPlus,
      step: '01',
      title: 'Create your free account',
      body: 'Sign up with your work email. Returning EdApp learners keep every module they already finished.',
    },
    {
      icon: PlayCircle,
      step: '02',
      title: 'Work through the modules',
      body: 'Short lessons with knowledge checks. Your progress saves automatically on every device.',
    },
    {
      icon: Award,
      step: '03',
      title: 'Claim your certificate',
      body: `Finish a module to earn its certificate, and up to ${SCAGO_TOTAL_CREDITS} Mainpro+ credits across the programme.`,
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-gradient-to-b from-[#FBF8F1] to-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div>
            <SectionLabel color="#C8262A">Getting started</SectionLabel>
            <h2 className="text-3xl md:text-[2.5rem] font-black text-slate-900 tracking-tight leading-[1.15] mb-5">
              Three steps, then you are learning.
            </h2>
            <p className="text-[17px] text-slate-600 leading-relaxed mb-8">
              No waiting lists and no scheduled sessions — the whole programme is
              open the moment you create an account.
            </p>
            <Button
              asChild
              size="lg"
              className="h-14 rounded-xl px-7 text-base font-bold bg-[#C8262A] hover:bg-[#a01f22] shadow-lg shadow-[#C8262A]/20"
            >
              <Link href={withInstitutionPath('/login?tab=signup', pathname)}>
                Create an account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ol className="space-y-4">
            {steps.map(({ icon: Icon, step, title, body }) => (
              <li
                key={step}
                className="flex gap-5 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
              >
                <div className="shrink-0 flex flex-col items-center">
                  <div className="w-11 h-11 rounded-xl bg-[#C8262A] text-white flex items-center justify-center shadow-md shadow-[#C8262A]/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-2 text-[10px] font-black tracking-widest text-slate-300">
                    {step}
                  </span>
                </div>
                <div className="pt-1">
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-[14.5px] text-slate-600 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The 13 modules, now each with its own cover art. */
function ScagoCurriculum({ pathname }: { pathname: string }) {
  return (
    <section id="curriculum" className="py-20 md:py-24 bg-[#F7F7F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <SectionLabel color="#C8262A">The curriculum</SectionLabel>
            <h2 className="text-3xl md:text-[2.75rem] font-black text-slate-900 tracking-tight leading-[1.15]">
              Thirteen modules,{' '}
              <span className="text-[#C8262A]">{SCAGO_TOTAL_LESSONS} micro-lessons.</span>
            </h2>
            <p className="text-[17px] text-slate-600 leading-relaxed mt-4">
              Written and reviewed by Ontario haematologists, nurses, researchers and
              advocates. Each module carries one Mainpro+ credit.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 h-12 rounded-xl px-6 font-bold border-2 border-slate-200 hover:border-[#C8262A]/40 hover:text-[#C8262A]"
          >
            <Link href={withInstitutionPath('/login?tab=signup', pathname)}>
              Enrol free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCAGO_MODULES.map((mod, i) => (
            <motion.article
              key={mod.number}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: Math.min(i, 5) * 0.05 }}
              className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_22px_50px_-20px_rgba(200,38,42,0.28)] hover:-translate-y-1 hover:border-[#C8262A]/25 transition-all duration-500"
            >
              {/* Cover art */}
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <CoverImage
                  src={mod.image}
                  alt={`${mod.title} — module cover`}
                  className="w-full h-full"
                  imgClassName="object-cover group-hover:scale-[1.06] transition-transform duration-700"
                  fallback={<BookOpen className="h-10 w-10 text-white/40" />}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-[#1A1A1A]/10 to-transparent" />

                {/* Module number */}
                <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-white/95 backdrop-blur flex items-center justify-center shadow-sm">
                  <span className="text-[13px] font-black text-[#C8262A]">
                    {mod.number}
                  </span>
                </div>

                {/* Topic chip */}
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[10.5px] font-bold uppercase tracking-wider text-white">
                  {mod.topic}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col p-5">
                <h3 className="text-[15.5px] font-bold text-slate-900 leading-snug mb-2 group-hover:text-[#C8262A] transition-colors">
                  {mod.title}
                </h3>
                <p className="text-[13.5px] text-slate-500 leading-relaxed mb-4 flex-1">
                  {mod.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                    <BookOpen className="h-3 w-3" />
                    {mod.lessons} {mod.lessons === 1 ? 'lesson' : 'lessons'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0E7CC] text-[11px] font-bold text-[#8A5A0B]">
                    <Award className="h-3 w-3" />
                    1 Mainpro+
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                  <span className="font-semibold text-slate-500">Authors:</span>{' '}
                  {mod.authors}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Accreditation deserves its own moment rather than a footnote under the grid. */
function ScagoAccreditation({ pathname }: { pathname: string }) {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#1A1A1A] px-8 py-12 md:px-14 md:py-14">
          <div className="absolute top-[-30%] right-[-5%] w-[45%] h-[130%] bg-[#C8262A]/25 rounded-full blur-[90px]" />
          <div className="absolute bottom-[-40%] left-[-5%] w-[35%] h-[120%] bg-[#F0E7CC]/10 rounded-full blur-[80px]" />

          <div className="relative z-10 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
                <ShieldCheck className="h-4 w-4 text-[#F0E7CC]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F0E7CC]">
                  Certified continuing education
                </span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight mb-4">
                Accredited for up to {SCAGO_TOTAL_CREDITS} Mainpro+ credits
              </h2>
              <p className="text-[16px] text-white/65 leading-relaxed max-w-xl">
                This programme is accredited by the College of Family Physicians of
                Canada. Complete a module to receive its certificate — finish the full
                programme and claim the maximum credits.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-xl px-8 text-base font-bold bg-white text-[#1A1A1A] hover:bg-[#F0E7CC] active:scale-[0.98] transition-all"
              >
                <Link href={withInstitutionPath('/login?tab=signup', pathname)}>
                  Start earning credits <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-xl px-8 text-base font-bold bg-transparent border-2 border-white/25 text-white hover:bg-white/10 hover:border-white/40"
              >
                <Link href={withInstitutionPath('/login', pathname)}>Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScagoContact({ branding }: { branding: ReturnType<typeof getInstitutionBranding> }) {
  return (
    <section className="py-20 bg-[#F7F7F8] border-t border-slate-200/70">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <SectionLabel color="#C8262A">Contact</SectionLabel>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">
          Questions about the programme?
        </h2>
        <p className="text-[16px] text-slate-600 mb-9">
          We are glad to help with enrolment, credits, or anything technical.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto mb-8">
          <a
            href={`mailto:${branding.contactEmail}`}
            className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-white border border-slate-200 hover:border-[#C8262A]/35 hover:shadow-md transition-all text-[14px] font-semibold text-slate-800 hover:text-[#C8262A]"
          >
            <Mail className="h-4 w-4" />
            {branding.contactEmail}
          </a>
          {branding.contactPhone && (
            <a
              href={`tel:${branding.contactPhone.replace(/[^+\d]/g, '')}`}
              className="flex items-center justify-center gap-2.5 p-4 rounded-xl bg-white border border-slate-200 hover:border-[#C8262A]/35 hover:shadow-md transition-all text-[14px] font-semibold text-slate-800 hover:text-[#C8262A]"
            >
              <Phone className="h-4 w-4" />
              {branding.contactPhone}
            </a>
          )}
        </div>

        {branding.contactAddress && (
          <p className="flex items-center justify-center gap-2 text-[13.5px] text-slate-500 mb-2">
            <MapPin className="h-4 w-4" />
            {branding.contactAddress}
          </p>
        )}
        <p className="text-xs text-slate-400 font-semibold">
          Charitable Registration #: 83332 0872 RR 0001
        </p>
      </div>
    </section>
  );
}

function PlatformFeatures({ isScago }: { isScago: boolean }) {
  // Accent must follow the tenant — SCAGO previously inherited GANSID's teal.
  const accent = isScago ? '#F0E7CC' : '#0099CA';
  const iconColor = isScago ? 'text-[#F0E7CC]' : 'text-[#0099CA]';

  return (
    <section className="py-16 bg-white border-t border-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-12 md:p-20 rounded-[4rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[100px]" />
          <div
            className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[100px]"
            style={{ backgroundColor: `${accent}20` }}
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2
              className="font-black tracking-widest uppercase text-sm mb-6"
              style={{ color: accent }}
            >
              Platform
            </h2>
            <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
              Learn anywhere, <br />
              <span className="text-slate-400">at your own pace.</span>
            </h3>
            <p className="text-xl text-slate-300 leading-relaxed font-medium mb-12">
              {isScago
                ? 'Our platform is built for busy healthcare professionals — micro-lessons designed for flexible learning, accessible on any device, anywhere in Ontario and beyond.'
                : 'Our platform is built for accessibility, flexibility, and real-world impact — whether you\u2019re a clinician in a specialist center or an advocate in a low-resource setting.'}
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: Laptop, title: 'Any Device', desc: 'Smartphones, tablets, and computers' },
                { icon: Award, title: 'Certificates', desc: isScago ? `Up to ${SCAGO_TOTAL_CREDITS} Mainpro+ credits` : 'Earn credentials on completion' },
                { icon: Globe, title: isScago ? 'Flexible Access' : 'Global Access', desc: isScago ? 'Learn on your own schedule' : 'Available in any setting worldwide' },
              ].map((feature, i) => (
                <div key={i} className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                  <feature.icon className={`h-8 w-8 ${iconColor} mx-auto mb-3`} />
                  <div className="font-black text-white text-lg mb-1">{feature.title}</div>
                  <p className="text-sm text-slate-400 font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const pathname = usePathname();
  const institutionSlug = resolveInstitutionSlug(pathname) || 'gansid';
  const branding = getInstitutionBranding(institutionSlug);
  const isScago = institutionSlug === 'scago';

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-red-100 selection:text-red-900">
      <PublicNav />

      {isScago ? (
        <>
          <ScagoHero pathname={pathname} branding={branding} />
          <ScagoStats />
          <LandingNotification institutionSlug={institutionSlug} />
          <ReturningLearnerSection
            institutionSlug={institutionSlug}
            signInHref={withInstitutionPath('/login', pathname)}
            signUpHref={withInstitutionPath('/login?tab=signup', pathname)}
          />
          <ScagoOverview />
          <ScagoHowItWorks pathname={pathname} />
          <ScagoCurriculum pathname={pathname} />
          <ScagoAccreditation pathname={pathname} />
          <LandingSupportSection
            coverImageUrl={SCAGO_LANDING_IMAGES.support}
            accent={branding.primaryColor}
            contactEmail={branding.contactEmail}
          />
          <ScagoContact branding={branding} />
        </>
      ) : (
        <>
          <GansidHero pathname={pathname} />
          <LandingNotification institutionSlug={institutionSlug} />
          <GansidPrograms pathname={pathname} />
          <PlatformFeatures isScago={false} />
        </>
      )}

      <PublicFooter
        brandName={isScago ? 'SCAGO' : 'E-Learning'}
        brandAccent={isScago ? 'Education' : 'Platform'}
        tagline={isScago
          ? 'Improving knowledge, skills, and actions of healthcare providers who care for people with sickle cell disease.'
          : undefined}
        copyright={branding.copyright}
      />
    </div>
  );
}
