import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, BarChart3, FolderKanban, Users } from 'lucide-react';
import { NavBar } from '@/components/nav-bar';

export default async function AdminLayout({
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

  if (userData?.role !== 'admin') {
    redirect('/student');
  }

  const navLinks = [
    {
      href: '/admin',
      label: 'Courses',
      icon: BookOpen,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      href: '/admin/categories',
      label: 'Categories',
      icon: FolderKanban,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <NavBar
        links={navLinks}
        userEmail={user.email || ''}
        userName={userData?.full_name}
        avatarUrl={userData?.avatar_url}
        title="GANSID Admin"
      />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
