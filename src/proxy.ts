import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME, csrfCookieOptions } from "@/lib/csrf";

const DASHBOARD_PATHS = ["/login", "/password-reset", "/venues", "/admin", "/api"];

function matchesDashboard(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

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
  const host = request.headers.get("host") || "";
  const sessionCookie = request.cookies.get("mofe_session");

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  const hostname = host.split(":")[0];
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

  if (isLocalhost || isIpAddress) {
    return authGuard(pathname, sessionCookie, request.nextUrl) ?? htmlResponse(request, pathname);
  }

  if (hostname.startsWith("menu.")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex");
    return ensureCsrfCookie(request, response);
  }

  if (hostname.startsWith("app.")) {
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(sessionCookie?.value ? "/venues" : "/login", request.nextUrl.origin),
      );
    }
    return authGuard(pathname, sessionCookie, request.nextUrl) ?? htmlResponse(request, pathname);
  }

  if (pathname === "/") {
    return htmlResponse(request, pathname);
  }

  if (matchesDashboard(pathname)) {
    return NextResponse.redirect(new URL(pathname, `https://app.${hostname}`), 301);
  }

  if (pathname.startsWith("/m/")) {
    return NextResponse.redirect(new URL(pathname, `https://menu.${hostname}`), 301);
  }

  return htmlResponse(request, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
