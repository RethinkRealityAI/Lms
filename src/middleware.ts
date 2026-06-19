import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_INSTITUTION_SLUG = "gansid";
const SUPPORTED_INSTITUTION_SLUGS = new Set(["gansid", "scago"]);
const ADMIN_ROLES = new Set(["platform_admin", "institution_admin", "instructor", "admin"]);

/**
 * Read user role from the JWT token metadata (zero network cost).
 * Falls back to a single DB query only when metadata is missing.
 * Page-level layouts still do their own DB check as a second layer.
 */
function getRoleFromToken(user: any): string | null {
  const raw =
    user.user_metadata?.role ??
    user.app_metadata?.role ??
    null;
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();
  return null;
}

async function getUserAuthInfo(
  supabase: any,
  user: any
): Promise<{ role: string; slug: string | null }> {
  // Single DB lookup for both role and the user's own institution slug.
  // Prioritizing the DB prevents stale JWT metadata from locking updated admins
  // out, and gives us the authoritative tenant for tenant-enforcement below.
  const { data, error } = await supabase
    .from("users")
    .select("role, institutions(slug)")
    .eq("id", user.id)
    .maybeSingle();

  let role: string | null = null;
  if (!error && data?.role && typeof data.role === "string") {
    role = data.role.trim().toLowerCase();
  }
  if (!role) {
    // Fallback to JWT metadata if no DB record exists
    role = getRoleFromToken(user) ?? "student";
  }

  // The institutions embed is an object for a to-one FK; tolerate an array shape too.
  const inst = data?.institutions;
  const slugRaw = Array.isArray(inst) ? inst[0]?.slug : inst?.slug;
  const slug = typeof slugRaw === "string" ? slugRaw.toLowerCase() : null;

  return { role, slug };
}

function getInstitutionSlug(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const firstPart = parts[0].toLowerCase();
  return SUPPORTED_INSTITUTION_SLUGS.has(firstPart) ? firstPart : null;
}

function stripInstitutionSlug(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return pathname;
  const firstPart = parts[0].toLowerCase();
  if (!SUPPORTED_INSTITUTION_SLUGS.has(firstPart)) return pathname;
  const strippedPath = `/${parts.slice(1).join("/")}`;
  return strippedPath === "/" ? "/" : strippedPath;
}

function withInstitution(path: string, institutionSlug: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") return `/${institutionSlug}`;
  return `/${institutionSlug}${normalizedPath}`;
}

function applyInstitutionContext(
  response: NextResponse,
  slug: string
): NextResponse {
  response.cookies.set("institution_slug", slug, { path: "/" });
  response.headers.set("x-institution-slug", slug);
  return response;
}

export async function middleware(request: NextRequest) {
  const institutionSlugInPath = getInstitutionSlug(request.nextUrl.pathname);
  const institutionFromCookie = request.cookies.get("institution_slug")?.value?.toLowerCase();
  const selectedInstitution =
    institutionSlugInPath ||
    (institutionFromCookie && SUPPORTED_INSTITUTION_SLUGS.has(institutionFromCookie)
      ? institutionFromCookie
      : DEFAULT_INSTITUTION_SLUG);
  const normalizedPath = institutionSlugInPath
    ? stripInstitutionSlug(request.nextUrl.pathname)
    : request.nextUrl.pathname;

  // Enforce explicit institution context for auth/admin/student routes.
  if (
    !institutionSlugInPath &&
    (normalizedPath.startsWith("/student") ||
      normalizedPath === "/login" ||
      normalizedPath === "/reset-password")
  ) {
    return NextResponse.redirect(
      new URL(withInstitution(normalizedPath, selectedInstitution), request.url)
    );
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Determine if this route needs a role check ---
  const needsRoleCheck =
    normalizedPath.startsWith("/admin") ||
    normalizedPath.startsWith("/student") ||
    normalizedPath === "/login";

  // Resolve role + own institution slug once per request (single DB query)
  let role: string | null = null;
  let ownSlug: string | null = null;
  if (user && needsRoleCheck) {
    const info = await getUserAuthInfo(supabase, user);
    role = info.role;
    ownSlug = info.slug;
  }

  // --- Tenant enforcement ---
  // A logged-in user may only use their OWN institution's URL prefix. If they
  // land on another tenant's prefix (e.g. a GANSID user opening /scago/student),
  // redirect to their own slug with a real HTTP redirect BEFORE any layout renders.
  // This is what keeps the navbar/branding from getting stuck on the wrong tenant
  // (both prefixes rewrite to the same internal route, so a client-side guard would
  // not re-render the layout). platform_admin is exempt so it can switch tenants.
  if (
    user &&
    role &&
    role !== "platform_admin" &&
    institutionSlugInPath &&
    ownSlug &&
    SUPPORTED_INSTITUTION_SLUGS.has(ownSlug) &&
    ownSlug !== institutionSlugInPath &&
    (normalizedPath.startsWith("/admin") || normalizedPath.startsWith("/student"))
  ) {
    return NextResponse.redirect(
      new URL(withInstitution(normalizedPath, ownSlug), request.url)
    );
  }

  // Handle admin login page
  if (normalizedPath.startsWith("/admin/login")) {
    if (user && role && ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (institutionSlugInPath) {
      return applyInstitutionContext(
        NextResponse.rewrite(new URL(normalizedPath, request.url), {
          request: { headers: request.headers },
        }),
        selectedInstitution
      );
    }
    return applyInstitutionContext(response, selectedInstitution);
  }

  // Protect admin routes (excluding /admin/login)
  if (normalizedPath.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL(withInstitution("/student", selectedInstitution), request.url));
    }
  }

  // Protect student routes
  if (normalizedPath.startsWith("/student")) {
    if (!user) {
      return NextResponse.redirect(new URL(withInstitution("/login", selectedInstitution), request.url));
    }
    if (role && ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Allow reset password page
  if (normalizedPath === "/reset-password") {
    if (institutionSlugInPath) {
      return applyInstitutionContext(
        NextResponse.rewrite(new URL(normalizedPath, request.url), {
          request: { headers: request.headers },
        }),
        selectedInstitution
      );
    }
    return applyInstitutionContext(response, selectedInstitution);
  }

  // Redirect authenticated users away from login page — to their OWN tenant
  // (platform_admin keeps whatever tenant prefix the URL/cookie selected).
  if (normalizedPath === "/login" && user && role) {
    const targetSlug =
      role !== "platform_admin" && ownSlug ? ownSlug : selectedInstitution;
    const dest = ADMIN_ROLES.has(role) ? "/admin" : "/student";
    return NextResponse.redirect(
      new URL(withInstitution(dest, targetSlug), request.url)
    );
  }

  if (institutionSlugInPath) {
    return applyInstitutionContext(
      NextResponse.rewrite(new URL(normalizedPath, request.url), {
        request: { headers: request.headers },
      }),
      selectedInstitution
    );
  }

  return applyInstitutionContext(response, selectedInstitution);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/login",
    "/reset-password",
    "/admin/login",
    "/:institutionSlug/admin/:path*",
    "/:institutionSlug/student/:path*",
    "/:institutionSlug/login",
    "/:institutionSlug/reset-password",
    "/:institutionSlug/admin/login",
    "/:institutionSlug/patient-organizations",
    "/:institutionSlug/clinicians",
    "/:institutionSlug/privacy-policy",
    "/:institutionSlug/terms-of-service",
    "/:institutionSlug",
  ],
};
