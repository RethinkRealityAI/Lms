import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
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
  if (request.nextUrl.pathname.startsWith("/admin/login")) {
    if (user) {
      const role = await getUserRole(supabase, user);
      if (role === "admin") {
        // Already authenticated as admin, redirect to dashboard
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      // If user is not admin, allow them to see the login page (they'll be signed out client-side)
    }
    return response;
  }

  // Protect admin routes (excluding /admin/login)
  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const role = await getUserRole(supabase, user);
    if (role !== "admin") {
      // Not an admin, redirect to student dashboard
      return NextResponse.redirect(new URL("/student", request.url));
    }
  }

  // Protect student routes
  if (request.nextUrl.pathname.startsWith("/student")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = await getUserRole(supabase, user);
    // Allow students and anyone who isn't explicitly an admin
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Allow reset password page (handled by the page itself)
  if (request.nextUrl.pathname === "/reset-password") {
    return response;
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && user) {
    const role = await getUserRole(supabase, user);
    
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else if (role) {
      // Any other role goes to student
      return NextResponse.redirect(new URL("/student", request.url));
    }
    // If role is not found at all, allow access to login (rare edge case)
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login", "/reset-password", "/admin/login"],
};
