import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { BookOpen, Globe, Users, Shield, ArrowRight, CheckCircle, Search } from 'lucide-react';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = 'student';
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = userData?.role || 'student';
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">GANSID <span className="text-secondary font-light">LMS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#courses" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">Courses</Link>
            <Link href="#community" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">Community</Link>
            <Link href="#about" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">About Us</Link>
            {user ? (
              <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">
                <Link href={userRole === 'admin' ? '/admin' : '/student'}>Dashboard</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <Button variant="ghost" asChild className="rounded-full font-bold px-6">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                  <Link href="/login?tab=signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white/40 to-white/10 dark:from-slate-950 dark:via-slate-950/40 dark:to-slate-950/10 z-10" />
          <img
            src="/gansid_hero_background.png"
            alt="Medical Background"
            className="w-full h-full object-cover opacity-15 dark:opacity-10 scale-105"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-bold mb-6 animate-in slide-in-from-left duration-700">
              <Globe className="h-4 w-4" />
              <span>Global Action Network for Sickle Cell</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 animate-in slide-in-from-bottom duration-700 delay-200">
              Advancing Healthcare <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Through Knowledge</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl animate-in slide-in-from-bottom duration-700 delay-300">
              The GANSID Learning Management System provides a collaborative environment for healthcare professionals, patients, and researchers to share expertise and advance the treatment of sickle cell disorders.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom duration-700 delay-500">
              <Button size="lg" asChild className="w-full sm:w-auto h-14 rounded-2xl px-8 text-lg font-bold shadow-xl shadow-primary/25 bg-primary hover:bg-primary/90 active:scale-95 transition-all">
                <Link href="/login">Explore Courses <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <div className="flex -space-x-4 items-center pl-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 bg-slate-200 overflow-hidden shadow-md">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                  </div>
                ))}
                <div className="ml-6">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">Joined by 1,000+ experts</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3 h-3 text-yellow-400 fill-current">★</div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Logos */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-16 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-12 grayscale opacity-60">
          <div className="text-2xl font-bold text-slate-400">RESEARCH HUB</div>
          <div className="text-2xl font-bold text-slate-400">GLOBAL HEALTH</div>
          <div className="text-2xl font-bold text-slate-400">ACADEMY PLUS</div>
          <div className="text-2xl font-bold text-slate-400">MED CONNECT</div>
        </div>
      </section>

      {/* Features */}
      <section id="courses" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm mb-4">Core Initiatives</h2>
            <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Everything you need to grow as a professional</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all hover:shadow-2xl group">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <BookOpen className="h-7 w-7" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Certified Courses</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Access peer-reviewed materials and earn certifications recognized globally by medical institutions.</p>
            </div>

            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-secondary/30 transition-all hover:shadow-2xl group">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-6 group-hover:bg-secondary group-hover:text-white transition-all">
                <Users className="h-7 w-7" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Expert Mentorship</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Connect directly with leading hematologists and researchers specialized in sickle cell disorders.</p>
            </div>

            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-orange-500/30 transition-all hover:shadow-2xl group">
              <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-white transition-all">
                <Shield className="h-7 w-7" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Secure Network</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Your data and research are protected by industry-standard security and privacy protocols.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">GANSID</span>
          </div>
          <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
            Supporting the global community with accessible education and collaborative tools for better health outcomes.
          </p>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            © 2026 Global Action Network for Sickle Cell. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

