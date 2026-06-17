import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows the first request for a key", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const result = rateLimit("first-test", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests within the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "within-limit";
    rateLimit(key, 3, 60_000);
    rateLimit(key, 3, 60_000);
    const result = rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "exceed-limit";
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const result = rateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "window-reset";
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    expect(rateLimit(key, 2, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    const result = rateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("treats distinct keys independently", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    rateLimit("key-a", 1, 60_000);
    expect(rateLimit("key-a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("key-b", 1, 60_000).allowed).toBe(true);
  });

  it("accepts custom maxAttempts and windowMs", async () => {
    vi.useFakeTimers();
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "custom-window";
    rateLimit(key, 1, 10_000);
    expect(rateLimit(key, 1, 10_000).allowed).toBe(false);

    vi.advanceTimersByTime(10_001);
    expect(rateLimit(key, 1, 10_000).allowed).toBe(true);
  });

  it("blocks immediately when maxAttempts is 0", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "zero-max";
    rateLimit(key, 0, 60_000);
    const result = rateLimit(key, 0, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns correct remaining count", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const key = "remaining-count";
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(0);
    expect(rateLimit(key, 5, 60_000).allowed).toBe(false);
  });
});
