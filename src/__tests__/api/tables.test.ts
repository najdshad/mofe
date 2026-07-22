import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
  canManage: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess, canManage } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { GET, POST } from "@/app/api/venues/[venueId]/tables/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;
const mockCanManage = canManage as ReturnType<typeof vi.fn>;

function req(venueId: string, method = "GET", body?: unknown): Request {
  const url = `http://localhost/api/venues/${venueId}/tables`;
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
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
  mockCanManage.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockImplementation(async (_userId: string, venueId: string) => {
    if (venueId === data.venue.id) return { role: "owner" as const, userId: data.user.id, venueId: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
  mockCanManage.mockImplementation(async (userId: string, venueId: string) => {
    if (venueId === data.venue.id) return true;
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
});

afterEach(async () => {
  await prisma.venueTable.deleteMany({ where: { venueId: data.venue.id, number: { gte: 100 } } });
});

describe("GET /api/venues/[venueId]/tables", () => {
  it("returns tables ordered by number", async () => {
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeInstanceOf(Array);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/venues/[venueId]/tables", () => {
  it("creates a new table with label", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { number: 100, label: "TEST_ویژه" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.number).toBe(100);
    expect(body.label).toBe("TEST_ویژه");
    expect(body.isActive).toBe(true);
  });

  it("creates a new table without label", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { number: 101 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.number).toBe(101);
    expect(body.label).toBeNull();
  });

  it("returns 400 when number is missing", async () => {
    const res = await POST(req(data.venue.id, "POST", {}), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("returns 400 when number is not a number", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { number: "abc" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when number is less than 1", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { number: 0 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when number already exists", async () => {
    await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 200, isActive: true, label: "موجود" },
    });

    const res = await POST(
      req(data.venue.id, "POST", { number: 200 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("قبلاً ثبت شده است");
  });

  it("returns 403 when user cannot manage", async () => {
    mockCanManage.mockResolvedValue(false);
    const res = await POST(
      req(data.venue.id, "POST", { number: 300 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await POST(
      req(data.venue.id, "POST", { number: 300 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when table limit is exceeded", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });

    try {
      await prisma.subscription.update({
        where: { venueId: data.venue.id },
        data: { planId: basicPlan!.id },
      });

      for (let i = 1; i <= 3; i++) {
        await prisma.venueTable.create({
          data: { venueId: data.venue.id, number: 900 + i, isActive: true },
        });
      }

      const res = await POST(
        req(data.venue.id, "POST", { number: 999 }),
        params(data.venue.id)
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("تعداد میزها");
      expect(body.upgradeUrl).toBe(`/admin/${data.venue.id}/billing`);
      expect(body.limit).toEqual({ current: 3, max: 3 });
    } finally {
      await prisma.subscription.update({
        where: { venueId: data.venue.id },
        data: { planId: premiumPlan!.id },
      });
      await prisma.venueTable.deleteMany({
        where: { venueId: data.venue.id, number: { gte: 900 } },
      });
    }
  });
});
