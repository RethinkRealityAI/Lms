'use client';

import { ArrowRight, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { PublicNav } from '@/components/public-nav';
import { PublicFooter } from '@/components/public-footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-red-100 selection:text-red-900">
      <PublicNav hideAuth />

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
                GANSID <br />
                <span className="text-[#0099CA]">Clinician</span> <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#991B1B] to-[#DC2626]">E-Learning Modules</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl font-medium">
                A structured, modular education initiative designed to strengthen the knowledge, confidence, and clinical competence of healthcare providers caring for people with inherited blood disorders.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-3 px-6 h-16 bg-[#DC2626] rounded-2xl text-white font-bold shadow-2xl shadow-red-200">
                  <Clock className="h-5 w-5" />
                  Clinician Modules Coming Soon
                </div>
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
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070"
                    alt="Clinical Training"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-[#0099CA]" />
                        <span className="font-bold">Clinician modules coming soon</span>
                      </div>
                      <p className="text-sm text-white/80">Evidence-based clinical training modules are in development for 2026.</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Glass Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-100/50 rounded-full blur-2xl animate-pulse delay-700" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Approach Section — the dark/blue block at the bottom */}
      <section id="approach" className="py-16 bg-white border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 md:p-20 rounded-[4rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0099CA]/20 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-3xl">
              <h2 className="text-[#0099CA] font-black tracking-widest uppercase text-sm mb-6">Our Approach</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
                Led by experts, <br />
                <span className="text-slate-400">designed for flexibility.</span>
              </h3>
              <p className="text-xl text-slate-300 leading-relaxed font-medium mb-10">
                Module development will begin in 2026 and will be led by experienced clinicians and subject-matter experts, in collaboration with regional stakeholders. Content will be reviewed to ensure clinical relevance, scientific rigor, and global applicability.
              </p>
              <div className="flex items-center gap-4 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 inline-flex">
                <Shield className="h-8 w-8 text-[#0099CA]" />
                <div>
                  <div className="font-bold text-lg text-white italic">&quot;Ensuring clinical relevance and scientific rigor globally.&quot;</div>
                </div>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white/60">
                <ArrowRight className="h-4 w-4" /> More details to follow as modules are released.
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter
        brandName="GANSID"
        brandAccent="LMS"
        tagline="Strengthening the knowledge, confidence, and clinical competence of healthcare providers caring for people with inherited blood disorders."
        copyright="&copy; 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders. All rights reserved."
      />
    </div>
  );
}
