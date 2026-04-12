'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { withInstitutionPath, getInstitutionSlugFromPath } from '@/lib/tenant/path';
import {
  LogOut,
  BookOpen,
  Menu,
  X,
  BarChart3,
  FolderKanban,
  Settings,
  TrendingUp,
  Award,
  User,
  Users,
  Stethoscope,
  MessageSquare,
  type LucideIcon
} from 'lucide-react';

// Map icon names to actual icon components
const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  BarChart3,
  FolderKanban,
  Settings,
  TrendingUp,
  Award,
  User,
  Users,
  Stethoscope,
  MessageSquare,
};

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

interface NavBarProps {
  links: NavLink[];
  userEmail: string;
  userName?: string;
  avatarUrl?: string;
  title: string;
}

const INSTITUTION_LOGOS: Record<string, string> = {
  gansid: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/canva-exports/logos/gansid-logo.png',
  scago: 'https://ylmnbbrpaeiogdeqezlo.supabase.co/storage/v1/object/public/scago-assets/logos/scago-logo.png',
};

export function NavBar({ links, userEmail, userName, avatarUrl, title }: NavBarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const institutionSlug = getInstitutionSlugFromPath(pathname) ?? 'gansid';
  const logoUrl = INSTITUTION_LOGOS[institutionSlug];

  // Reset logo error state when institution changes
  useEffect(() => {
    setLogoError(false);
  }, [institutionSlug]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitials = (email: string, name?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const isStudent = pathname.includes('/student');

  return (
    <nav aria-label="Main navigation" className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300 border-b",
      scrolled
        ? "bg-white/80 backdrop-blur-lg border-slate-200 shadow-sm"
        : "bg-white border-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <div className="flex items-center gap-6">
            <Link href={withInstitutionPath("/", pathname)} className="flex items-center gap-2 group shrink-0">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={`${institutionSlug.toUpperCase()} logo`}
                  className="h-7 w-7 rounded-lg object-contain shadow-md group-hover:rotate-6 transition-transform duration-300"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-7 h-7 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-lg flex items-center justify-center text-white shadow-md group-hover:rotate-6 transition-transform duration-300">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
              )}
              <h1 className="text-sm font-black tracking-tighter text-slate-900">
                {title.split(' ')[0] || 'LMS'} <span className="text-[#0099CA] font-light italic ml-0.5">{title.split(' ').slice(1).join(' ') || 'Portal'}</span>
              </h1>
            </Link>

            <div className="hidden md:flex items-center gap-0.5">
              {links.map((link) => {
                const resolvedHref = withInstitutionPath(link.href, pathname);
                const isActive =
                  pathname === resolvedHref ||
                  (resolvedHref !== withInstitutionPath('/student', pathname) &&
                    resolvedHref !== withInstitutionPath('/admin', pathname) &&
                    pathname.startsWith(resolvedHref + '/'));
                const Icon = iconMap[link.icon] || BookOpen;
                return (
                  <Link
                    key={link.href}
                    href={resolvedHref}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 text-[13px] font-bold rounded-full transition-all duration-200',
                      isActive
                        ? 'bg-[#DC2626] text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <Link
              href={isStudent ? withInstitutionPath("/student/profile", pathname) : withInstitutionPath("/admin/profile", pathname)}
              className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 group"
            >
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#0099CA] transition-colors">{userName || 'User'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userEmail.split('@')[0]}</p>
              </div>
              <Avatar className="h-7 w-7 border border-slate-100 group-hover:border-[#0099CA] transition-all">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || userEmail} className="object-cover" />}
                <AvatarFallback className="text-[10px] bg-slate-100 text-slate-500 font-bold">
                  {getInitials(userEmail, userName)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <form action="/auth/signout" method="post" className="hidden sm:block">
              <Button 
                variant="ghost" 
                size="sm" 
                type="submit"
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-full transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="px-4 py-6 space-y-4">
            <Link
              href={isStudent ? withInstitutionPath("/student/profile", pathname) : withInstitutionPath("/admin/profile", pathname)}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-4 pb-6 border-b border-slate-100 group"
            >
              <Avatar className="h-12 w-12 border-2 border-slate-100">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || userEmail} className="object-cover" />}
                <AvatarFallback className="text-sm bg-slate-100 text-slate-500 font-bold">
                  {getInitials(userEmail, userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 group-hover:text-[#0099CA] transition-colors">{userName || 'User'}</span>
                <span className="text-xs text-slate-400 font-medium">{userEmail}</span>
              </div>
            </Link>

            <div className="space-y-1">
              {links.map((link) => {
                const resolvedHref = withInstitutionPath(link.href, pathname);
                const isActive =
                  pathname === resolvedHref ||
                  (resolvedHref !== withInstitutionPath('/student', pathname) &&
                    resolvedHref !== withInstitutionPath('/admin', pathname) &&
                    pathname.startsWith(resolvedHref + '/'));
                const Icon = iconMap[link.icon] || BookOpen;
                return (
                  <Link
                    key={link.href}
                    href={resolvedHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all',
                      isActive
                        ? 'bg-[#DC2626] text-white shadow-lg'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <form action="/auth/signout" method="post">
                <Button 
                  variant="ghost" 
                  size="lg" 
                  type="submit" 
                  className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
