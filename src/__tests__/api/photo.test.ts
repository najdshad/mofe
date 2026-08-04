import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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

const testImageBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { POST } from "@/app/api/venues/[venueId]/items/[itemId]/photo/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function photoFormRequest(venueId: string, itemId: string, file: File | null): Request {
  const formData = new FormData();
  if (file) formData.append("photo", file);
  return new Request(`http://localhost/api/venues/${venueId}/items/${itemId}/photo`, {
    method: "POST",
    body: formData,
  });
}

function params(venueId: string, itemId: string) {
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
  mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: data.venue.id });
});

describe("POST /api/venues/[venueId]/items/[itemId]/photo", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));

    const res = await POST(
      photoFormRequest(data.venue.id, data.items.item1.id, null),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent item", async () => {
    const res = await POST(
      photoFormRequest(data.venue.id, "non-existent-id", null),
      params(data.venue.id, "non-existent-id")
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when no file is provided", async () => {
    const res = await POST(
      photoFormRequest(data.venue.id, data.items.item1.id, null),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("uploads a valid image successfully", async () => {
    const file = new File([testImageBuffer], "test.png", { type: "image/png" });

    const res = await POST(
      photoFormRequest(data.venue.id, data.items.item1.id, file),
      params(data.venue.id, data.items.item1.id)
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.photoUrl).toBeTruthy();
    expect(body.photoUrl).toContain("/uploads/");

    const updated = await prisma.menuItem.findUnique({ where: { id: data.items.item1.id } });
    expect(updated?.photoUrl).toBe(body.photoUrl);

    const filePath = path.join(process.cwd(), "public", body.photoUrl);
    try { await fs.unlink(filePath); } catch { /* ok */ }
    await prisma.menuItem.update({ where: { id: data.items.item1.id }, data: { photoUrl: null } });
  });

  it("rejects non-image file", async () => {
    const textFile = new File(["not an image"], "test.txt", { type: "text/plain" });

    const res = await POST(
      photoFormRequest(data.venue.id, data.items.item1.id, textFile),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });
});
