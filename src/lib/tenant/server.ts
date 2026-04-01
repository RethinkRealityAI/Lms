import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_INSTITUTION_SLUG, isInstitutionSlug } from "@/lib/tenant/path";

export interface TenantContext {
  institutionSlug: string;
  institutionId: string | null;
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
