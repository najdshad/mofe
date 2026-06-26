import { describe, it, expect } from "vitest";

function createMockRequest({
  pathname,
  host,
  hasCookie,
}: {
  pathname: string;
  host: string;
  hasCookie: boolean;
}) {
  const url = new URL(`https://${host}${pathname}`);
  return {
    nextUrl: url,
    headers: new Map([["host", host]]),
    cookies: {
      get: () => (hasCookie ? { value: "session-token" } : undefined),
    },
  };
}

describe("Proxy routing (#19)", () => {
  it("menu subdomain always passes through", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/m/some-cafe",
      host: "menu.example.com",
      hasCookie: false,
    });
    const res = proxy(req as never);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("app subdomain + /admin without cookie redirects to login", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1/menu",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req as never);
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
    const res = proxy(req as never);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("app subdomain + /api without cookie returns 401", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/venues",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req as never);
    expect(res.status).toBe(401);
  });

  it("/api/auth bypasses auth check", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/api/auth/login",
      host: "app.example.com",
      hasCookie: false,
    });
    const res = proxy(req as never);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("root domain + /admin redirects to app subdomain", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1",
      host: "example.com",
      hasCookie: false,
    });
    const res = proxy(req as never);
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
    const res = proxy(req as never);
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
    const res = proxy(req as never);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("localhost bypasses subdomain routing", async () => {
    const { proxy } = await import("@/proxy");
    const req = createMockRequest({
      pathname: "/admin/venue-1",
      host: "localhost:3000",
      hasCookie: true,
    });
    const res = proxy(req as never);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
