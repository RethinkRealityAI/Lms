import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  if (request.nextUrl.pathname === "/admin/login") {
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData?.role === "admin") {
        // Already authenticated as admin, redirect to dashboard
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      // If user is not admin, allow them to see the login page (they'll be signed out client-side)
    }
    return response;
  }

  // Protect admin routes (excluding /admin/login)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      // Not an admin, redirect to student dashboard or login
      return NextResponse.redirect(new URL("/student", request.url));
    }
  }

  // Protect student routes
  if (request.nextUrl.pathname.startsWith("/student")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "student") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Allow reset password page (handled by the page itself)
  if (request.nextUrl.pathname === "/reset-password") {
    return response;
  }

  // Redirect authenticated users away from login page
  if (request.nextUrl.pathname === "/login" && user) {
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else if (userData?.role === "student") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    // If role is not found, allow access to login (user might need to complete profile)
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/login", "/reset-password"],
};
