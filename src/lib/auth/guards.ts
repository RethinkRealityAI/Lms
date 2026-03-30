import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@/types';

const ADMIN_ROLES = new Set(['platform_admin', 'institution_admin', 'instructor', 'admin']);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');
  return profile as User;
}

export async function requireAdminAuth(): Promise<User> {
  const user = await requireAuth();
  if (!isAdminRole(user.role)) redirect('/student');
  return user;
}

export async function requireEnrollment(
  userId: string,
  courseId: string
): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  if (!data) redirect('/student');
}
