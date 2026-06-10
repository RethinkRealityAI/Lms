/**
 * Service-role Supabase client — SERVER ONLY (API routes).
 * Bypasses RLS; never import from client components or lib/db.
 * Callers MUST authenticate + authorize the request with the cookie-based
 * server client before touching this one.
 */
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
