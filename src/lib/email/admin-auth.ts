import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getTenantContext } from '@/lib/tenant/server';

export interface TenantAdminCaller {
  id: string;
  role: string;
  email: string | null;
  full_name: string | null;
  institution_id: string | null;
}

export type TenantAdminAuth =
  | {
      ok: true;
      caller: TenantAdminCaller;
      institutionSlug: string;
      institutionId: string;
    }
  | { ok: false; status: number; error: string };

/** Authenticated admin scoped to the tenant in the URL (platform_admin exempt). */
export async function authorizeTenantAdmin(): Promise<TenantAdminAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Not authenticated' };

  const service = createServiceClient();
  const { data: caller } = await service
    .from('users')
    .select('id, role, email, full_name, institution_id')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    caller && ['admin', 'platform_admin', 'institution_admin'].includes(caller.role);
  if (!isAdmin) return { ok: false, status: 403, error: 'Forbidden' };

  const { institutionSlug, institutionId } = await getTenantContext();
  if (!institutionId) {
    return { ok: false, status: 400, error: 'Institution context required' };
  }

  const slug = institutionSlug ?? 'gansid';
  if (caller.role !== 'platform_admin' && caller.institution_id !== institutionId) {
    return { ok: false, status: 403, error: 'You can only manage email for your own institution' };
  }

  return {
    ok: true,
    caller: caller as TenantAdminCaller,
    institutionSlug: slug,
    institutionId,
  };
}
