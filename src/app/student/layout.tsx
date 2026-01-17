import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, TrendingUp, Award, User } from 'lucide-react';
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
  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (userData?.role === 'admin') {
    redirect('/admin');
  }

  const navLinks = [
    {
      href: '/student',
      label: 'My Courses',
      icon: BookOpen,
    },
    {
      href: '/student/progress',
      label: 'Progress',
      icon: TrendingUp,
    },
    {
      href: '/student/certificates',
      label: 'Certificates',
      icon: Award,
    },
    {
      href: '/student/profile',
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <NavBar
        links={navLinks}
        userEmail={user.email!}
        userName={userData?.full_name}
        avatarUrl={userData?.avatar_url}
        title="My Learning"
      />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
