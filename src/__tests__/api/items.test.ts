import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

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
import { GET, POST } from "@/app/api/venues/[venueId]/items/route";
import { PATCH, DELETE } from "@/app/api/venues/[venueId]/items/[itemId]/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function req(venueId: string, method = "GET", body?: unknown, searchParams?: string): Request {
  const url = searchParams
    ? `http://localhost/api/venues/${venueId}/items?${searchParams}`
    : `http://localhost/api/venues/${venueId}/items`;
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
}

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function itemParams(venueId: string, itemId: string) {
  return { params: Promise.resolve({ venueId, itemId }) };
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
});

describe("GET /api/venues/[venueId]/items", () => {
  it("returns paginated items", async () => {
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeInstanceOf(Array);
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(typeof body.take).toBe("number");
    expect(typeof body.skip).toBe("number");
  });

  it("filters items by categoryId", async () => {
    const res = await GET(
      req(data.venue.id, "GET", undefined, `categoryId=${data.categories.cat1.id}`),
      params(data.venue.id)
    );
    const body = await res.json();
    expect(body.items.every((i: { categoryId: string }) => i.categoryId === data.categories.cat1.id)).toBe(true);
  });

  it("filters items by soldOut status", async () => {
    const res = await GET(
      req(data.venue.id, "GET", undefined, "soldOut=true"),
      params(data.venue.id)
    );
    const body = await res.json();
    expect(body.items.every((i: { isSoldOut: boolean }) => i.isSoldOut === true)).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });

  it("respects take and skip pagination", async () => {
    const res = await GET(
      req(data.venue.id, "GET", undefined, "take=1&skip=0"),
      params(data.venue.id)
    );
    const body = await res.json();
    expect(body.items.length).toBeLessThanOrEqual(1);
    expect(body.take).toBe(1);
    expect(body.skip).toBe(0);
  });
});

describe("POST /api/venues/[venueId]/items", () => {
  it("creates a new item", async () => {
    const res = await POST(
      req(data.venue.id, "POST", {
        nameFa: "TEST_آیتم جدید",
        categoryId: data.categories.cat1.id,
        priceToman: 50000,
      }),
      params(data.venue.id)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nameFa).toBe("TEST_آیتم جدید");
    expect(body.priceToman).toBe(50000);
    expect(body.deletedAt).toBeNull();
  });

  it("returns 400 when nameFa is missing", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { categoryId: data.categories.cat1.id, priceToman: 50000 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام فارسی الزامی است");
  });

  it("returns 400 when categoryId is missing", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { nameFa: "TEST_بدون دسته", priceToman: 50000 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when priceToman is invalid", async () => {
    const res = await POST(
      req(data.venue.id, "POST", {
        nameFa: "TEST_قیمت بد",
        categoryId: data.categories.cat1.id,
        priceToman: -1,
      }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await POST(
      req(data.venue.id, "POST", {
        nameFa: "TEST_بدون احراز",
        categoryId: data.categories.cat1.id,
        priceToman: 50000,
      }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/venues/[venueId]/items/[itemId]", () => {
  it("updates item fields", async () => {
    const item = data.items.item1;
    const res = await PATCH(
      req(data.venue.id, "PATCH", { priceToman: 80000, nameEn: "Updated Mint Tea" }),
      itemParams(data.venue.id, item.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.priceToman).toBe(80000);
    expect(body.nameEn).toBe("Updated Mint Tea");
  });

  it("validates priceToman type", async () => {
    const res = await PATCH(
      req(data.venue.id, "PATCH", { priceToman: -100 }),
      itemParams(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 for non-existent item", async () => {
    const res = await PATCH(
      req(data.venue.id, "PATCH", { priceToman: 50000 }),
      itemParams(data.venue.id, "non-existent-id")
    );
    expect(res.status).toBe(500);
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await PATCH(
      req(data.venue.id, "PATCH", { priceToman: 50000 }),
      itemParams(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/venues/[venueId]/items/[itemId]", () => {
  it("soft-deletes an item", async () => {
    const item = data.items.item2;
    const res = await DELETE(req(data.venue.id, "DELETE"), itemParams(data.venue.id, item.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const deleted = await prisma.menuItem.findUnique({ where: { id: item.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });
});
