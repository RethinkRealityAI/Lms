import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { isAdminRole } from '@/lib/auth/roles';
import { getTenantContext } from '@/lib/tenant/server';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { institutionSlug } = await getTenantContext();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${institutionSlug}/login`);
  }

  // Get user data from database
  const { data: userData, error: profileError } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  // Check role from profile or fallback to metadata
  const role = userData?.role || user.user_metadata?.role;

  if (isAdminRole(role)) {
    redirect('/admin');
  }

  // Use profile data or fallback to metadata
  const fullName = userData?.full_name || user.user_metadata?.full_name;
  const avatarUrl = userData?.avatar_url;

  const navLinks = [
    {
      href: `/${institutionSlug}/student`,
      label: 'My Courses',
      icon: 'BookOpen',
    },
    {
      href: `/${institutionSlug}/student/progress`,
      label: 'Progress',
      icon: 'TrendingUp',
    },
    {
      href: `/${institutionSlug}/student/certificates`,
      label: 'Certificates',
      icon: 'Award',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <NavBar
        links={navLinks}
        userEmail={user.email || ''}
        userName={fullName}
        avatarUrl={avatarUrl}
        title={`${institutionSlug.toUpperCase()} LMS`}
      />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
