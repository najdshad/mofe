import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/csrf", () => ({
  generateCsrfToken: () => "abc123",
  CSRF_COOKIE_NAME: "mofe_csrf",
  csrfCookieOptions: {
    httpOnly: false,
    secure: false,
    sameSite: "strict",
    path: "/",
    maxAge: 3600,
  },
}));

function createMockRequest({
  pathname,
  hasCookie,
}: {
  pathname: string;
  hasCookie: boolean;
}): NextRequest {
  const url = `https://mofe.ir${pathname}`;
  const request = new Request(url, { headers: { host: "mofe.ir" } });
  (request as unknown as Record<string, unknown>).nextUrl = new URL(url);
  (request as unknown as Record<string, unknown>).cookies = {
    get: () => (hasCookie ? { value: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" } : undefined),
  };
  return request as unknown as NextRequest;
}

describe("Proxy routing", () => {
  it("public menu /m/ passes through without auth and is noindex", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/m/some-cafe",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("/admin without cookie redirects to login", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1/menu",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("/login");
  });

  it("/admin with cookie passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1/menu",
      hasCookie: true,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("/api without cookie returns 401", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/venues",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(401);
  });

  it("/api/auth bypasses auth check", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/auth/login",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("_next path always passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/_next/static/chunks/main.js",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("root page serves without auth", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
