import { describe, it, expect } from "vitest";
describe("Auth pure functions", () => {
  describe("hashToken", () => {
    it("produces a SHA-256 hex hash (64 chars)", async () => {
      const { hashToken } = await import("@/lib/auth");
      const result = hashToken("test-token");
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is deterministic for the same input", async () => {
      const { hashToken } = await import("@/lib/auth");
      expect(hashToken("hello")).toBe(hashToken("hello"));
    });

    it("produces different hashes for different inputs", async () => {
      const { hashToken } = await import("@/lib/auth");
      expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
    });
  });

  describe("generateToken", () => {
    it("produces a 64-char hex string", async () => {
      const { generateToken } = await import("@/lib/auth");
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces unique tokens on each call", async () => {
      const { generateToken } = await import("@/lib/auth");
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("hashes and verifies a password correctly", async () => {
      const { hashPassword, verifyPassword } = await import("@/lib/auth");
      const hash = await hashPassword("my-password");
      expect(hash).toMatch(/^\$2[ab]\$\d+\$/);
      const valid = await verifyPassword("my-password", hash);
      expect(valid).toBe(true);
    });

    it("rejects wrong password", async () => {
      const { hashPassword, verifyPassword } = await import("@/lib/auth");
      const hash = await hashPassword("correct");
      const valid = await verifyPassword("wrong", hash);
      expect(valid).toBe(false);
    });

    it("uses bcrypt with 12 rounds", async () => {
      const { hashPassword } = await import("@/lib/auth");
      const hash = await hashPassword("test");
      expect(hash).toMatch(/^\$2[ab]\$12\$/);
    });
  });
});
