import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MARKETING_PATHS } from "@/features/marketing/locales";

const ACCESS_TOKEN_COOKIE = "access_token";
// Outlives the 15-minute access token: while it is there the backend can still renew the access token.
const SESSION_COOKIE = "orbit_session";
const PUBLIC_PATHS = ["/login", "/forgot-password", "/register", "/invite"];

/**
 * UX-only redirect based on cookie *presence*, not validity - this cannot read an httpOnly
 * cookie's content, and it must not try to. The backend is the only place that actually
 * verifies the token and enforces authorization (CLAUDE.md section 9); a stale/expired
 * cookie just means the first API call from /dashboard returns 401 and the page redirects.
 */
export function middleware(request: NextRequest) {
  // The marketing page ("/" and its other languages, "/en") is public for everyone; its call to action leads to
  // /login, which forwards a signed-in visitor to the dashboard.
  if (MARKETING_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(SESSION_COOKIE);
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // An invitation link must open for everyone: a signed-in visitor is told on the page itself to
  // sign out first, instead of being silently bounced to the dashboard.
  if (request.nextUrl.pathname.startsWith("/invite")) {
    return NextResponse.next();
  }

  if (!hasSessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Also skip static image files under public/ (e.g. the Orbit wordmark on /login) - without
  // this, an unauthenticated request for them would get redirected to /login like any other
  // non-allow-listed path, breaking the very page that's supposed to show them.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)"],
};
