import { describe, it, expect, beforeEach, vi } from "vitest";

const env = process.env as Record<string, string | undefined>;

function cleanEnv() {
  delete env.ZARINPAL_MERCHANT_ID;
  delete env.ZARINPAL_CALLBACK_URL;
  env.NODE_ENV = "test";
}

describe("Zarinpal library - mock mode (no MERCHANT_ID)", () => {
  beforeEach(() => {
    cleanEnv();
    vi.resetModules();
  });

  it("returns mock authority and redirectUrl when MERCHANT_ID is not set", async () => {
    const { requestPayment } = await import("@/lib/zarinpal");
    const result = await requestPayment(1500000, "Test payment");

    expect(result.authority).toMatch(/^dev_mock_\d+$/);
    expect(result.redirectUrl).toContain("/api/billing/callback");
    expect(result.redirectUrl).toContain("Authority=");
    expect(result.redirectUrl).toContain("Status=OK");
    expect(result.redirectUrl).toContain("mock=1");
  });

  it("returns unique authorities on subsequent calls", async () => {
    const { requestPayment } = await import("@/lib/zarinpal");
    const r1 = await requestPayment(1000, "First");
    const r2 = await requestPayment(1000, "Second");

    expect(r1.authority).not.toBe(r2.authority);
  });

  it("returns success=true with dev refId on verifyPayment", async () => {
    const { verifyPayment } = await import("@/lib/zarinpal");
    const result = await verifyPayment("some-authority", 1500000);

    expect(result.success).toBe(true);
    expect(result.refId).toMatch(/^dev_ref_\d+$/);
    expect(result.cardPan).toBeUndefined();
  });
});

describe("Zarinpal library - with MERCHANT_ID set", () => {
  beforeEach(() => {
    cleanEnv();
    env.ZARINPAL_MERCHANT_ID = "test-merchant-id";
    env.ZARINPAL_CALLBACK_URL = "http://localhost/callback";
    vi.resetModules();
  });

  it("throws on network failure in requestPayment", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { requestPayment } = await import("@/lib/zarinpal");
    await expect(requestPayment(1500000, "Test")).rejects.toThrow("Network error");

    vi.restoreAllMocks();
  });

  it("returns authority data when zarinpal responds with code 100", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { code: 100, authority: "AUTH00000000000000000000000000001" } }))
    );

    const { requestPayment } = await import("@/lib/zarinpal");
    const result = await requestPayment(1500000, "Test payment");

    expect(result.authority).toBe("AUTH00000000000000000000000000001");
    expect(result.redirectUrl).toContain("StartPay/AUTH00000000000000000000000000001");

    vi.restoreAllMocks();
  });

  it("throws on non-100 zarinpal response code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ errors: { message: "Invalid merchant" }, data: { code: -1 } }))
    );

    const { requestPayment } = await import("@/lib/zarinpal");
    await expect(requestPayment(1500000, "Test")).rejects.toThrow("Invalid merchant");

    vi.restoreAllMocks();
  });

  it("sends correct request body to zarinpal", async () => {
    let capturedBody: unknown = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, opts) => {
      capturedBody = JSON.parse((opts as RequestInit).body as string);
      return new Response(JSON.stringify({ data: { code: 100, authority: "AUTH123" } }));
    });

    const { requestPayment } = await import("@/lib/zarinpal");
    await requestPayment(2500000, "Premium payment");

    expect(capturedBody).toMatchObject({
      merchant_id: "test-merchant-id",
      amount: 2500000,
      currency: "IRT",
      callback_url: "http://localhost/callback",
      description: "Premium payment",
    });

    vi.restoreAllMocks();
  });

  it("returns success=true with refId and cardPan on successful verification", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { code: 100, ref_id: "REF123", card_pan: "502229********1234" } }))
    );

    const { verifyPayment } = await import("@/lib/zarinpal");
    const result = await verifyPayment("AUTH123", 1500000);

    expect(result.success).toBe(true);
    expect(result.refId).toBe("REF123");
    expect(result.cardPan).toBe("502229********1234");

    vi.restoreAllMocks();
  });

  it("returns success=false on non-100 verification code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { code: -1 } }))
    );

    const { verifyPayment } = await import("@/lib/zarinpal");
    const result = await verifyPayment("AUTH123", 1500000);

    expect(result.success).toBe(false);
    expect(result.refId).toBe("");

    vi.restoreAllMocks();
  });

  it("sends correct request body for verification", async () => {
    let capturedBody: unknown = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, opts) => {
      capturedBody = JSON.parse((opts as RequestInit).body as string);
      return new Response(JSON.stringify({ data: { code: 100, ref_id: "REF456" } }));
    });

    const { verifyPayment } = await import("@/lib/zarinpal");
    await verifyPayment("AUTH456", 3000000);

    expect(capturedBody).toMatchObject({
      merchant_id: "test-merchant-id",
      amount: 3000000,
      authority: "AUTH456",
    });

    vi.restoreAllMocks();
  });

  it("throws on network failure in verifyPayment", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { verifyPayment } = await import("@/lib/zarinpal");
    await expect(verifyPayment("AUTH789", 1500000)).rejects.toThrow("Network error");

    vi.restoreAllMocks();
  });
});

describe("Zarinpal library - sandbox vs production detection", () => {
  beforeEach(() => {
    cleanEnv();
    vi.resetModules();
  });

  it("uses sandbox in development when merchant ID is set", async () => {
    env.ZARINPAL_MERCHANT_ID = "test-merchant-id";
    env.NODE_ENV = "development";

    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      capturedUrl = url as string;
      return new Response(JSON.stringify({ data: { code: 100, authority: "SANDBOX_AUTH" } }));
    });

    const { requestPayment } = await import("@/lib/zarinpal");
    const result = await requestPayment(1000, "Test");

    expect(capturedUrl).toContain("sandbox.zarinpal.com");
    expect(result.redirectUrl).toContain("sandbox.zarinpal.com");

    vi.restoreAllMocks();
  });

  it("uses production API in production", async () => {
    env.ZARINPAL_MERCHANT_ID = "test-merchant-id";
    env.NODE_ENV = "production";

    let capturedUrl = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      capturedUrl = url as string;
      return new Response(JSON.stringify({ data: { code: 100, authority: "PROD_AUTH" } }));
    });

    const { requestPayment } = await import("@/lib/zarinpal");
    await requestPayment(1000, "Test");

    expect(capturedUrl).toContain("api.zarinpal.com");
    expect(capturedUrl).not.toContain("sandbox");

    vi.restoreAllMocks();
  });
});
