import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});

vi.mock("@/lib/permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/permissions")>("@/lib/permissions");
  return { ...actual, requireVenueAccess: vi.fn() };
});

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { GET as listVenues } from "@/app/api/venues/route";
import { GET as getMe } from "@/app/api/me/route";
import { GET as getVenue, PATCH as patchVenue } from "@/app/api/venues/[venueId]/route";
import { GET as getPreview } from "@/app/api/venues/[venueId]/public-preview/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function jsonReq(url: string, method = "GET", body?: unknown): Request {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(url, opts);
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

describe("GET /api/venues", () => {
  it("returns the user's venues", async () => {
    const res = await listVenues();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((v: { id: string; slug: string }) => v.id === data.venue.id && v.slug === "test-cafe")).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await listVenues();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/me", () => {
  it("returns the user profile with venues", async () => {
    const res = await getMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("admin@test.ir");
    expect(body.user.passwordHash).toBeUndefined();
    expect(body.venues.some((v: { venueId: string }) => v.venueId === data.venue.id)).toBe(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await getMe();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/venues/[venueId]", () => {
  it("returns the venue", async () => {
    const res = await getVenue(jsonReq(`http://localhost/api/venues/${data.venue.id}`), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(data.venue.id);
    expect(body.nameFa).toBe("کافه تست");
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await getVenue(jsonReq(`http://localhost/api/venues/${data.venue.id}`), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/venues/[venueId]", () => {
  const url = (id: string) => `http://localhost/api/venues/${id}`;

  it("updates allowed fields", async () => {
    const res = await patchVenue(
      jsonReq(url(data.venue.id), "PATCH", { nameFa: "کافه تست ویرایش", welcomeMessage: "سلام" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nameFa).toBe("کافه تست ویرایش");
    expect(body.welcomeMessage).toBe("سلام");

    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { nameFa: "کافه تست", welcomeMessage: "به کافه تست خوش آمدید" },
    });
  });

  it("ignores fields outside the whitelist (slug)", async () => {
    const res = await patchVenue(
      jsonReq(url(data.venue.id), "PATCH", { slug: "hacked-slug", nameFa: "کافه تست" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.slug).toBe("test-cafe");
  });

  it("returns 400 for non-string welcomeMessage", async () => {
    const res = await patchVenue(
      jsonReq(url(data.venue.id), "PATCH", { welcomeMessage: 123 }),
      params(data.venue.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("قالب پیام خوش‌آمدگویی نامعتبر است");
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await patchVenue(
      jsonReq(url(data.venue.id), "PATCH", { nameFa: "x" }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /api/venues/[venueId]/public-preview", () => {
  it("returns a public snapshot with private cache header", async () => {
    const res = await getPreview(jsonReq(`http://localhost/api/venues/${data.venue.id}/public-preview`), params(data.venue.id));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=30");
    const body = await res.json();
    expect(body.venue.nameFa).toBe("کافه تست");
    expect(body.categories.length).toBeGreaterThan(0);
  });

  it("returns 404 for a non-existent venue", async () => {
    mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: "non-existent" });
    const res = await getPreview(
      jsonReq("http://localhost/api/venues/non-existent/public-preview"),
      params("non-existent")
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when no venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(new ApiError("Unauthorized: no access to this venue", 401));
    const res = await getPreview(jsonReq(`http://localhost/api/venues/${data.venue.id}/public-preview`), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});
