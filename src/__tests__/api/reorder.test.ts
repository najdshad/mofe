import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { POST as reorderCategories } from "@/app/api/venues/[venueId]/categories/reorder/route";
import { POST as reorderItems } from "@/app/api/venues/[venueId]/items/reorder/route";
import { POST as bulkDelete } from "@/app/api/venues/[venueId]/items/bulk-delete/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function req(venueId: string, body: unknown): Request {
  return new Request(`http://localhost/api/venues/${venueId}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockRequireVenueAccess.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockImplementation(async (_userId: string, venueId: string) => {
    if (venueId === data.venue.id) return { userId: data.user.id, venueId: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
});

afterEach(async () => {
  await prisma.menuItem.deleteMany({ where: { venueId: data.venue.id, nameFa: { startsWith: "TEST_" } } });
  await prisma.category.deleteMany({ where: { venueId: data.venue.id, nameFa: { startsWith: "TEST_" } } });
});

describe("POST /api/venues/[venueId]/categories/reorder", () => {
  it("persists the new displayOrder for each category", async () => {
    const { cat1: catA, cat2: catB, cat3: catC } = data.categories;

    const res = await reorderCategories(
      req(data.venue.id, { orders: [{ id: catC.id, displayOrder: 1 }, { id: catB.id, displayOrder: 2 }, { id: catA.id, displayOrder: 3 }] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const cats = await prisma.category.findMany({
      where: { id: { in: [catA.id, catB.id, catC.id] } },
      orderBy: { displayOrder: "asc" },
    });
    expect(cats.map((c) => c.id)).toEqual([catC.id, catB.id, catA.id]);
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await reorderCategories(
      req(data.venue.id, { orders: [] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/venues/[venueId]/items/reorder", () => {
  it("persists the new displayOrder for each item", async () => {
    const res = await reorderItems(
      req(data.venue.id, { orders: [{ id: data.items.item2.id, displayOrder: 1 }, { id: data.items.item1.id, displayOrder: 2 }] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);

    const item1 = await prisma.menuItem.findUnique({ where: { id: data.items.item1.id } });
    const item2 = await prisma.menuItem.findUnique({ where: { id: data.items.item2.id } });
    expect(item1?.displayOrder).toBe(2);
    expect(item2?.displayOrder).toBe(1);
  });
});

describe("POST /api/venues/[venueId]/items/bulk-delete", () => {
  it("soft-deletes only the listed items", async () => {
    const keep = await prisma.menuItem.create({
      data: { venueId: data.venue.id, categoryId: data.categories.cat1.id, nameFa: "TEST_باقی", priceToman: 1000, displayOrder: 90 },
    });
    const delA = await prisma.menuItem.create({
      data: { venueId: data.venue.id, categoryId: data.categories.cat1.id, nameFa: "TEST_حذف۱", priceToman: 1000, displayOrder: 91 },
    });
    const delB = await prisma.menuItem.create({
      data: { venueId: data.venue.id, categoryId: data.categories.cat1.id, nameFa: "TEST_حذف۲", priceToman: 1000, displayOrder: 92 },
    });

    const res = await bulkDelete(
      req(data.venue.id, { itemIds: [delA.id, delB.id] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedCount).toBe(2);

    const deleted = await prisma.menuItem.findMany({
      where: { id: { in: [delA.id, delB.id] } },
    });
    expect(deleted.every((i) => i.deletedAt)).toBe(true);

    const kept = await prisma.menuItem.findUnique({ where: { id: keep.id } });
    expect(kept?.deletedAt).toBeNull();
  });

  it("does not delete items belonging to another venue", async () => {
    const otherVenue = await prisma.venue.create({
      data: { ownerId: data.user.id, nameFa: "کافه دیگر", slug: "other-" + Date.now() },
    });
    const foreign = await prisma.menuItem.create({
      data: { venueId: otherVenue.id, categoryId: data.categories.cat1.id, nameFa: "TEST_خارجی", priceToman: 1000, displayOrder: 93 },
    });

    const res = await bulkDelete(
      req(data.venue.id, { itemIds: [foreign.id, "non-existent-id"] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deletedCount).toBe(0);

    const stillThere = await prisma.menuItem.findUnique({ where: { id: foreign.id } });
    expect(stillThere?.deletedAt).toBeNull();
  });

  it("removes photo files of deleted items", async () => {
    const withPhoto = await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "TEST_عکس",
        priceToman: 1000,
        displayOrder: 94,
        photoUrl: "/uploads/test-bulk-delete.webp",
      },
    });
    const filePath = path.join(process.cwd(), "public", "uploads", "test-bulk-delete.webp");
    await fs.writeFile(filePath, "fake");

    try {
      const res = await bulkDelete(
        req(data.venue.id, { itemIds: [withPhoto.id] }),
        params(data.venue.id)
      );
      expect(res.status).toBe(200);
      await expect(fs.access(filePath)).rejects.toThrow();
    } finally {
      try { await fs.unlink(filePath); } catch { /* ok */ }
    }
  });
});
