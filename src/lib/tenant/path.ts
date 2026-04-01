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

export function withInstitutionPath(
  path: string,
  pathname?: string | null,
  fallbackSlug: string = DEFAULT_INSTITUTION_SLUG
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const slugFromPath = getInstitutionSlugFromPath(pathname);
  const institutionSlug = slugFromPath || fallbackSlug;

  if (normalizedPath === "/") {
    return `/${institutionSlug}`;
  }

  if (getInstitutionSlugFromPath(normalizedPath)) {
    return normalizedPath;
  }

  return `/${institutionSlug}${normalizedPath}`;
}
