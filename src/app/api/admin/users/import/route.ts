import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const adminRoles = ['platform_admin', 'institution_admin', 'instructor', 'admin'];
  if (!profile || !adminRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { institutionId } = await getTenantContext();
  if (!institutionId) {
    return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  }

  const body = await request.json();
  const { users } = body;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: 'Users array is required' }, { status: 400 });
  }

  if (users.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 users per import' }, { status: 400 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.email) { skipped++; continue; }
    const { error } = await supabase
      .from('legacy_users')
      .upsert({
        institution_id: institutionId,
        email: u.email.trim().toLowerCase(),
        full_name: u.full_name || null,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        roles: u.roles || null,
        occupation: u.occupation || null,
        affiliation: u.affiliation || null,
        country: u.country || null,
        date_registered: u.date_registered || null,
        avg_progress: u.avg_progress ?? 0,
        avg_score: u.avg_score ?? null,
        completions: u.completions ?? 0,
        completed_percent: u.completed_percent ?? 0,
        external_id: u.external_id || null,
      }, { onConflict: 'institution_id,email', ignoreDuplicates: false });

    if (error) { skipped++; } else { inserted++; }
  }

  return NextResponse.json({ inserted, skipped, total: users.length });
}
