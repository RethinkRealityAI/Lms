export const DEFAULT_INSTITUTION_SLUG = "gansid";
export const SUPPORTED_INSTITUTION_SLUGS = ["gansid", "scago"] as const;

type InstitutionSlug = (typeof SUPPORTED_INSTITUTION_SLUGS)[number];

export function isInstitutionSlug(value: string): value is InstitutionSlug {
  return (SUPPORTED_INSTITUTION_SLUGS as readonly string[]).includes(value.toLowerCase());
}

export function getInstitutionSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const slug = parts[0].toLowerCase();
  return isInstitutionSlug(slug) ? slug : null;
}

/**
 * Read institution slug from the browser cookie (set by middleware).
 * Only works in client components — returns null on server/during SSR.
 */
export function getInstitutionSlugFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith("institution_slug="));
  const value = match?.split("=")[1]?.toLowerCase();
  return value && isInstitutionSlug(value) ? value : null;
}

/**
 * Resolve institution slug from pathname OR cookie (client-side).
 * Middleware rewrites strip the slug from the URL, so usePathname()
 * often returns '/admin/...' without the slug. The cookie is always
 * set correctly by middleware, so we fall back to it.
 */
export function resolveInstitutionSlug(pathname?: string | null): string {
  return getInstitutionSlugFromPath(pathname) || getInstitutionSlugFromCookie() || DEFAULT_INSTITUTION_SLUG;
}

export function withInstitutionPath(
  path: string,
  pathname?: string | null,
  fallbackSlug: string = DEFAULT_INSTITUTION_SLUG
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Try pathname first, then cookie (middleware rewrites strip the slug from
  // usePathname(), but the cookie always has the correct value).
  const slugFromPath = getInstitutionSlugFromPath(pathname);
  const slugFromCookie = slugFromPath ? null : getInstitutionSlugFromCookie();
  const institutionSlug = slugFromPath || slugFromCookie || fallbackSlug;

  if (normalizedPath === "/") {
    return `/${institutionSlug}`;
  }

  if (getInstitutionSlugFromPath(normalizedPath)) {
    return normalizedPath;
  }

  return `/${institutionSlug}${normalizedPath}`;
}
