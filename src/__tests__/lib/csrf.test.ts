import { describe, it, expect, vi } from "vitest";

const mockCookieGet = vi.fn();
const mockHeaderGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookieGet, set: vi.fn() })),
  headers: vi.fn(() => Promise.resolve({ get: mockHeaderGet })),
}));

describe("CSRF", () => {
  describe("generateCsrfToken", () => {
    it("returns a 64-char hex string", async () => {
      const { generateCsrfToken } = await import("@/lib/csrf");
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces unique tokens on each call", async () => {
      const { generateCsrfToken } = await import("@/lib/csrf");
      const t1 = generateCsrfToken();
      const t2 = generateCsrfToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe("validateCsrf", () => {
    it("rejects when cookie token is missing", async () => {
      mockCookieGet.mockReturnValue(undefined);
      mockHeaderGet.mockReturnValue("some-token");

      const { validateCsrf } = await import("@/lib/csrf");
      await expect(validateCsrf()).rejects.toThrow("CSRF token validation failed");
    });

    it("rejects when header token is missing", async () => {
      mockCookieGet.mockReturnValue({ value: "valid-token" });
      mockHeaderGet.mockReturnValue(undefined);

      const { validateCsrf } = await import("@/lib/csrf");
      await expect(validateCsrf()).rejects.toThrow("CSRF token validation failed");
    });

    it("rejects when tokens do not match", async () => {
      mockCookieGet.mockReturnValue({ value: "cookie-token" });
      mockHeaderGet.mockReturnValue("header-token");

      const { validateCsrf } = await import("@/lib/csrf");
      await expect(validateCsrf()).rejects.toThrow("CSRF token validation failed");
    });

    it("succeeds when cookie and header tokens match", async () => {
      mockCookieGet.mockReturnValue({ value: "matching-token" });
      mockHeaderGet.mockReturnValue("matching-token");

      const { validateCsrf } = await import("@/lib/csrf");
      await expect(validateCsrf()).resolves.toBeUndefined();
    });
  });
});
