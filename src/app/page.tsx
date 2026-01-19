'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Globe, 
  Users, 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  Search, 
  Stethoscope, 
  Target, 
  Layout, 
  Zap, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicNav } from '@/components/public-nav';

export default function Home() {
  const [activeTab, setActiveTab] = useState('goals');

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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-[#DC2626] text-xs font-black uppercase tracking-wider mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                Launching 2026
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tight">
                GANSID <br />
                <span className="text-[#0099CA]">Healthcare Providers</span> <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#991B1B] to-[#DC2626]">Online Training</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl font-medium">
                A structured, modular education initiative designed to strengthen clinical competence for those caring for people with hemoglobinopathies and other inherited blood disorders (IBDs).
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto h-16 rounded-2xl px-10 text-lg font-bold shadow-2xl shadow-red-200 bg-[#DC2626] hover:bg-[#991B1B] active:scale-95 transition-all">
                  <Link href="/login?tab=signup">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <div className="flex items-center gap-3 px-6 h-16 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-500 font-medium">
                  Module Development in Progress
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
                        <Users className="h-5 w-5 text-[#0099CA]" />
                        <span className="font-bold">Global Expert Network</span>
                      </div>
                      <p className="text-sm text-white/80">Collaborating with regional stakeholders to ensure clinical relevance.</p>
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

      {/* Overview Section */}
      <section id="overview" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-8">
              <h2 className="text-[#DC2626] font-black tracking-widest uppercase text-sm">Program Overview</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Addressing gaps in <span className="text-[#0099CA]">diagnosis and care</span> where it matters most.
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Beginning in 2026, GANSID will develop a series of evidence-based online training modules to address gaps in diagnosis, acute and chronic management, and long-term care—particularly in settings where access to specialist training is limited.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                  <div className="text-3xl font-black text-[#0099CA] mb-1">Evidenced</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Based Content</div>
                </div>
                <div className="p-6 rounded-3xl bg-red-50 border border-red-100">
                  <div className="text-3xl font-black text-[#DC2626] mb-1">Global</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Accessibility</div>
                </div>
              </div>
            </div>

            <div id="program" className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 backdrop-blur-sm relative z-10">
              <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 bg-white/50 p-1.5 rounded-2xl mb-8 border border-slate-200">
                  <TabsTrigger value="goals" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Goals</TabsTrigger>
                  <TabsTrigger value="audience" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Audience</TabsTrigger>
                  <TabsTrigger value="structure" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Structure</TabsTrigger>
                </TabsList>

                <div className="relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === 'goals' && (
                      <TabsContent value="goals" key="goals" className="mt-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                          {[
                            "Improve early recognition and accurate diagnosis",
                            "Strengthen evidence-based clinical decision-making",
                            "Standardize care using international best practices",
                            "Support frontline clinicians outside specialist centers",
                            "Ultimately improve patient outcomes and quality of care globally"
                          ].map((goal, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-[#0099CA]">
                                <Target className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-slate-700">{goal}</span>
                            </div>
                          ))}
                        </motion.div>
                      </TabsContent>
                    )}

                    {activeTab === 'audience' && (
                      <TabsContent value="audience" key="audience" className="mt-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                          {[
                            "Hematologists and hematology trainees",
                            "Primary care physicians and internists",
                            "Pediatricians and family physicians",
                            "Emergency medicine physicians",
                            "Laboratory and transfusion medicine professionals",
                            "Other clinicians involved in IBD care"
                          ].map((person, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-red-200 transition-all">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-[#DC2626]">
                                <Stethoscope className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-slate-700">{person}</span>
                            </div>
                          ))}
                        </motion.div>
                      </TabsContent>
                    )}

                    {activeTab === 'structure' && (
                      <TabsContent value="structure" key="structure" className="mt-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-4">
                          {[
                            { title: "Self-Paced", desc: "Online modules accessible globally", icon: Clock },
                            { title: "Case-Based", desc: "Grounded in real-world clinical scenarios", icon: Layout },
                            { title: "Evidence-Based", desc: "Aligned with international guidelines", icon: Zap },
                            { title: "Practical Tools", desc: "Downloadable clinical resources", icon: ArrowRight }
                          ].map((item, i) => (
                            <div key={i} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-[#0099CA]" />
                                <span className="font-black text-slate-900 text-lg">{item.title}</span>
                              </div>
                              <p className="text-sm text-slate-500 font-medium ml-6">{item.desc}</p>
                            </div>
                          ))}
                        </motion.div>
                      </TabsContent>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Approach Section */}
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
                  <div className="font-bold text-lg text-white italic">"Ensuring clinical relevance and scientific rigor globally."</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
                      <div className="flex items-center justify-center gap-3 mb-8 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">
                          <span className="text-slate-900">GANSID</span> <span className="text-[#0099CA] font-light">LMS</span>
                        </span>
                      </div>
          <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto leading-relaxed">
            Strengthening the knowledge, confidence, and clinical competence of healthcare providers caring for people with inherited blood disorders.
          </p>
          <div className="flex justify-center gap-8 mb-10">
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors">Terms of Service</Link>
            <Link href="#" className="text-sm font-bold text-slate-400 hover:text-[#DC2626] transition-colors">Contact Support</Link>
          </div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">
            © 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
