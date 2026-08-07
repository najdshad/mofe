import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicMenuUrl", () => {
  it("uses default root domain when env is not set", async () => {
    vi.stubEnv("ROOT_DOMAIN", "");
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("noghteh");
    expect(url).toBe("https://mofe.ir/m/noghteh");
  });

  it("uses ROOT_DOMAIN env var when set", async () => {
    vi.stubEnv("ROOT_DOMAIN", "example.com");
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("my-cafe");
    expect(url).toBe("https://example.com/m/my-cafe");
  });

  it("handles slugs with Latin characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("test-cafe-123");
    expect(url).toBe("https://mofe.ir/m/test-cafe-123");
  });

  it("handles Persian slug characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("کافه");
    expect(url).toBe("https://mofe.ir/m/کافه");
  });

  it("handles empty slug", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("");
    expect(url).toBe("https://mofe.ir/m/");
  });

  it("handles slug with special characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("cafe#1");
    expect(url).toBe("https://mofe.ir/m/cafe#1");
  });

  it("rejects path traversal in slug", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    expect(() => getPublicMenuUrl("../admin")).toThrow("Invalid slug");
    expect(() => getPublicMenuUrl("foo/bar")).toThrow("Invalid slug");
    expect(() => getPublicMenuUrl("foo\\bar")).toThrow("Invalid slug");
  });

  it("reads config from current env vars", async () => {
    vi.stubEnv("ROOT_DOMAIN", "example.com");
    vi.resetModules();
    const { config } = await import("@/lib/config");
    expect(config.rootDomain).toBe("example.com");
  });
});
