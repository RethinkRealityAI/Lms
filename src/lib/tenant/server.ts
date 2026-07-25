import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_INSTITUTION_SLUG, isInstitutionSlug } from "@/lib/tenant/path";

export interface TenantContext {
  institutionSlug: string;
  institutionId: string | null;
}

/**
 * Resolve just the tenant slug, server-side, with NO database round-trip.
 *
 * Use this instead of `getTenantContext()` when the caller only needs to know
 * which institution is being viewed (branding, copy, links) and not its UUID —
 * notably the public landing page, which would otherwise hit Postgres on every
 * anonymous visit just to discard the id.
 *
 * Reads the `x-institution-slug` request header stamped by the middleware, and
 * falls back to the cookie. Because this runs on the server, the value is known
 * before the first byte of HTML, which is what lets a tenant-specific page be
 * server-rendered correctly rather than resolved after hydration.
 */
export async function getTenantSlug(): Promise<string> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerSlug = headerStore.get("x-institution-slug")?.toLowerCase();
  const cookieSlug = cookieStore.get("institution_slug")?.value?.toLowerCase();
  if (isInstitutionSlug(headerSlug || "")) return headerSlug!;
  if (isInstitutionSlug(cookieSlug || "")) return cookieSlug!;
  return DEFAULT_INSTITUTION_SLUG;
}

export async function getTenantContext(): Promise<TenantContext> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerSlug = headerStore.get("x-institution-slug")?.toLowerCase();
  const cookieSlug = cookieStore.get("institution_slug")?.value?.toLowerCase();
  const institutionSlug = isInstitutionSlug(headerSlug || "")
    ? headerSlug!
    : isInstitutionSlug(cookieSlug || "")
    ? cookieSlug!
    : DEFAULT_INSTITUTION_SLUG;

  const supabase = await createClient();
  const { data: institution } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", institutionSlug)
    .maybeSingle();

  return {
    institutionSlug,
    institutionId: institution?.id ?? null,
  };
}
