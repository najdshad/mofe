import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DASHBOARD_PATHS = ["/login", "/forgot-password", "/reset-password", "/venues", "/admin", "/api"];

function matchesDashboard(pathname: string): boolean {
  return DASHBOARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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
  const isApp = !isLocalhost && hostname.startsWith("app.");
  const isMenu = !isLocalhost && hostname.startsWith("menu.");
  const isRoot = !isApp && !isMenu && !isLocalhost;

  if (isMenu) {
    return NextResponse.next();
  }

  if (isApp) {
    if (pathname === "/") {
      if (sessionCookie?.value) {
        return NextResponse.redirect(new URL("/venues", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
      if (!sessionCookie?.value) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  if (isRoot) {
    if (pathname === "/") {
      return NextResponse.next();
    }

    if (matchesDashboard(pathname)) {
      const appUrl = new URL(pathname, `https://app.${hostname}`);
      return NextResponse.redirect(appUrl, 301);
    }

    if (pathname.startsWith("/m/")) {
      const menuUrl = new URL(pathname, `https://menu.${hostname}`);
      return NextResponse.redirect(menuUrl, 301);
    }
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/")) {
    if (!sessionCookie?.value) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
