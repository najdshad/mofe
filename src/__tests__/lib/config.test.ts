import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicMenuUrl", () => {
  it("uses default menu domain when env is not set", async () => {
    vi.stubEnv("MENU_DOMAIN", "");
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("noghteh");
    expect(url).toBe("https://menu.mofe.ir/m/noghteh");
  });

  it("uses MENU_DOMAIN env var when set", async () => {
    vi.stubEnv("MENU_DOMAIN", "menu.example.com");
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("my-cafe");
    expect(url).toBe("https://menu.example.com/m/my-cafe");
  });

  it("handles slugs with Latin characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("test-cafe-123");
    expect(url).toBe("https://menu.mofe.ir/m/test-cafe-123");
  });

  it("handles Persian slug characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("کافه");
    expect(url).toBe("https://menu.mofe.ir/m/کافه");
  });

  it("handles empty slug", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("");
    expect(url).toBe("https://menu.mofe.ir/m/");
  });

  it("handles slug with special characters", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("cafe#1");
    expect(url).toBe("https://menu.mofe.ir/m/cafe#1");
  });

  it("does not URL-encode path traversal in slug", async () => {
    vi.resetModules();
    const { getPublicMenuUrl } = await import("@/lib/config");
    const url = getPublicMenuUrl("../admin");
    expect(url).toBe("https://menu.mofe.ir/m/../admin");
  });

  it("reads config from current env vars", async () => {
    vi.stubEnv("ROOT_DOMAIN", "example.com");
    vi.stubEnv("APP_DOMAIN", "app.example.com");
    vi.stubEnv("MENU_DOMAIN", "menu.example.com");
    vi.resetModules();
    const { config } = await import("@/lib/config");
    expect(config.rootDomain).toBe("example.com");
    expect(config.appDomain).toBe("app.example.com");
    expect(config.menuDomain).toBe("menu.example.com");
  });
});
