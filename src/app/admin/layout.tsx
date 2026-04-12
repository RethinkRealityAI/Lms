import { createClient } from '@/lib/supabase/server';
import { NavBar } from '@/components/nav-bar';
import { getTenantContext } from '@/lib/tenant/server';

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
  const { institutionSlug } = await getTenantContext();
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
      href: '/admin/certificates',
      label: 'Certificates',
      icon: 'Award',
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: 'User',
    },
    {
      href: '/admin/support',
      label: 'Support',
      icon: 'MessageSquare',
    },
    {
      href: '/admin/settings',
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
        title={`${institutionSlug.toUpperCase()} Faculty`}
      />
      <main className="max-w-7xl mx-auto pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
