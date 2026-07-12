import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";

function createMockRequest({
  pathname,
  host,
  hasCookie,
}: {
  pathname: string;
  host: string;
  hasCookie: boolean;
}): NextRequest {
  const url = `https://${host}${pathname}`;
  const request = new Request(url, { headers: { host } });
  (request as unknown as Record<string, unknown>).nextUrl = new URL(url);
  (request as unknown as Record<string, unknown>).cookies = {
    get: () => (hasCookie ? { value: "session-token" } : undefined),
  };
  return request as unknown as NextRequest;
}

describe("Proxy routing (#19)", () => {
  it("menu subdomain always passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/m/some-cafe",
      host: "menu.example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("app subdomain + /admin without cookie redirects to login", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1/menu",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("/login");
  });

  it("app subdomain + /admin with cookie passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1/menu",
      host: "app.example.com",
      hasCookie: true,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("app subdomain + /api without cookie returns 401", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/venues",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(401);
  });

  it("/api/auth bypasses auth check", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/auth/login",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("root domain + /admin redirects to app subdomain", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1",
      host: "example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(301);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("app.example.com");
  });

  it("root domain + /m/ redirects to menu subdomain", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/m/some-cafe",
      host: "example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.status).toBe(301);
    const location = res.headers.get("Location") || "";
    expect(location).toContain("menu.example.com");
  });

  it("_next path always passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/_next/static/chunks/main.js",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("localhost bypasses subdomain routing", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1",
      host: "localhost:3000",
      hasCookie: true,
    });
    const res = proxy(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
