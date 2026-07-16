import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData, seedTestSale, seedTestSaleItem } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>(
    "@/lib/api-helpers"
  );
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
import { GET } from "@/app/api/venues/[venueId]/sales/export/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

const UID = () =>
  `sale-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function req(venueId: string, searchParams?: string): Request {
  const url = searchParams
    ? `http://localhost/api/venues/${venueId}/sales/export?${searchParams}`
    : `http://localhost/api/venues/${venueId}/sales/export`;
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
  mockRequireVenueAccess.mockImplementation(
    async (_userId: string, venueId: string) => {
      if (venueId === data.venue.id)
        return {
          role: "owner" as const,
          userId: data.user.id,
          venueId: data.venue.id,
        };
      throw new ApiError("Unauthorized: no access to this venue", 401);
    }
  );
});

afterEach(async () => {
  await prisma.saleItem.deleteMany({
    where: { sale: { venueId: data.venue.id } },
  });
  await prisma.sale.deleteMany({ where: { venueId: data.venue.id } });
});

describe("Authorization", () => {
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
});

describe("Invalid type", () => {
  it("returns 400 for unknown type", async () => {
    const res = await GET(
      req(data.venue.id, "type=unknown"),
      params(data.venue.id)
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid type");
  });
});

describe("Overview CSV format", () => {
  it("includes correct headers with BOM", async () => {
    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-01-01&end=2026-01-31"),
      params(data.venue.id)
    );

    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
    const csv = decoder.decode(buf);
    expect(csv).toContain(
      "تاریخ,تعداد سفارش,درآمد (تومان),میانگین هر سفارش (تومان)"
    );
  });

  it("contains correct aggregated data rows", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000,
      itemCount: 2,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSale(data.venue.id, {
      total: 200000,
      itemCount: 3,
      completedAt: new Date("2026-06-01T14:00:00Z"),
      orderId: UID(),
    });

    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=overview"
      ),
      params(data.venue.id)
    );
    const csv = await res.text();

    expect(csv).toContain("2026-06-01,2,300000,150000");
  });
});

describe("Items CSV format", () => {
  it("includes correct headers with BOM", async () => {
    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-01-01&end=2026-01-31&type=items"),
      params(data.venue.id)
    );

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
    const csv = decoder.decode(buf);
    expect(csv).toContain("تاریخ,نام آیتم,تغییرات,تعداد,قیمت واحد,مجموع قیمت,ایستگاه");
  });

  it("contains correct item detail rows", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 150000,
      itemCount: 2,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSaleItem(sale.id, {
      menuItemName: "چای نعناع",
      variantName: null,
      quantity: 2,
      unitPrice: 75000,
      totalPrice: 150000,
      station: "kitchen",
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=items"
      ),
      params(data.venue.id)
    );
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.length > 0);

    expect(lines.length).toBe(2);
    expect(lines[1]).toBe("2026-06-01,چای نعناع,,2,75000,150000,kitchen");
  });

  it("shows variant name when present", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 190000,
      itemCount: 1,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSaleItem(sale.id, {
      menuItemName: "کیک هویج",
      variantName: "بزرگ",
      quantity: 1,
      unitPrice: 190000,
      totalPrice: 190000,
      station: "kitchen",
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=items"
      ),
      params(data.venue.id)
    );
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.length > 0);

    expect(lines[1]).toBe("2026-06-01,کیک هویج,بزرگ,1,190000,190000,kitchen");
  });
});

describe("Empty data", () => {
  it("returns CSV with headers only for both types", async () => {
    const overviewRes = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-01-01&end=2026-01-31&type=overview"
      ),
      params(data.venue.id)
    );
    const overviewCsv = await overviewRes.text();
    const overviewLines = overviewCsv
      .split("\n")
      .filter((l) => l.length > 0);
    expect(overviewLines).toHaveLength(1);
    expect(overviewLines[0]).toBe(
      "تاریخ,تعداد سفارش,درآمد (تومان),میانگین هر سفارش (تومان)"
    );

    const itemsRes = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-01-01&end=2026-01-31&type=items"
      ),
      params(data.venue.id)
    );
    const itemsCsv = await itemsRes.text();
    const itemsLines = itemsCsv.split("\n").filter((l) => l.length > 0);
    expect(itemsLines).toHaveLength(1);
    expect(itemsLines[0]).toBe(
      "تاریخ,نام آیتم,تغییرات,تعداد,قیمت واحد,مجموع قیمت,ایستگاه"
    );
  });
});

describe("Formula injection", () => {
  it("prefixes item names starting with = with a single quote", async () => {
    const sale = await seedTestSale(data.venue.id, {
      total: 50000,
      itemCount: 1,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSaleItem(sale.id, {
      menuItemName: "=SUM(A1:A10)",
      quantity: 1,
      unitPrice: 50000,
      totalPrice: 50000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=items"
      ),
      params(data.venue.id)
    );
    const csv = await res.text();

    expect(csv).toContain("'=SUM(A1:A10)");
  });
});

describe("Cross-venue isolation", () => {
  it("does not include items from other venues", async () => {
    const otherVenue = await prisma.venue.create({
      data: {
        nameFa: "کافه دیگر",
        slug: `other-cafe-export-${Date.now()}`,
        publicStatus: "draft",
      },
    });

    const ourSale = await seedTestSale(data.venue.id, {
      total: 100000,
      itemCount: 1,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSaleItem(ourSale.id, {
      menuItemName: "چای ما",
      quantity: 1,
      unitPrice: 100000,
      totalPrice: 100000,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const theirSale = await seedTestSale(otherVenue.id, {
      total: 999999,
      itemCount: 9,
      completedAt: new Date("2026-06-01T10:00:00Z"),
      orderId: UID(),
    });
    await seedTestSaleItem(theirSale.id, {
      menuItemName: "چای آنها",
      quantity: 9,
      unitPrice: 111111,
      totalPrice: 999999,
      completedAt: new Date("2026-06-01T10:00:00Z"),
    });

    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=items"
      ),
      params(data.venue.id)
    );
    const csv = await res.text();

    expect(csv).toContain("چای ما");
    expect(csv).not.toContain("چای آنها");

    await prisma.saleItem.deleteMany({
      where: { sale: { venueId: otherVenue.id } },
    });
    await prisma.sale.deleteMany({ where: { venueId: otherVenue.id } });
    await prisma.venue.delete({ where: { id: otherVenue.id } });
  });
});

describe("Content-Disposition header", () => {
  it("returns correct filename in Content-Disposition", async () => {
    const res = await GET(
      req(
        data.venue.id,
        "range=custom&start=2026-06-01&end=2026-06-02&type=overview"
      ),
      params(data.venue.id)
    );

    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="sales-.+-overview-2026-06-01-2026-06-02\.csv"$/
    );
  });
});
