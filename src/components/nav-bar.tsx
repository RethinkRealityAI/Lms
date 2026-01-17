'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { LogOut, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavBarProps {
  links: NavLink[];
  userEmail: string;
  userName?: string;
  avatarUrl?: string;
  title: string;
}

export function NavBar({ links, userEmail, userName, avatarUrl, title }: NavBarProps) {
  const pathname = usePathname();

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {title}
                </h1>
              </div>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName || userEmail} />}
                <AvatarFallback className="text-xs">
                  {getInitials(userEmail, userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{userName || 'User'}</span>
                <span className="text-xs text-muted-foreground">{userEmail}</span>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
