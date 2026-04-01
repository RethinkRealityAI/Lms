import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { createInvitation } from '@/lib/db/invitations';
import { updateLegacyUserInviteStatus } from '@/lib/db/legacy-users';

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
  const { email, role, customMessage, legacyUserId } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`;

    const inviteRes = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email,
        redirectTo: `${request.nextUrl.origin}/auth/callback`,
      }),
    });

    const inviteData = await inviteRes.json();
    if (!inviteRes.ok) {
      return NextResponse.json(
        { error: inviteData.error || 'Failed to send invite' },
        { status: inviteRes.status },
      );
    }

    const invitation = await createInvitation(supabase, {
      institution_id: institutionId,
      email,
      role,
      invited_by: user.id,
      custom_message: customMessage || undefined,
      legacy_user_id: legacyUserId || undefined,
    });

    if (legacyUserId) {
      await updateLegacyUserInviteStatus(
        supabase,
        legacyUserId,
        new Date().toISOString(),
      );
    }

    return NextResponse.json({ invitation, invitedUser: inviteData.user });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
