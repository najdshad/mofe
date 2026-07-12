import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

let data: Awaited<ReturnType<typeof seedTestData>>;

function req(slug: string): Request {
  return new Request(`http://localhost/m/${slug}`);
}

function params(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

afterEach(async () => {
  await prisma.menuPublication.deleteMany({ where: { venueId: data.venue.id } });
  await prisma.venue.update({
    where: { id: data.venue.id },
    data: { publicStatus: "draft", publishedAt: null },
  });
});

describe("GET /m/[slug] — CDN redirect", () => {
  it("redirects to CDN when staticAssetId is an HTTP URL", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({ venue: { nameFa: "test" }, categories: [], generatedAt: new Date().toISOString() }),
        staticAssetId: "https://cdn.mofe.ir/menus/test-cafe.html",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://cdn.mofe.ir/menus/test-cafe.html");
  });

  it("serves rendered HTML when staticAssetId is null", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({
          venue: { id: data.venue.id, nameFa: "کافه تست", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test-cafe" },
          categories: [],
          generatedAt: new Date().toISOString(),
        }),
        staticAssetId: null,
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("کافه تست");
  });

  it("serves rendered HTML when staticAssetId is a local path (not HTTP)", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({
          venue: { id: data.venue.id, nameFa: "کافه تست", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test-cafe" },
          categories: [],
          generatedAt: new Date().toISOString(),
        }),
        staticAssetId: "/uploads/menus/test-cafe.html",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("serves unavailable page when venue is not published", async () => {
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "draft" },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    const html = await res.text();
    expect(html).toContain("منو در حال حاضر در دسترس نیست.");
  });

  it("returns 404 for non-existent slug", async () => {
    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("non-existent-venue"), params("non-existent-venue"));

    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("منو");
  });

  it("returns 500 when snapshot JSON is corrupted", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: "not-valid-json",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain("در دسترس نیست");
  });

  it("redirects to CDN even when cached version exists", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({ venue: { nameFa: "test" }, categories: [], generatedAt: new Date().toISOString() }),
        staticAssetId: "https://cdn.mofe.ir/menus/test-cafe-v2.html",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res1 = await GET(req("test-cafe"), params("test-cafe"));
    // First call should populate cache, second should still redirect
    const res2 = await GET(req("test-cafe"), params("test-cafe"));

    expect(res1.status).toBe(302);
    expect(res2.status).toBe(302);
    expect(res2.headers.get("Location")).toBe("https://cdn.mofe.ir/menus/test-cafe-v2.html");
  });
});

describe("GET /m/[slug] — staticAssetId edge cases", () => {
  it("redirects for https URLs", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: "{}",
        staticAssetId: "https://cdn.example.com/menu.html",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://cdn.example.com/menu.html");
  });

  it("does NOT redirect for relative paths", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({
          venue: { id: data.venue.id, nameFa: "کافه تست", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test-cafe" },
          categories: [],
          generatedAt: new Date().toISOString(),
        }),
        staticAssetId: "/uploads/menus/menu.html",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));
    expect(res.status).toBe(200);
  });

  it("does NOT redirect for empty staticAssetId", async () => {
    await prisma.menuPublication.create({
      data: {
        venueId: data.venue.id,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify({
          venue: { id: data.venue.id, nameFa: "کافه تست", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test-cafe" },
          categories: [],
          generatedAt: new Date().toISOString(),
        }),
        staticAssetId: "",
        completedAt: new Date(),
      },
    });
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { publicStatus: "published", publishedAt: new Date() },
    });

    vi.resetModules();
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));
    expect(res.status).toBe(200);
  });
});
