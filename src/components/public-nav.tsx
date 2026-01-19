'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen, LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PublicNavProps {
  scrolled?: boolean;
  transparentInitially?: boolean;
}

export function PublicNav({ scrolled: forcedScrolled, transparentInitially = true }: PublicNavProps) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(forcedScrolled || false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (forcedScrolled !== undefined) return;
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forcedScrolled]);

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        setUser(user);
        
        // Try to get user profile
        const { data: userData, error: profileError } = await supabase
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

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        const resolvedProfile = userData || emailProfile;
        if (resolvedProfile) {
          const role = typeof resolvedProfile.role === 'string'
            ? resolvedProfile.role.trim().toLowerCase()
            : resolvedProfile.role;
          setUserRole(role);
          setUserName(resolvedProfile.full_name);
          setAvatarUrl(resolvedProfile.avatar_url);
        } else {
          // If profile doesn't exist, set default role based on user metadata
          const metaRole =
            user.user_metadata?.role ||
            user.app_metadata?.role;
          const role = typeof metaRole === 'string' ? metaRole.trim().toLowerCase() : metaRole;
          setUserRole(role || 'student');
          setUserName(user.user_metadata?.full_name || null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        setUserName(null);
        setAvatarUrl(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        checkUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setMobileMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const dashboardPath = userRole === 'admin' ? '/admin' : '/student';

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/70 backdrop-blur-xl border-b border-slate-100 py-3' 
        : transparentInitially 
          ? 'bg-[#0F172A] border-transparent py-4'
          : 'bg-white border-b border-slate-100 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform duration-300">
            <BookOpen className="h-6 w-6" />
          </div>
          <span className={`text-2xl font-black tracking-tighter transition-colors ${scrolled || !transparentInitially ? 'text-slate-900' : 'text-white'}`}>
            GANSID <span className="text-[#0099CA] font-light">LMS</span>
          </span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#overview" className={`text-sm font-bold transition-colors ${scrolled || !transparentInitially ? 'text-slate-600 hover:text-[#DC2626]' : 'text-slate-300 hover:text-white'}`}>Overview</Link>
          <Link href="/#program" className={`text-sm font-bold transition-colors ${scrolled || !transparentInitially ? 'text-slate-600 hover:text-[#DC2626]' : 'text-slate-300 hover:text-white'}`}>Program</Link>
          <Link href="/#approach" className={`text-sm font-bold transition-colors ${scrolled || !transparentInitially ? 'text-slate-600 hover:text-[#DC2626]' : 'text-slate-300 hover:text-white'}`}>Approach</Link>
          
          {!loading && user ? (
            <div className="flex items-center gap-3">
              <Button asChild className="rounded-full px-6 font-bold bg-[#0099CA] hover:bg-[#007EA0] shadow-lg shadow-blue-200">
                <Link href={dashboardPath}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <Avatar className="h-8 w-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || ''} />}
                  <AvatarFallback className="text-xs bg-slate-200">
                    {getInitials(userName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className={`rounded-full font-bold ${scrolled || !transparentInitially ? 'text-slate-600 hover:text-[#DC2626]' : 'text-slate-300 hover:text-white'}`}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : !loading ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild className={`rounded-full font-bold px-6 transition-colors ${scrolled || !transparentInitially ? 'text-slate-600 hover:text-[#DC2626]' : 'text-slate-300 hover:text-white'}`}>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="rounded-full px-6 font-bold shadow-lg shadow-red-100 bg-[#DC2626] hover:bg-[#991B1B] transition-all transform hover:scale-105">
                <Link href="/login?tab=signup">Get Started</Link>
              </Button>
            </div>
          ) : null}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className={`md:hidden ${scrolled || !transparentInitially ? 'text-slate-900' : 'text-white'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {user && (
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <Avatar className="h-10 w-10">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || ''} />}
                  <AvatarFallback className="text-sm bg-slate-200">
                    {getInitials(userName, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-slate-900">{userName || 'User'}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            )}
            
            <Link 
              href="/#overview" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-600 hover:text-[#DC2626] py-2"
            >
              Overview
            </Link>
            <Link 
              href="/#program" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-600 hover:text-[#DC2626] py-2"
            >
              Program
            </Link>
            <Link 
              href="/#approach" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-bold text-slate-600 hover:text-[#DC2626] py-2"
            >
              Approach
            </Link>
            
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {user ? (
                <>
                  <Button asChild className="w-full rounded-xl font-bold bg-[#0099CA] hover:bg-[#007EA0]">
                    <Link href={dashboardPath} onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl font-bold"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full rounded-xl font-bold">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                  </Button>
                  <Button asChild className="w-full rounded-xl font-bold bg-[#DC2626] hover:bg-[#991B1B]">
                    <Link href="/login?tab=signup" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
