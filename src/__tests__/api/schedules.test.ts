import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-helpers";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});
vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
  canManage: vi.fn(),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess, canManage } from "@/lib/permissions";
import { GET, POST } from "@/app/api/venues/[venueId]/schedules/route";

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;
const mockCanManage = canManage as ReturnType<typeof vi.fn>;

let data: Awaited<ReturnType<typeof seedTestData>>;

function req(venueId: string, method = "GET", body?: unknown): Request {
  const url = `http://localhost/api/venues/${venueId}/schedules`;
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
    if (venueId === data.venue.id) return { role: "owner", userId: data.user.id, venueId: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
  mockCanManage.mockImplementation(async (_userId: string, venueId: string) => {
    if (venueId === data.venue.id) return true;
    return false;
  });
});

afterEach(async () => {
  await prisma.stationSchedule.deleteMany({ where: { venueId: data.venue.id } });
  await prisma.auditLog.deleteMany({ where: { venueId: data.venue.id } });
});

describe("GET /api/venues/[venueId]/schedules", () => {
  it("returns empty array when no schedules exist", async () => {
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns schedules ordered by station then dayOfWeek", async () => {
    await prisma.stationSchedule.createMany({
      data: [
        { venueId: data.venue.id, station: "bar", dayOfWeek: 0, startTime: "10:00", endTime: "22:00", isActive: true },
        { venueId: data.venue.id, station: "bar", dayOfWeek: 6, startTime: "10:00", endTime: "22:00", isActive: false },
        { venueId: data.venue.id, station: "kitchen", dayOfWeek: 0, startTime: "08:00", endTime: "23:30", isActive: true },
        { venueId: data.venue.id, station: "kitchen", dayOfWeek: 5, startTime: "08:00", endTime: "23:30", isActive: true },
      ],
    });

    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(4);
    expect(body[0].station).toBe("bar");
    expect(body[0].dayOfWeek).toBe(0);
    expect(body[1].station).toBe("bar");
    expect(body[1].dayOfWeek).toBe(6);
    expect(body[2].station).toBe("kitchen");
    expect(body[2].dayOfWeek).toBe(0);
    expect(body[3].station).toBe("kitchen");
    expect(body[3].dayOfWeek).toBe(5);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user has no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await GET(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/venues/[venueId]/schedules", () => {
  const kitchenSchedule = { station: "kitchen", dayOfWeek: 0, startTime: "08:00", endTime: "23:30", isActive: true };
  const barSchedule = { station: "bar", dayOfWeek: 0, startTime: "10:00", endTime: "22:00", isActive: true };

  it("creates schedules via batch replace", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [kitchenSchedule, barSchedule] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);

    const db = await prisma.stationSchedule.findMany({ where: { venueId: data.venue.id } });
    expect(db).toHaveLength(2);
    expect(db.find((s) => s.station === "kitchen")?.startTime).toBe("08:00");
    expect(db.find((s) => s.station === "bar")?.endTime).toBe("22:00");
  });

  it("replaces existing schedules on subsequent POST", async () => {
    await POST(
      req(data.venue.id, "POST", { schedules: [kitchenSchedule, barSchedule] }),
      params(data.venue.id)
    );

    const updated = { station: "kitchen", dayOfWeek: 0, startTime: "09:00", endTime: "22:00", isActive: true };
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [updated] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].startTime).toBe("09:00");

    const db = await prisma.stationSchedule.findMany({ where: { venueId: data.venue.id } });
    expect(db).toHaveLength(1);
  });

  it("returns 400 when schedules is not an array", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { schedules: "not-an-array" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("schedules array is required");
  });

  it("returns 400 for invalid station", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [{ station: "invalid", dayOfWeek: 0, startTime: "08:00", endTime: "17:00" }] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid station");
  });

  it("returns 400 for invalid dayOfWeek", async () => {
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [{ station: "kitchen", dayOfWeek: 7, startTime: "08:00", endTime: "17:00" }] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("dayOfWeek must be 0-6");
  });

  it("returns 403 when user cannot manage", async () => {
    mockCanManage.mockResolvedValue(false);
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [kitchenSchedule] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await POST(
      req(data.venue.id, "POST", { schedules: [kitchenSchedule] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });

  it("defaults isActive to true when not provided", async () => {
    const res = await POST(
      req(data.venue.id, "POST", {
        schedules: [{ station: "kitchen", dayOfWeek: 3, startTime: "08:00", endTime: "17:00" }],
      }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].isActive).toBe(true);
  });

  it("creates all 14 schedules for both stations across 7 days", async () => {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const allSchedules = [
      ...allDays.map((d) => ({ station: "kitchen" as const, dayOfWeek: d, startTime: "08:00", endTime: "23:30", isActive: true })),
      ...allDays.map((d) => ({ station: "bar" as const, dayOfWeek: d, startTime: "10:00", endTime: "22:00", isActive: true })),
    ];

    const res = await POST(
      req(data.venue.id, "POST", { schedules: allSchedules }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(14);

    const db = await prisma.stationSchedule.findMany({ where: { venueId: data.venue.id } });
    expect(db).toHaveLength(14);
  });

  it("sets isActive to false when explicitly provided", async () => {
    const res = await POST(
      req(data.venue.id, "POST", {
        schedules: [{ station: "kitchen", dayOfWeek: 6, startTime: "08:00", endTime: "17:00", isActive: false }],
      }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].isActive).toBe(false);
  });
});
