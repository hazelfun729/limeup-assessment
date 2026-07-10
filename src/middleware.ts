import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "admin_session";
const USER_SESSION_COOKIE = "user_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Protect user routes that require authentication
  const protectedUserRoutes = ["/account", "/profile", "/report", "/settings", "/payment"];
  for (const route of protectedUserRoutes) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      const userSession = request.cookies.get(USER_SESSION_COOKIE)?.value;
      const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
      if (!userSession && !adminSession) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/profile/:path*", "/report/:path*", "/settings/:path*", "/payment/:path*"],
};
