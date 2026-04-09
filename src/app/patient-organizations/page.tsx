'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Users,
  ArrowRight,
  Target,
  GraduationCap,
  Laptop,
  Award,
  HandHeart,
  Megaphone,
  DollarSign,
  Briefcase,
  MessageSquare,
  FileText,
  PenTool,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicNav } from '@/components/public-nav';
import { PublicFooter } from '@/components/public-footer';
import Image from 'next/image';

export default function PatientOrganizationsPage() {
  const [activeTab, setActiveTab] = useState('about');

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
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-4 py-1.5 mb-6">
                <Users className="h-3.5 w-3.5 text-[#DC2626]" />
                <span className="text-xs font-bold text-[#DC2626] uppercase tracking-wider">Patient Organizations</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tight">
                Patient Organizations&apos; <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#991B1B] to-[#DC2626]">Capacity Building</span> <br />
                <span className="text-[#0099CA]">Training Program</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl font-medium">
                An 8-module e-course designed to equip patient advocacy organizations with the essential skills and knowledge needed to drive impactful change at local, national, and global levels.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto h-16 rounded-2xl px-10 text-lg font-bold shadow-2xl shadow-red-200 bg-[#DC2626] hover:bg-[#991B1B] active:scale-95 transition-all">
                  <Link href="/login?tab=signup">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <div className="flex items-center gap-3 px-6 h-16 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-600">
                  <GraduationCap className="h-5 w-5 text-[#0099CA]" />
                  8 Modules Available
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
                    src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=2070"
                    alt="Patient Advocacy Organizations"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-5 w-5 text-[#0099CA]" />
                        <span className="font-bold">Global Advocacy Network</span>
                      </div>
                      <p className="text-sm text-white/80">Empowering patient organizations across low-resource countries worldwide.</p>
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

      {/* Program Details Section */}
      <section id="overview" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-8">
              <h2 className="text-[#DC2626] font-black tracking-widest uppercase text-sm">About the Program</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Building <span className="text-[#0099CA]">organizational capacity</span> for lasting impact.
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Whether you are starting a new organization or looking to strengthen an existing one, this program provides a robust educational foundation to enhance advocacy efforts and organizational effectiveness. Each module has been carefully crafted by expert volunteers to ensure the content is accessible, relevant, and actionable for all learners.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                  <div className="text-3xl font-black text-[#0099CA] mb-1">25+</div>
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Organizations Equipped</div>
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
                  <TabsTrigger value="about" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Goals</TabsTrigger>
                  <TabsTrigger value="audience" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Audience</TabsTrigger>
                  <TabsTrigger value="access" className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white">Access</TabsTrigger>
                </TabsList>

                <div className="relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === 'about' && (
                      <TabsContent value="about" key="about" className="mt-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                          {[
                            "Increase patient advocacy organizations' capacity",
                            "Provide comprehensive training and practical tools",
                            "Elevate advocacy initiatives and organizational practices",
                            "Strengthen effectiveness at local, national, and global levels",
                            "Build a robust educational foundation for all learners"
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
                            "Patient organization leaders and founders",
                            "Advocacy coordinators and community organizers",
                            "Volunteer managers and team leads",
                            "Fundraising and development professionals",
                            "Members seeking to increase their effectiveness",
                            "Organizations beyond the inherited blood disorders community"
                          ].map((person, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-red-200 transition-all">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-[#DC2626]">
                                <Users className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-slate-700">{person}</span>
                            </div>
                          ))}
                        </motion.div>
                      </TabsContent>
                    )}

                    {activeTab === 'access' && (
                      <TabsContent value="access" key="access" className="mt-0 outline-none">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid gap-4">
                          {[
                            { title: "Self-Paced", desc: "Complete modules on your own schedule", icon: Laptop },
                            { title: "Any Device", desc: "Smartphones, tablets, and computers", icon: Globe },
                            { title: "Certificate", desc: "Earn certificates upon completion", icon: Award },
                            { title: "Free Access", desc: "Devices provided to 25+ organizations in low-resource countries", icon: HandHeart }
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

      {/* Modules Overview Section */}
      <section className="py-16 bg-white border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 md:p-20 rounded-[4rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0099CA]/20 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <h2 className="text-[#0099CA] font-black tracking-widest uppercase text-sm mb-6">Course Modules</h2>
              <h3 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                8 modules to transform <br />
                <span className="text-slate-400">your organization.</span>
              </h3>
              <p className="text-xl text-slate-300 leading-relaxed font-medium mb-10 max-w-2xl">
                Each module is crafted by expert volunteers to build practical skills you can apply immediately.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { num: 1, title: "Fundamentals of Effective Advocacy", icon: Megaphone },
                  { num: 2, title: "Fundraising Strategies that Drive Results", icon: DollarSign },
                  { num: 3, title: "Volunteer Management", icon: Users },
                  { num: 4, title: "Leadership", icon: Target },
                  { num: 5, title: "Project Management", icon: Briefcase },
                  { num: 6, title: "Effective Communication", icon: MessageSquare },
                  { num: 7, title: "Development of Impactful Strategic Work Plans", icon: FileText },
                  { num: 8, title: "Grant Writing", icon: PenTool },
                ].map((mod) => (
                  <div key={mod.num} className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center text-white text-sm font-black shrink-0">
                        {mod.num}
                      </div>
                      <mod.icon className="h-4 w-4 text-[#0099CA]" />
                    </div>
                    <p className="font-bold text-white text-sm leading-snug">{mod.title}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Button size="lg" asChild className="h-16 rounded-2xl px-10 text-lg font-bold shadow-2xl shadow-red-900/30 bg-[#DC2626] hover:bg-[#991B1B] active:scale-95 transition-all">
                  <Link href="/login?tab=signup">Access Modules <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsored By Banner */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 mb-6">
              Sponsored by
            </p>
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-[2rem] px-16 py-10 shadow-sm hover:shadow-md transition-shadow">
              <Image
                src="/vertex-logo.jpg"
                alt="Vertex Pharmaceuticals"
                width={220}
                height={116}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <PublicFooter
        brandName="GANSID"
        brandAccent="LMS"
        tagline="Equipping patient advocacy organizations with the essential skills and knowledge needed to drive impactful change worldwide."
        copyright="&copy; 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders. All rights reserved."
      />
    </div>
  );
}
