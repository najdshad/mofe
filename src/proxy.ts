import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME, csrfCookieOptions } from "@/lib/csrf";

function addSecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  }
  return response;
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(CSRF_COOKIE_NAME);
  if (!existing?.value) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), csrfCookieOptions);
  }
  return response;
}

function htmlResponse(request: NextRequest, pathname: string): NextResponse {
  return ensureCsrfCookie(request, addSecurityHeaders(NextResponse.next(), pathname));
}

function isValidSessionToken(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function authGuard(pathname: string, sessionCookie: { value: string } | undefined, nextUrl: URL): NextResponse | null {
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
    return null;
  }
  if (pathname.startsWith("/api/health")) {
    return null;
  }
  if (sessionCookie?.value && isValidSessionToken(sessionCookie.value)) {
    return null;
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loginUrl = new URL("/login", nextUrl.origin);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("mofe_session");

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  if (pathname.startsWith("/m/")) {
    const response = htmlResponse(request, pathname);
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  return authGuard(pathname, sessionCookie, request.nextUrl) ?? htmlResponse(request, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
