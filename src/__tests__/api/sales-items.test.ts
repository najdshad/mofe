import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData, seedTestSale, seedTestSaleItem } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { GET } from "@/app/api/venues/[venueId]/sales/items/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

const UID = () => `sales-items-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function req(venueId: string, searchParams?: string): Request {
  const url = searchParams
    ? `http://localhost/api/venues/${venueId}/sales/items?${searchParams}`
    : `http://localhost/api/venues/${venueId}/sales/items`;
  return new Request(url);
}

function params(venueId: string): { params: Promise<{ venueId: string }> } {
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
    if (venueId === data.venue.id) return { role: "owner" as const, userId: data.user.id, venueId: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
});

afterEach(async () => {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany({ where: { venueId: data.venue.id } });
});

describe("Sales Items API authorization", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));

    const res = await GET(req(data.venue.id), params(data.venue.id));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when user has no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(
      new ApiError("Unauthorized: no access to this venue", 401)
    );

    const res = await GET(req(data.venue.id), params(data.venue.id));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized: no access to this venue");
  });

  it("calls requireAuth with no arguments", async () => {
    await GET(req(data.venue.id), params(data.venue.id));
    expect(mockRequireAuth).toHaveBeenCalledOnce();
    expect(mockRequireAuth).toHaveBeenCalledWith();
  });
});

describe("Sales Items API range validation", () => {
  it("returns 400 for invalid range parameter", async () => {
    const res = await GET(req(data.venue.id, "range=invalid"), params(data.venue.id));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid range");
  });
});

describe("Sales Items API data aggregation", () => {
  it("returns empty data when no sale items exist", async () => {
    const res = await GET(
      req(data.venue.id, "range=custom&start=2020-01-01&end=2020-01-31"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.hourly).toEqual([]);
    expect(body.summary.totalItemsSold).toBe(0);
    expect(body.summary.totalItemRevenue).toBe(0);
    expect(body.summary.uniqueItems).toBe(0);
  });

  it("aggregates multiple sale items for the same menuItem", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 300000, itemCount: 3, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item1.id,
      menuItemName: "چای نعناع",
      quantity: 2,
      unitPrice: 75000,
      totalPrice: 150000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item1.id,
      menuItemName: "چای نعناع",
      quantity: 1,
      unitPrice: 75000,
      totalPrice: 75000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].menuItemId).toBe(data.items.item1.id);
    expect(body.items[0].menuItemName).toBe("چای نعناع");
    expect(body.items[0].quantity).toBe(3);
    expect(body.items[0].revenue).toBe(225000);
    expect(body.items[0].orderCount).toBe(1);
    expect(body.items[0].avgPrice).toBe(75000);
  });

  it("aggregates multiple different menuItems into separate rows", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 510000, itemCount: 4, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item1.id,
      menuItemName: "چای نعناع",
      quantity: 2,
      unitPrice: 75000,
      totalPrice: 150000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item2.id,
      menuItemName: "چای دارچین",
      quantity: 1,
      unitPrice: 85000,
      totalPrice: 85000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item3.id,
      menuItemName: "کیک هویج",
      quantity: 1,
      unitPrice: 175000,
      totalPrice: 175000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(3);
    const names = body.items.map((i: { menuItemName: string }) => i.menuItemName).sort();
    expect(names).toEqual(["چای دارچین", "چای نعناع", "کیک هویج"]);
  });

  it("computes hourly distribution correctly", async () => {
    const sale1 = await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 2, completedAt: new Date("2026-06-01T09:30:00Z"), orderId: UID(),
    });
    const sale2 = await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 2, completedAt: new Date("2026-06-01T10:15:00Z"), orderId: UID(),
    });
    const sale3 = await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 1, completedAt: new Date("2026-06-01T14:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale1.id, {
      menuItemId: data.items.item1.id, menuItemName: "چای نعناع",
      quantity: 2, unitPrice: 75000, totalPrice: 150000,
      completedAt: new Date("2026-06-01T09:30:00Z"),
    });
    await seedTestSaleItem(sale2.id, {
      menuItemId: data.items.item2.id, menuItemName: "چای دارچین",
      quantity: 2, unitPrice: 85000, totalPrice: 170000,
      completedAt: new Date("2026-06-01T10:15:00Z"),
    });
    await seedTestSaleItem(sale3.id, {
      menuItemId: data.items.item3.id, menuItemName: "کیک هویج",
      quantity: 1, unitPrice: 175000, totalPrice: 175000,
      completedAt: new Date("2026-06-01T14:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    const hours = body.hourly.map((h: { hour: number }) => h.hour);
    expect(hours).toContain(9);
    expect(hours).toContain(10);
    expect(hours).toContain(14);

    const hour9 = body.hourly.find((h: { hour: number }) => h.hour === 9);
    expect(hour9.orders).toBe(1);
    expect(hour9.items).toBe(2);
    expect(hour9.revenue).toBe(150000);

    const hour10 = body.hourly.find((h: { hour: number }) => h.hour === 10);
    expect(hour10.orders).toBe(1);
    expect(hour10.items).toBe(2);
    expect(hour10.revenue).toBe(170000);
  });

  it("sorts by revenue by default", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 0, itemCount: 3, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale.id, {
      menuItemId: "item-low", menuItemName: "آیتم کم",
      quantity: 1, unitPrice: 10000, totalPrice: 10000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: "item-high", menuItemName: "آیتم زیاد",
      quantity: 1, unitPrice: 50000, totalPrice: 50000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: "item-mid", menuItemName: "آیتم متوسط",
      quantity: 1, unitPrice: 30000, totalPrice: 30000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(3);
    expect(body.items[0].menuItemId).toBe("item-high");
    expect(body.items[1].menuItemId).toBe("item-mid");
    expect(body.items[2].menuItemId).toBe("item-low");
  });

  it("sorts by quantity when sortBy=quantity", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 0, itemCount: 3, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale.id, {
      menuItemId: "item-few", menuItemName: "آیتم کم",
      quantity: 1, unitPrice: 50000, totalPrice: 50000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: "item-many", menuItemName: "آیتم زیاد",
      quantity: 5, unitPrice: 10000, totalPrice: 50000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(sale.id, {
      menuItemId: "item-some", menuItemName: "آیتم متوسط",
      quantity: 3, unitPrice: 30000, totalPrice: 90000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02&sortBy=quantity"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(3);
    expect(body.items[0].menuItemId).toBe("item-many");
    expect(body.items[1].menuItemId).toBe("item-some");
    expect(body.items[2].menuItemId).toBe("item-few");
  });

  it("respects the limit parameter", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 0, itemCount: 5, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    for (let i = 1; i <= 5; i++) {
      await seedTestSaleItem(sale.id, {
        menuItemId: `limit-item-${i}`,
        menuItemName: `آیتم ${i}`,
        quantity: i,
        unitPrice: 10000,
        totalPrice: i * 10000,
        completedAt: new Date("2026-06-01T10:00:00Z"),
      });
    }

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02&limit=2"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(2);
  });
});

describe("Sales Items API cross-venue isolation", () => {
  it("only returns items for the requested venue", async () => {
    const otherVenue = await prisma.venue.create({
      data: { nameFa: "کافه دیگر", slug: "other-cafe-sales-items", publicStatus: "draft" },
    });

    const sale = await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 2, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });
    const otherSale = await seedTestSale(otherVenue.id, {
      total: 999999, itemCount: 5, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: UID(),
    });

    await seedTestSaleItem(sale.id, {
      menuItemId: data.items.item1.id, menuItemName: "چای نعناع",
      quantity: 2, unitPrice: 75000, totalPrice: 150000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });
    await seedTestSaleItem(otherSale.id, {
      menuItemId: "other-item", menuItemName: "آیتم دیگر",
      quantity: 5, unitPrice: 100000, totalPrice: 500000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].menuItemName).toBe("چای نعناع");
    expect(body.summary.totalItemsSold).toBe(2);
    expect(body.summary.totalItemRevenue).toBe(150000);

    await prisma.saleItem.deleteMany({ where: { saleId: otherSale.id } });
    await prisma.sale.delete({ where: { id: otherSale.id } });
    await prisma.venue.delete({ where: { id: otherVenue.id } });
  });
});
