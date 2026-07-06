import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the NextResponse before importing the module
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
    })),
  },
}));

describe("ordering-proxy", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("forwards GET requests with correct headers", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ orders: [] }),
      status: 200,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders", {
      method: "GET",
      cookie: "test-session-cookie",
      venueId: "test-venue-id",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(url).toContain("/api/orders");
    expect(options.method).toBe("GET");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["X-Venue-ID"]).toBe("test-venue-id");
    expect(options.headers["Cookie"]).toBe("test-session-cookie");
    expect(options.headers["Origin"]).toBe("http://localhost:3000");
    expect(options.body).toBeUndefined();

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ orders: [] });
  });

  it("forwards POST requests with JSON body", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ orderId: "new-order-id" }),
      status: 201,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const body = { tableNumber: "5", guestCount: 2 };
    const result = await proxyToOrdering("/api/orders", {
      method: "POST",
      body,
      cookie: "session-cookie",
      venueId: "venue-1",
    });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(body);

    expect(result.status).toBe(201);
    expect(result.data).toEqual({ orderId: "new-order-id" });
  });

  it("forwards PATCH requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: "updated" }),
      status: 200,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders/order-1/items/item-1/status", {
      method: "PATCH",
      body: { status: "PREPARING" },
      cookie: "session-c",
      venueId: "venue-1",
    });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("PATCH");

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ status: "updated" });
  });

  it("forwards DELETE requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: "cancelled" }),
      status: 200,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders/order-1/items/item-1", {
      method: "DELETE",
      cookie: "session-c",
      venueId: "venue-1",
    });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("DELETE");
    expect(options.body).toBeUndefined();

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ status: "cancelled" });
  });

  it("includes query parameters in the URL", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
      status: 200,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    await proxyToOrdering("/api/orders?status=SENT", {
      method: "GET",
      cookie: "session-c",
      venueId: "venue-1",
    });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/orders?status=SENT");
  });

  it("forwards error status codes from upstream", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: "Not found", code: "NOT_FOUND" }),
      status: 404,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders/nonexistent", {
      method: "GET",
      cookie: "session-c",
      venueId: "venue-1",
    });

    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: "Not found", code: "NOT_FOUND" });
  });

  it("handles 400 validation errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: "Invalid request body", code: "INVALID_JSON" }),
      status: 400,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders", {
      method: "POST",
      body: { badField: true },
      cookie: "session-c",
      venueId: "venue-1",
    });

    expect(result.status).toBe(400);
    expect(result.data).toHaveProperty("code", "INVALID_JSON");
  });

  it("handles 401 unauthorized from upstream", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: "Unauthorized", code: "INVALID_SESSION" }),
      status: 401,
    });

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders", {
      method: "GET",
      cookie: "bad-session",
      venueId: "venue-1",
    });

    expect(result.status).toBe(401);
  });

  it("uses ORDERING_SERVICE_URL from environment", async () => {
    vi.stubEnv("ORDERING_SERVICE_URL", "https://ordering.example.com");

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
      status: 200,
    });

    vi.resetModules();
    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    await proxyToOrdering("/api/orders", {
      method: "GET",
      cookie: "session-c",
      venueId: "venue-1",
    });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("https://ordering.example.com");

    vi.unstubAllEnvs();
  });

  it("returns 503 when ordering service is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    const result = await proxyToOrdering("/api/orders", {
      method: "GET",
      cookie: "session-c",
      venueId: "venue-1",
    });

    expect(result.status).toBe(503);
    expect(result.data).toHaveProperty("code", "ORDERING_SERVICE_UNAVAILABLE");
  });

  it("defaults to localhost:8080", async () => {
    vi.stubEnv("ORDERING_SERVICE_URL", "");

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
      status: 200,
    });

    vi.resetModules();
    const { proxyToOrdering } = await import("@/lib/ordering-proxy");

    await proxyToOrdering("/api/orders", {
      method: "GET",
      cookie: "session-c",
      venueId: "venue-1",
    });

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("http://localhost:8080");

    vi.unstubAllEnvs();
  });
});
