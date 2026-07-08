import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData, seedTestSale } from "../helpers";
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
import { GET } from "@/app/api/venues/[venueId]/sales/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

const UID = () => `sales-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function req(venueId: string, searchParams?: string): Request {
  const url = searchParams
    ? `http://localhost/api/venues/${venueId}/sales?${searchParams}`
    : `http://localhost/api/venues/${venueId}/sales`;
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
  await prisma.sale.deleteMany({ where: { venueId: data.venue.id } });
});

describe("Sales API authorization", () => {
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

  it("calls requireVenueAccess with userId and venueId", async () => {
    await GET(req(data.venue.id), params(data.venue.id));
    expect(mockRequireVenueAccess).toHaveBeenCalledOnce();
    expect(mockRequireVenueAccess).toHaveBeenCalledWith(data.user.id, data.venue.id);
  });
});

describe("Sales API range validation", () => {
  it("returns 400 for invalid range parameter", async () => {
    const res = await GET(req(data.venue.id, "range=invalid"), params(data.venue.id));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid range");
  });

  it("defaults to daily range when no range param is provided", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 2, completedAt: new Date(), orderId: UID(),
    });

    const res = await GET(req(data.venue.id), params(data.venue.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.range).toBe("daily");
  });
});

describe("Sales API data aggregation", () => {
  it("returns empty data array when no sales exist", async () => {
    const res = await GET(
      req(data.venue.id, "range=custom&start=2020-01-01&end=2020-01-31"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.summary.totalOrders).toBe(0);
    expect(body.summary.totalRevenue).toBe(0);
    expect(body.summary.avgOrderValue).toBe(0);
  });

  it("aggregates sales by day with custom range", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 2, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-agg-day-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 3, completedAt: new Date("2026-06-01T14:00:00Z"), orderId: "sales-agg-day-2",
    });
    await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 1, completedAt: new Date("2026-06-02T12:00:00Z"), orderId: "sales-agg-day-3",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-03"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data).toHaveLength(2);
    expect(body.data[0].date).toBe("2026-06-01");
    expect(body.data[0].orders).toBe(2);
    expect(body.data[0].revenue).toBe(300000);
    expect(body.data[0].avgOrderValue).toBe(150000);
    expect(body.data[1].date).toBe("2026-06-02");
    expect(body.data[1].orders).toBe(1);
    expect(body.data[1].revenue).toBe(150000);
    expect(body.data[1].avgOrderValue).toBe(150000);
  });

  it("correctly calculates summary", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 2, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-summary-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 3, completedAt: new Date("2026-06-01T14:00:00Z"), orderId: "sales-summary-2",
    });
    await seedTestSale(data.venue.id, {
      total: 300000, itemCount: 4, completedAt: new Date("2026-06-02T12:00:00Z"), orderId: "sales-summary-3",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-03"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.summary.totalOrders).toBe(3);
    expect(body.summary.totalRevenue).toBe(600000);
    expect(body.summary.avgOrderValue).toBe(200000);
  });

  it("returns data ordered by date ascending", async () => {
    await seedTestSale(data.venue.id, {
      total: 300000, itemCount: 1, completedAt: new Date("2026-06-03T12:00:00Z"), orderId: "sales-order-3",
    });
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 1, completedAt: new Date("2026-06-01T12:00:00Z"), orderId: "sales-order-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 1, completedAt: new Date("2026-06-02T12:00:00Z"), orderId: "sales-order-2",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-04"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data.map((d: { date: string }) => d.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  it("handles sales with zero total", async () => {
    await seedTestSale(data.venue.id, {
      total: 0, itemCount: 0, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-zero-1",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].revenue).toBe(0);
    expect(body.data[0].orders).toBe(1);
    expect(body.data[0].avgOrderValue).toBe(0);
  });

  it("respects custom date boundaries exactly", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 1, completedAt: new Date("2026-06-01T00:00:00Z"), orderId: "sales-boundary-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 1, completedAt: new Date("2026-06-03T23:59:59Z"), orderId: "sales-boundary-2",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].date).toBe("2026-06-01");
    expect(body.data[0].orders).toBe(1);
  });

  it("aggregates sales by week", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00Z"));

    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 2, completedAt: new Date("2026-06-30T10:00:00Z"), orderId: "sales-week-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 3, completedAt: new Date("2026-07-01T14:00:00Z"), orderId: "sales-week-2",
    });
    await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 1, completedAt: new Date("2026-07-08T12:00:00Z"), orderId: "sales-week-3",
    });

    const res = await GET(req(data.venue.id, "range=weekly"), params(data.venue.id));
    const body = await res.json();

    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const totalRevenue = body.data.reduce((s: number, d: { revenue: number }) => s + d.revenue, 0);
    expect(totalRevenue).toBe(450000);
    const totalOrders = body.data.reduce((s: number, d: { orders: number }) => s + d.orders, 0);
    expect(totalOrders).toBe(3);

    vi.useRealTimers();
  });

  it("aggregates sales by month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));

    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 1, completedAt: new Date("2026-06-15T10:00:00Z"), orderId: "sales-month-1",
    });
    await seedTestSale(data.venue.id, {
      total: 200000, itemCount: 2, completedAt: new Date("2026-07-10T14:00:00Z"), orderId: "sales-month-2",
    });
    await seedTestSale(data.venue.id, {
      total: 300000, itemCount: 3, completedAt: new Date("2026-07-20T12:00:00Z"), orderId: "sales-month-3",
    });

    const res = await GET(req(data.venue.id, "range=monthly"), params(data.venue.id));
    const body = await res.json();

    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const totalRevenue = body.data.reduce((s: number, d: { revenue: number }) => s + d.revenue, 0);
    expect(totalRevenue).toBe(600000);

    vi.useRealTimers();
  });

  it("aggregates sales by year", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2028-07-15T00:00:00Z"));

    await seedTestSale(data.venue.id, {
      total: 500000, itemCount: 5, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-year-1",
    });
    await seedTestSale(data.venue.id, {
      total: 600000, itemCount: 6, completedAt: new Date("2027-03-10T14:00:00Z"), orderId: "sales-year-2",
    });

    const res = await GET(req(data.venue.id, "range=yearly"), params(data.venue.id));
    const body = await res.json();

    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const totalRevenue = body.data.reduce((s: number, d: { revenue: number }) => s + d.revenue, 0);
    expect(totalRevenue).toBe(1100000);

    vi.useRealTimers();
  });
});

describe("Sales API cross-venue isolation", () => {
  it("only returns sales for the requested venue", async () => {
    const otherVenue = await prisma.venue.create({
      data: { nameFa: "کافه دیگر", slug: "other-cafe-sales", publicStatus: "draft" },
    });

    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 2, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-isolation-1",
    });
    await seedTestSale(otherVenue.id, {
      total: 999999, itemCount: 9, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-isolation-2",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data).toHaveLength(1);
    expect(body.summary.totalOrders).toBe(1);
    expect(body.summary.totalRevenue).toBe(100000);

    await prisma.venue.delete({ where: { id: otherVenue.id } });
  });
});

describe("Sales API response format", () => {
  it("returns correct metadata fields", async () => {
    await seedTestSale(data.venue.id, {
      total: 100000, itemCount: 1, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-meta-1",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.venueId).toBe(data.venue.id);
    expect(body.range).toBe("custom");
    expect(body.start).toBe("2026-06-01");
    expect(body.end).toBe("2026-06-02");
  });

  it("returns correct field types in data", async () => {
    await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 3, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-types-1",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.data[0]).toMatchObject({
      date: expect.any(String),
      orders: expect.any(Number),
      revenue: expect.any(Number),
      avgOrderValue: expect.any(Number),
    });
  });

  it("returns summary with correct field types", async () => {
    await seedTestSale(data.venue.id, {
      total: 150000, itemCount: 3, completedAt: new Date("2026-06-01T10:00:00Z"), orderId: "sales-summary-type",
    });

    const res = await GET(
      req(data.venue.id, "range=custom&start=2026-06-01&end=2026-06-02"),
      params(data.venue.id)
    );
    const body = await res.json();

    expect(body.summary).toMatchObject({
      totalOrders: expect.any(Number),
      totalRevenue: expect.any(Number),
      avgOrderValue: expect.any(Number),
    });
  });
});
