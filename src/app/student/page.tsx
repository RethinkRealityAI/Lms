import { createClient } from '@/lib/supabase/server';
import { getUserInstitutionId } from '@/lib/db/users';
import { getVisibleCourseIds } from '@/lib/db/course-assignments';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { BookOpen, Users, Stethoscope, GraduationCap, ArrowRight, Globe, Award, TrendingUp, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function StudentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/gansid/login');

  let institutionId = await getUserInstitutionId(supabase, user.id);

  if (!institutionId) {
    const GANSID_INSTITUTION_ID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';
    await supabase
      .from('users')
      .update({ institution_id: GANSID_INSTITUTION_ID })
      .eq('id', user.id);
    institutionId = GANSID_INSTITUTION_ID;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();
  const firstName = userData?.full_name?.split(' ')[0] ?? '';

  // Fetch aggregate stats for the user
  const visibleIds = await getVisibleCourseIds(supabase, user.id, institutionId);

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', user?.id ?? '');

  const enrolledCount = (enrollments ?? []).length;

  const { data: certs } = await supabase
    .from('certificates')
    .select('id')
    .eq('user_id', user?.id ?? '');

  const certCount = (certs ?? []).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#0099CA]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-[#1E3A5F]/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl lg:text-5xl font-black text-white leading-tight mb-4">
              {firstName ? `Welcome back, ${firstName}` : 'Your Learning Platform'}
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
              A comprehensive e-learning platform empowering patients, advocates, and healthcare
              professionals with the training and resources they need to make a difference.
            </p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[#0099CA]" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{enrolledCount}</p>
                  <p className="text-xs text-slate-400">Courses Enrolled</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Award className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{certCount}</p>
                  <p className="text-xs text-slate-400">Certificates Earned</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{visibleIds.length}</p>
                  <p className="text-xs text-slate-400">Available Courses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Program cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-2xl font-black text-[#0F172A] mb-2">Training Programs</h2>
        <p className="text-slate-500 mb-8 max-w-2xl">
          Explore specialized learning tracks designed for different roles in the healthcare
          and patient advocacy ecosystem.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Patient Organizations card */}
          <Link href="/gansid/student/patient-organizations" className="group focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-2xl focus-visible:outline-none">
            <Card className="h-full border border-slate-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[#DC2626] to-[#DC2626]/70" />
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center">
                    <Users className="h-7 w-7 text-[#DC2626]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#DC2626] transition-colors">
                      Patient Organizations
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      Build organizational capacity with an 8-module training program covering
                      advocacy, fundraising, leadership, project management, communication,
                      strategic planning, and grant writing.
                    </p>
                    <ul className="space-y-2 mb-5">
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <GraduationCap className="h-4 w-4 text-[#DC2626] shrink-0" />
                        8 comprehensive training modules
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Award className="h-4 w-4 text-[#DC2626] shrink-0" />
                        Certificates of completion
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Globe className="h-4 w-4 text-[#DC2626] shrink-0" />
                        Accessible globally on any device
                      </li>
                    </ul>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] group-hover:gap-3 transition-all">
                      Explore Program <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Clinicians card */}
          <Link href="/gansid/student/clinicians" className="group focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-2xl focus-visible:outline-none">
            <Card className="h-full border border-slate-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[#1E3A5F] to-[#0099CA]" />
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center">
                    <Stethoscope className="h-7 w-7 text-[#1E3A5F]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2 group-hover:text-[#1E3A5F] transition-colors">
                      Clinicians &amp; Healthcare Providers
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      Access clinical education modules designed for healthcare professionals.
                      Stay current with evidence-based practices, treatment guidelines, and
                      emerging research in your field.
                    </p>
                    <ul className="space-y-2 mb-5">
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Stethoscope className="h-4 w-4 text-[#1E3A5F] shrink-0" />
                        Evidence-based clinical modules
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <TrendingUp className="h-4 w-4 text-[#1E3A5F] shrink-0" />
                        Track your learning progress
                      </li>
                      <li className="flex items-center gap-2 text-sm text-slate-600">
                        <Shield className="h-4 w-4 text-[#1E3A5F] shrink-0" />
                        Professional development resources
                      </li>
                    </ul>
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#1E3A5F] group-hover:gap-3 transition-all">
                      Explore Program <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Platform features */}
      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-black text-[#0F172A] text-center mb-8">Why Learn With Us</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#0099CA]/10 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="h-6 w-6 text-[#0099CA]" />
              </div>
              <h3 className="font-bold text-[#0F172A] mb-1">Expert-Crafted Content</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Every module is developed by experienced professionals and subject matter experts
                to ensure quality and relevance.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-[#DC2626]" />
              </div>
              <h3 className="font-bold text-[#0F172A] mb-1">Accessible Anywhere</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Learn at your own pace on any device. Our platform is designed for accessibility
                across diverse settings and resource levels.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-3">
                <Award className="h-6 w-6 text-[#1E3A5F]" />
              </div>
              <h3 className="font-bold text-[#0F172A] mb-1">Earn Certificates</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Complete courses to receive certificates that recognize your dedication
                to professional development and advocacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
