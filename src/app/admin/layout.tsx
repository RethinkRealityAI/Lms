import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated / non-admin users before
  // this layout ever runs, so we never render a structurally different tree
  // based on auth state. Always render the full admin shell to guarantee
  // SSR ↔ client HTML consistency and prevent hydration mismatches.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch profile (best-effort — falls back to empty strings if unavailable)
  const { data: userData } = user
    ? await supabase
        .from('users')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null };

  const fullName: string | undefined =
    userData?.full_name || user?.user_metadata?.full_name;
  const avatarUrl: string | undefined =
    userData?.avatar_url || undefined;

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
      icon: 'User',
    },
    {
      href: '/gansid/admin/settings',
      label: 'Settings',
      icon: 'Settings',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <NavBar
        links={navLinks}
        userEmail={user?.email || ''}
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
