import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        {children}
      </div>
    );
  }

  // Get user data from database
  const { data: userData } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const { data: emailProfile } = user.email
    ? await supabase
        .from('users')
        .select('role, full_name, avatar_url')
        .eq('email', user.email)
        .maybeSingle()
    : { data: null };

  // Check role from profile or fallback to metadata
  const rawRole =
    userData?.role ||
    emailProfile?.role ||
    user.user_metadata?.role ||
    user.app_metadata?.role;
  const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : rawRole;

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        {children}
      </div>
    );
  }

  // Use profile data or fallback to metadata
  const fullName =
    userData?.full_name ||
    emailProfile?.full_name ||
    user.user_metadata?.full_name;
  const avatarUrl =
    userData?.avatar_url ||
    emailProfile?.avatar_url;

  const navLinks = [
    {
      href: '/admin',
      label: 'Courses',
      icon: 'BookOpen',
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: 'BarChart3',
    },
    {
      href: '/admin/categories',
      label: 'Categories',
      icon: 'FolderKanban',
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: 'Settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <NavBar
        links={navLinks}
        userEmail={user.email || ''}
        userName={fullName}
        avatarUrl={avatarUrl}
        title="GANSID Faculty"
      />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
