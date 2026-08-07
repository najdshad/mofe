import { describe, it, expect, beforeAll } from "vitest";
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

describe("GET /m/[slug]", () => {
  it("serves the rendered menu", async () => {
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("کافه تست");
    expect(html).toContain("چای نعناع");
    expect(html).toContain("ناموجود");
  });

  it("renders live DB data without a snapshot", async () => {
    await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "آیتم زنده",
        priceToman: 1000,
        displayOrder: 99,
      },
    });

    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));
    const html = await res.text();
    expect(html).toContain("آیتم زنده");
  });

  it("returns 404 for a non-existent slug", async () => {
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("non-existent-venue"), params("non-existent-venue"));

    expect(res.status).toBe(404);
  });

  it("includes category pill anchors", async () => {
    const { GET } = await import("@/app/m/[slug]/route");

    const res = await GET(req("test-cafe"), params("test-cafe"));
    const html = await res.text();
    expect(html).toContain(".category-pill");
    expect(html).toContain(`#cat-${data.categories.cat1.id}`);
  });
});
