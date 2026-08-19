import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData } from "../helpers";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { uploadsDir } from "@/lib/storage";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return { ...actual, requireAuth: vi.fn() };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  validateCsrf: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { POST, DELETE } from "@/app/api/venues/[venueId]/logo/route";

const testImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;
const mockRateLimit = rateLimit as ReturnType<typeof vi.fn>;

function formReq(venueId: string, file: File | null): Request {
  const formData = new FormData();
  if (file) formData.append("logo", file);
  return new Request(`http://localhost/api/venues/${venueId}/logo`, { method: "POST", body: formData });
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
  mockRateLimit.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: data.venue.id });
  mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9 });
});

afterEach(async () => {
  const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
  if (venue?.logoUrl) {
    const filePath = path.join(uploadsDir, path.basename(venue.logoUrl));
    try { await fs.unlink(filePath); } catch { /* ok */ }
  }
  await prisma.venue.update({ where: { id: data.venue.id }, data: { logoUrl: null } });
});

describe("POST /api/venues/[venueId]/logo", () => {
  it("uploads and stores the logo URL on the venue", async () => {
    const file = new File([testImageBuffer], "logo.png", { type: "image/png" });
    const res = await POST(formReq(data.venue.id, file), params(data.venue.id));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.logoUrl).toContain("/api/uploads/");
    expect(body.logoUrl).toMatch(/\.webp$/);

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.logoUrl).toBe(body.logoUrl);
  });

  it("replaces an existing logo and deletes the old file", async () => {
    const oldPath = path.join(uploadsDir, "test-old-logo.webp");
    await fs.writeFile(oldPath, "old");
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { logoUrl: "/api/uploads/test-old-logo.webp" },
    });

    const file = new File([testImageBuffer], "logo.png", { type: "image/png" });
    const res = await POST(formReq(data.venue.id, file), params(data.venue.id));
    expect(res.status).toBe(200);

    await expect(fs.access(oldPath)).rejects.toThrow();
    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.logoUrl).not.toBe("/api/uploads/test-old-logo.webp");
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });
    const file = new File([testImageBuffer], "logo.png", { type: "image/png" });
    const res = await POST(formReq(data.venue.id, file), params(data.venue.id));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(formReq(data.venue.id, null), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-image file", async () => {
    const textFile = new File(["not an image"], "logo.txt", { type: "text/plain" });
    const res = await POST(formReq(data.venue.id, textFile), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await POST(formReq(data.venue.id, null), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/venues/[venueId]/logo", () => {
  it("clears the logo and deletes the file", async () => {
    const filePath = path.join(uploadsDir, "test-del-logo.webp");
    await fs.writeFile(filePath, "logo");
    await prisma.venue.update({
      where: { id: data.venue.id },
      data: { logoUrl: "/api/uploads/test-del-logo.webp" },
    });

    const res = await DELETE(new Request(`http://localhost/api/venues/${data.venue.id}/logo`), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const venue = await prisma.venue.findUnique({ where: { id: data.venue.id } });
    expect(venue?.logoUrl).toBeNull();
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it("returns 200 when no logo exists", async () => {
    const res = await DELETE(new Request(`http://localhost/api/venues/${data.venue.id}/logo`), params(data.venue.id));
    expect(res.status).toBe(200);
  });
});
