import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user data from database
  const { data: userData, error: profileError } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  // Check role from profile or fallback to metadata
  const role = userData?.role || user.user_metadata?.role;
  
  if (role === 'admin') {
    redirect('/admin');
  }
  
  // Use profile data or fallback to metadata
  const fullName = userData?.full_name || user.user_metadata?.full_name;
  const avatarUrl = userData?.avatar_url;

  const navLinks = [
    {
      href: '/student',
      label: 'My Courses',
      icon: 'BookOpen',
    },
    {
      href: '/student/progress',
      label: 'Progress',
      icon: 'TrendingUp',
    },
    {
      href: '/student/certificates',
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
        title="GANSID LMS"
      />
      <div className="relative">
        <div className="absolute inset-0 bg-[#0F172A] h-[200px] z-0" />
        <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
