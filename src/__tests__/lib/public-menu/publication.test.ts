import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../../helpers";
import { prisma } from "@/lib/prisma";

const mockSave = vi.fn();

vi.mock("@/lib/storage", () => ({
  getStorage: vi.fn(() =>
    Promise.resolve({
      save: mockSave,
      delete: vi.fn(),
      getUrl: vi.fn(),
    }),
  ),
}));

import { publishVenueMenu, unpublishVenueMenu, buildPublicSnapshot } from "@/lib/public-menu/publication";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(() => {
  mockSave.mockReset();
  mockSave.mockResolvedValue({ url: "https://cdn.mofe.ir/menus/test-cafe.html", byteSize: 5120 });
});

afterEach(async () => {
  await prisma.menuPublication.deleteMany({ where: { venueId: data.venue.id } });
  await prisma.venue.update({
    where: { id: data.venue.id },
    data: { publicStatus: "draft", publishedAt: null },
  });
});

describe("publishVenueMenu", () => {
  it("creates a published MenuPublication record", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    expect(result).not.toBeNull();
    expect(result!.publication.status).toBe("published");
    expect(result!.publication.trigger).toBe("manual_publish");
    expect(result!.publication.venueId).toBe(data.venue.id);
    expect(result!.publication.createdByUserId).toBe(data.user.id);
  });

  it("sets venue publicStatus to published", async () => {
    await publishVenueMenu(data.venue.id, data.user.id);

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.publicStatus).toBe("published");
    expect(venue?.publishedAt).toBeInstanceOf(Date);
  });

  it("stores the snapshot as JSON in the publication", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    const snapshot = JSON.parse(result!.publication.snapshot!);
    expect(snapshot.venue.nameFa).toBe("کافه تست");
    expect(snapshot.venue.slug).toBe("test-cafe");
    expect(snapshot.categories).toBeInstanceOf(Array);
    expect(snapshot.generatedAt).toBeTruthy();
  });

  it("uploads rendered HTML to storage backend", async () => {
    await publishVenueMenu(data.venue.id, data.user.id);

    expect(mockSave).toHaveBeenCalledOnce();
    const [key, buffer, contentType] = mockSave.mock.calls[0];
    expect(key).toMatch(/^menus\/test-cafe-[a-f0-9]+\.html$/);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(contentType).toBe("text/html; charset=utf-8");
  });

  it("saves valid HTML to storage", async () => {
    await publishVenueMenu(data.venue.id, data.user.id);

    const [, buffer] = mockSave.mock.calls[0];
    const html = (buffer as Buffer).toString("utf-8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("کافه تست");
    expect(html).toContain("منو");
    expect(html).toContain("mofé");
    expect(html).toContain("Powered by mofé");
  });

  it("renders menu items in the uploaded HTML", async () => {
    await publishVenueMenu(data.venue.id, data.user.id);

    const [, buffer] = mockSave.mock.calls[0];
    const html = (buffer as Buffer).toString("utf-8");
    expect(html).toContain("چای نعناع");
    expect(html).toContain("Mint Tea");
    expect(html).toContain("کیک هویج");
  });

  it("sets staticAssetUrl on the publication record", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    const publication = await prisma.menuPublication.findUnique({
      where: { id: result!.publication.id },
    });
    expect(publication?.staticAssetUrl).toBe("https://cdn.mofe.ir/menus/test-cafe.html");
  });

  it("handles upload failure gracefully without breaking publish", async () => {
    mockSave.mockRejectedValue(new Error("S3 connection failed"));

    const result = await publishVenueMenu(data.venue.id, data.user.id);

    expect(result).not.toBeNull();
    expect(result!.publication.status).toBe("published");

    const publication = await prisma.menuPublication.findUnique({
      where: { id: result!.publication.id },
    });
    expect(publication?.staticAssetUrl).toBeNull();
  });

  it("includes item details in the snapshot", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    const snapshot = JSON.parse(result!.publication.snapshot!);
    const hotDrinks = snapshot.categories.find(
      (c: { nameFa: string }) => c.nameFa === "نوشیدنی‌های گرم",
    );
    expect(hotDrinks).toBeDefined();
    expect(hotDrinks.items).toHaveLength(2);

    const mintTea = hotDrinks.items.find((i: { nameFa: string }) => i.nameFa === "چای نعناع");
    expect(mintTea).toBeDefined();
  });

  it("excludes inactive categories from the snapshot", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    const snapshot = JSON.parse(result!.publication.snapshot!);
    const food = snapshot.categories.find(
      (c: { nameFa: string }) => c.nameFa === "غذا",
    );
    expect(food).toBeUndefined();
  });

  it("includes only active (non-deleted) items", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    const snapshot = JSON.parse(result!.publication.snapshot!);
    const desserts = snapshot.categories.find(
      (c: { nameFa: string }) => c.nameFa === "دسر",
    );
    expect(desserts).toBeDefined();
    expect(desserts.items).toHaveLength(1);
  });

  it("returns the snapshot in the result", async () => {
    const result = await publishVenueMenu(data.venue.id, data.user.id);

    expect(result!.snapshot).toBeDefined();
    expect(result!.snapshot.venue.nameFa).toBe("کافه تست");
  });

  it("trims old publications keeping only the last 5", async () => {
    for (let i = 0; i < 7; i++) {
      await publishVenueMenu(data.venue.id, data.user.id);
    }

    const publications = await prisma.menuPublication.findMany({
      where: { venueId: data.venue.id },
      orderBy: { createdAt: "desc" },
    });

    expect(publications).toHaveLength(5);
  });

  it("returns null for non-existent venue", async () => {
    const result = await publishVenueMenu("non-existent-venue", data.user.id);
    expect(result).toBeNull();
  });
});

describe("unpublishVenueMenu", () => {
  it("creates an unpublished MenuPublication record", async () => {
    const result = await unpublishVenueMenu(data.venue.id, data.user.id);

    expect(result.success).toBe(true);
    const latest = await prisma.menuPublication.findFirst({
      where: { venueId: data.venue.id },
      orderBy: { createdAt: "desc" },
    });
    expect(latest?.status).toBe("unpublished");
    expect(latest?.trigger).toBe("manual_unpublish");
  });

  it("sets venue publicStatus to unpublished", async () => {
    await unpublishVenueMenu(data.venue.id, data.user.id);

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.publicStatus).toBe("unpublished");
  });
});

describe("buildPublicSnapshot", () => {
  it("returns null for non-existent venue", async () => {
    const snapshot = await buildPublicSnapshot("non-existent");
    expect(snapshot).toBeNull();
  });

  it("includes venue details", async () => {
    const snapshot = await buildPublicSnapshot(data.venue.id);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.venue.nameFa).toBe("کافه تست");
    expect(snapshot!.venue.slug).toBe("test-cafe");
    expect(snapshot!.venue.publicUrl).toBe("https://menu.mofe.ir/m/test-cafe");
  });

  it("includes only active categories with items", async () => {
    const snapshot = await buildPublicSnapshot(data.venue.id);

    const categoryNames = snapshot!.categories.map((c) => c.nameFa);
    expect(categoryNames).toContain("نوشیدنی‌های گرم");
    expect(categoryNames).toContain("دسر");
    expect(categoryNames).not.toContain("غذا");
  });

  it("marks sold-out items correctly", async () => {
    const snapshot = await buildPublicSnapshot(data.venue.id);

    const hotDrinks = snapshot!.categories.find((c) => c.nameFa === "نوشیدنی‌های گرم");
    const cinnamonTea = hotDrinks!.items.find((i) => i.nameFa === "چای دارچین");
    expect(cinnamonTea?.soldOut).toBe(true);

    const mintTea = hotDrinks!.items.find((i) => i.nameFa === "چای نعناع");
    expect(mintTea?.soldOut).toBe(false);
  });

  it("includes a generatedAt timestamp", async () => {
    const snapshot = await buildPublicSnapshot(data.venue.id);

    expect(snapshot!.generatedAt).toBeTruthy();
    expect(new Date(snapshot!.generatedAt).toISOString()).toBe(snapshot!.generatedAt);
  });
});
