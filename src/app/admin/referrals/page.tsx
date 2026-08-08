import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { listReferralCodesWithStats } from '@/lib/db/referrals';
import { isEmailConfigured } from '@/lib/email/mailer';
import { ReferralsManager } from '@/components/admin/referrals-manager';

export const dynamic = 'force-dynamic';

async function resolveOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3001';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function AdminReferralsPage() {
  const supabase = await createClient();
  const { institutionId, institutionSlug } = await getTenantContext();

  if (!institutionId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-medium text-slate-500">Institution not found.</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [codes, origin] = await Promise.all([
    listReferralCodesWithStats(supabase, institutionId),
    resolveOrigin(),
  ]);

  return (
    <ReferralsManager
      institutionId={institutionId}
      institutionSlug={institutionSlug ?? 'gansid'}
      initialCodes={codes}
      origin={origin}
      currentUserId={user?.id ?? null}
      emailConfigured={isEmailConfigured()}
    />
  );
}
