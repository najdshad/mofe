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
import { GET, POST } from "@/app/api/venues/[venueId]/categories/route";
import { PATCH, DELETE } from "@/app/api/venues/[venueId]/categories/[categoryId]/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;
const mockCanManage = canManage as ReturnType<typeof vi.fn>;

function req(venueId: string, method = "GET", body?: unknown): Request {
  const url = `http://localhost/api/venues/${venueId}/categories`;
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
}

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function catParams(venueId: string, categoryId: string) {
  return { params: Promise.resolve({ venueId, categoryId }) };
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
  await prisma.category.deleteMany({ where: { venueId: data.venue.id, nameFa: { startsWith: "TEST_" } } });
  await prisma.category.deleteMany({ where: { venueId: data.venue.id, nameFa: { startsWith: "تست" } } });
});

describe("GET /api/venues/[venueId]/categories", () => {
  it("returns categories ordered by displayOrder", async () => {
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeInstanceOf(Array);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0].displayOrder).toBeLessThan(body[1].displayOrder);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/venues/[venueId]/categories", () => {
  it("creates a new category", async () => {
    const res = await POST(req(data.venue.id, "POST", { nameFa: "TEST_نوشیدنی سرد" }), params(data.venue.id));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nameFa).toBe("TEST_نوشیدنی سرد");
    expect(body.venueId).toBe(data.venue.id);
    expect(body.deletedAt).toBeNull();
  });

  it("returns 400 when nameFa is missing", async () => {
    const res = await POST(req(data.venue.id, "POST", {}), params(data.venue.id));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("نام دسته الزامی است");
  });

  it("returns 400 when nameFa is empty string", async () => {
    const res = await POST(req(data.venue.id, "POST", { nameFa: "" }), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("returns 403 when user cannot manage", async () => {
    mockCanManage.mockResolvedValue(false);
    const res = await POST(req(data.venue.id, "POST", { nameFa: "TEST_جدید" }), params(data.venue.id));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await POST(req(data.venue.id, "POST", { nameFa: "TEST_جدید" }), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/venues/[venueId]/categories/[categoryId]", () => {
  it("updates category name", async () => {
    const cat = data.categories.cat1;
    const res = await PATCH(
      req(data.venue.id, "PATCH", { nameFa: "TEST_نوشیدنی گرم ویرایش" }),
      catParams(data.venue.id, cat.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nameFa).toBe("TEST_نوشیدنی گرم ویرایش");

    await prisma.category.update({ where: { id: cat.id }, data: { nameFa: "نوشیدنی‌های گرم" } });
  });

  it("returns 403 when user cannot manage", async () => {
    mockCanManage.mockResolvedValue(false);
    const res = await PATCH(
      req(data.venue.id, "PATCH", { nameFa: "TEST_نفوذ" }),
      catParams(data.venue.id, data.categories.cat1.id)
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/venues/[venueId]/categories/[categoryId]", () => {
  it("prevents deleting category with items", async () => {
    const res = await DELETE(
      req(data.venue.id, "DELETE"),
      catParams(data.venue.id, data.categories.cat1.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("این دسته دارای آیتم است");
  });

  it("soft-deletes empty category", async () => {
    const cat = await prisma.category.create({
      data: { venueId: data.venue.id, nameFa: "TEST_خالی", displayOrder: 99, active: true },
    });

    const res = await DELETE(req(data.venue.id, "DELETE"), catParams(data.venue.id, cat.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const deleted = await prisma.category.findUnique({ where: { id: cat.id } });
    expect(deleted?.deletedAt).not.toBeNull();
  });
});
