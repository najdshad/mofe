import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";

async function cleanRateLimit() {
  await prisma.rateLimitEntry.deleteMany();
}

describe("rateLimit", () => {
  beforeAll(async () => {
    await cleanRateLimit();
  });

  it("allows the first request for a key", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "first-test-" + Date.now();
    const result = await rateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests within the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "within-limit-" + Date.now();
    await rateLimit(key, 3, 60_000);
    await rateLimit(key, 3, 60_000);
    const result = await rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "exceed-limit-" + Date.now();
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    const result = await rateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "window-reset-" + Date.now();
    await rateLimit(key, 2, 100);
    await rateLimit(key, 2, 100);
    expect((await rateLimit(key, 2, 100)).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 150));
    const result = await rateLimit(key, 2, 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  }, 10000);

  it("treats distinct keys independently", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const keyA = "independent-a-" + Date.now();
    const keyB = "independent-b-" + Date.now();
    await rateLimit(keyA, 1, 60_000);
    expect((await rateLimit(keyA, 1, 60_000)).allowed).toBe(false);
    expect((await rateLimit(keyB, 1, 60_000)).allowed).toBe(true);
  });

  it("accepts custom maxAttempts and windowMs", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "custom-window-" + Date.now();
    await rateLimit(key, 1, 100);
    expect((await rateLimit(key, 1, 100)).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, 150));
    expect((await rateLimit(key, 1, 100)).allowed).toBe(true);
  }, 10000);

  it("blocks immediately when maxAttempts is 0", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "zero-max-" + Date.now();
    await rateLimit(key, 0, 60_000);
    const result = await rateLimit(key, 0, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "remaining-count-" + Date.now();
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(4);
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(3);
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(2);
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 5, 60_000)).remaining).toBe(0);
    expect((await rateLimit(key, 5, 60_000)).allowed).toBe(false);
  });
});
