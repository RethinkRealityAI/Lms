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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicNav } from '@/components/public-nav';
import { PublicFooter } from '@/components/public-footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-red-100 selection:text-red-900">
      <PublicNav />

      {/* Hero Section */}
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
                  <Link href="/login?tab=signup">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
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

      {/* Programs Section */}
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
            <Link href="/gansid/patient-organizations" className="group">
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
            <Link href="/gansid/clinicians" className="group">
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

      {/* Platform Features */}
      <section className="py-16 bg-white border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 md:p-20 rounded-[4rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0099CA]/20 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <h2 className="text-[#0099CA] font-black tracking-widest uppercase text-sm mb-6">Platform</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                Learn anywhere, <br />
                <span className="text-slate-400">at your own pace.</span>
              </h3>
              <p className="text-xl text-slate-300 leading-relaxed font-medium mb-12">
                Our platform is built for accessibility, flexibility, and real-world impact — whether you&apos;re a clinician in a specialist center or an advocate in a low-resource setting.
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { icon: Laptop, title: "Any Device", desc: "Smartphones, tablets, and computers" },
                  { icon: Award, title: "Certificates", desc: "Earn credentials on completion" },
                  { icon: Globe, title: "Global Access", desc: "Available in any setting worldwide" },
                ].map((feature, i) => (
                  <div key={i} className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                    <feature.icon className="h-8 w-8 text-[#0099CA] mx-auto mb-3" />
                    <div className="font-black text-white text-lg mb-1">{feature.title}</div>
                    <p className="text-sm text-slate-400 font-medium">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
