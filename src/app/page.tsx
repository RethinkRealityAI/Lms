import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user role from metadata or database
  const userRole = user.user_metadata?.role || 'student';

  if (userRole === 'admin') {
    redirect('/admin');
  } else {
    redirect('/student');
  }
}
