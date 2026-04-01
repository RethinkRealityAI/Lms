import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { isAdminRole, normalizeRole } from '@/lib/auth/roles';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
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
  const role = normalizeRole(typeof rawRole === 'string' ? rawRole : null);

  if (!isAdminRole(role)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
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
      href: '/gansid/admin',
      label: 'Courses',
      icon: 'BookOpen',
    },
    {
      href: '/gansid/admin/analytics',
      label: 'Analytics',
      icon: 'BarChart3',
    },
    {
      href: '/gansid/admin/users',
      label: 'Users',
      icon: 'Users',
    },
    {
      href: '/gansid/admin/categories',
      label: 'Categories',
      icon: 'FolderKanban',
    },
    {
      href: '/gansid/admin/settings',
      label: 'Settings',
      icon: 'Settings',
    },
    {
      href: '/gansid/admin/h5p',
      label: 'H5P',
      icon: 'BookOpen',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <NavBar
        links={navLinks}
        userEmail={user.email || ''}
        userName={fullName}
        avatarUrl={avatarUrl}
        title="GANSID Faculty"
      />
      <main className="max-w-7xl mx-auto pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
