import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedMenuHtml, clearMenuCache } from "@/lib/public-menu/menu-cache";

function build(html: string | null) {
  return vi.fn(async () => html);
}

describe("getCachedMenuHtml", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMenuCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("serves cached html within ttl and rebuilds after expiry", async () => {
    const fn = build("v1");

    expect(await getCachedMenuHtml("a", fn, 60_000)).toBe("v1");
    expect(await getCachedMenuHtml("a", fn, 60_000)).toBe("v1");
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    expect(await getCachedMenuHtml("a", fn, 60_000)).toBe("v1");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("keeps slugs separate", async () => {
    const fnA = build("A");
    const fnB = build("B");

    expect(await getCachedMenuHtml("a", fnA, 60_000)).toBe("A");
    expect(await getCachedMenuHtml("b", fnB, 60_000)).toBe("B");
    expect(await getCachedMenuHtml("a", fnA, 60_000)).toBe("A");
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it("caches not-found results", async () => {
    const fn = build(null);

    expect(await getCachedMenuHtml("missing", fn, 60_000)).toBeNull();
    expect(await getCachedMenuHtml("missing", fn, 60_000)).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not cache when ttl is 0", async () => {
    const fn = build("live");

    expect(await getCachedMenuHtml("x", fn, 0)).toBe("live");
    expect(await getCachedMenuHtml("x", fn, 0)).toBe("live");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});