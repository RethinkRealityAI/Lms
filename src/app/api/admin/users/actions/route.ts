import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/service';

/**
 * Admin user actions that need the service-role auth API:
 * POST { action: 'ban' | 'unban' | 'send_password_reset', userId }
 *  - ban: blocks sign-in at the auth level (876000h ≈ 100 years) and flags
 *    users.is_active = false via the admin_set_user_active RPC
 *  - unban: clears the auth ban and re-activates
 *  - send_password_reset: emails a recovery link (uses Supabase auth SMTP)
 * Authorization: caller must be an admin allowed to manage the target user
 * (admin_can_manage_user RPC — institution-scoped, platform_admin exempt).
 */
export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json();
    if (!action || !userId) {
      return NextResponse.json({ error: 'action and userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // institution-scoped admin check, enforced in SQL
    const { data: allowed, error: permErr } = await supabase
      .rpc('admin_can_manage_user', { p_target: userId });
    if (permErr || !allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (userId === user.id && action !== 'send_password_reset') {
      return NextResponse.json({ error: 'You cannot perform this action on your own account' }, { status: 400 });
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        {
          error:
            'Password reset and account suspension require SUPABASE_SERVICE_ROLE_KEY on the server. Contact your platform administrator.',
        },
        { status: 503 },
      );
    }

    const service = createServiceClient();

    if (action === 'ban' || action === 'unban') {
      const banned = action === 'ban';
      const { error: authErr } = await service.auth.admin.updateUserById(userId, {
        ban_duration: banned ? '876000h' : 'none',
      });
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
      // keep the app-level flag in sync (also logs the analytics event)
      const { error: rpcErr } = await supabase.rpc('admin_set_user_active', {
        p_user_id: userId,
        p_active: !banned,
      });
      if (rpcErr) {
        return NextResponse.json({ error: rpcErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'send_password_reset') {
      const { data: target } = await service
        .from('users').select('email').eq('id', userId).maybeSingle();
      if (!target?.email) {
        return NextResponse.json({ error: 'User has no email' }, { status: 422 });
      }
      const { error: resetErr } = await service.auth.resetPasswordForEmail(target.email, {
        redirectTo: `${req.nextUrl.origin}/auth/callback?next=/student/profile`,
      });
      if (resetErr) {
        return NextResponse.json({ error: resetErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Unknown action ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[admin/users/actions]', err);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
