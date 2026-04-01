import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_INSTITUTION_SLUG = "gansid";
const SUPPORTED_INSTITUTION_SLUGS = new Set(["gansid", "scago"]);
const ADMIN_ROLES = new Set(["platform_admin", "institution_admin", "instructor", "admin"]);

// Helper function to get user role from database or metadata
async function getUserRole(supabase: any, user: any): Promise<string | null> {
  // First try to get from database by id
  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role) {
    return typeof userData.role === 'string'
      ? userData.role.trim().toLowerCase()
      : userData.role;
  }

  // Fallback: try lookup by email if id match isn't present
  if (user.email) {
    const { data: emailUserData } = await supabase
      .from("users")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();

    if (emailUserData?.role) {
      return typeof emailUserData.role === 'string'
        ? emailUserData.role.trim().toLowerCase()
        : emailUserData.role;
    }
  }

  // Fallback to user metadata if profile doesn't exist
  if (user.user_metadata?.role) {
    return typeof user.user_metadata.role === 'string'
      ? user.user_metadata.role.trim().toLowerCase()
      : user.user_metadata.role;
  }

  if (user.app_metadata?.role) {
    return typeof user.app_metadata.role === 'string'
      ? user.app_metadata.role.trim().toLowerCase()
      : user.app_metadata.role;
  }

  // Default to student if nothing found
  return error ? null : 'student';
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
    (normalizedPath.startsWith("/admin") ||
      normalizedPath.startsWith("/student") ||
      normalizedPath === "/login" ||
      normalizedPath === "/reset-password")
  ) {
    return NextResponse.redirect(
      new URL(withInstitution(normalizedPath, selectedInstitution), request.url)
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
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

  // Handle admin login page - allow access but redirect if already authenticated as admin
  if (normalizedPath.startsWith("/admin/login")) {
    if (user) {
      const role = await getUserRole(supabase, user);
      if (role && ADMIN_ROLES.has(role)) {
        // Already authenticated as admin, redirect to dashboard
        return NextResponse.redirect(new URL(withInstitution("/admin", selectedInstitution), request.url));
      }
      // If user is not admin, allow them to see the login page (they'll be signed out client-side)
    }
    // Rewrite slugged request to existing route tree.
    if (institutionSlugInPath) {
      const rewritten = NextResponse.rewrite(new URL(normalizedPath, request.url), {
        request: { headers: request.headers },
      });
      rewritten.cookies.set("institution_slug", selectedInstitution, { path: "/" });
      rewritten.headers.set("x-institution-slug", selectedInstitution);
      return rewritten;
    }
    response.cookies.set("institution_slug", selectedInstitution, { path: "/" });
    response.headers.set("x-institution-slug", selectedInstitution);
    return response;
  }

  // Protect admin routes (excluding /admin/login)
  if (
    normalizedPath.startsWith("/admin") &&
    !normalizedPath.startsWith("/admin/login")
  ) {
    if (!user) {
      return NextResponse.redirect(new URL(withInstitution("/admin/login", selectedInstitution), request.url));
    }

    const role = await getUserRole(supabase, user);
    if (!role || !ADMIN_ROLES.has(role)) {
      // Not an admin, redirect to student dashboard
      return NextResponse.redirect(new URL(withInstitution("/student", selectedInstitution), request.url));
    }
  }

  // Protect student routes
  if (normalizedPath.startsWith("/student")) {
    if (!user) {
      return NextResponse.redirect(new URL(withInstitution("/login", selectedInstitution), request.url));
    }

    const role = await getUserRole(supabase, user);
    // Allow students and anyone who isn't explicitly an admin
    if (role && ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL(withInstitution("/admin", selectedInstitution), request.url));
    }
  }

  // Allow reset password page (handled by the page itself)
  if (normalizedPath === "/reset-password") {
    if (institutionSlugInPath) {
      const rewritten = NextResponse.rewrite(new URL(normalizedPath, request.url), {
        request: { headers: request.headers },
      });
      rewritten.cookies.set("institution_slug", selectedInstitution, { path: "/" });
      rewritten.headers.set("x-institution-slug", selectedInstitution);
      return rewritten;
    }
    response.cookies.set("institution_slug", selectedInstitution, { path: "/" });
    response.headers.set("x-institution-slug", selectedInstitution);
    return response;
  }

  // Redirect authenticated users away from login page
  if (normalizedPath === "/login" && user) {
    const role = await getUserRole(supabase, user);
    
    if (role && ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL(withInstitution("/admin", selectedInstitution), request.url));
    } else if (role) {
      // Any other role goes to student
      return NextResponse.redirect(new URL(withInstitution("/student", selectedInstitution), request.url));
    }
    // If role is not found at all, allow access to login (rare edge case)
  }

  if (institutionSlugInPath) {
    const rewritten = NextResponse.rewrite(new URL(normalizedPath, request.url), {
      request: { headers: request.headers },
    });
    rewritten.cookies.set("institution_slug", selectedInstitution, { path: "/" });
    rewritten.headers.set("x-institution-slug", selectedInstitution);
    return rewritten;
  }

  response.cookies.set("institution_slug", selectedInstitution, { path: "/" });
  response.headers.set("x-institution-slug", selectedInstitution);
  return response;
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
    "/:institutionSlug",
  ],
};
