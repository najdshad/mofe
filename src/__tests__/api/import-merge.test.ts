import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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
import { POST as preview } from "@/app/api/venues/[venueId]/items/import-csv/preview/route";
import { POST as importCsv } from "@/app/api/venues/[venueId]/items/import-csv/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function postReq(venueId: string, body: unknown): Request {
  return new Request(`http://localhost/api/venues/${venueId}/items/import-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const HEADER =
  "nameFa,nameEn,categoryNameFa,priceToman,description,calories,isSoldOut,allergenCodes,variants,prices";

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

describe("POST /items/import-csv/preview", () => {
  const csv = [
    HEADER,
    "چای تازه,New Tea,دسر,10000,,,false,,,",
    "نوشیدنی تازه,Cold Drink,نوشیدنی سرد,20000,,,false,,,",
    ",No Name,دسر,1000,,,,,,",
    "چای بد,Bad,دسر,1000,,,false,nonexistent,,",
  ].join("\n");

  it("reports valid/invalid rows and current menu counts without writing", async () => {
    const res = await preview(postReq(data.venue.id, { csv }), params(data.venue.id));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.summary).toMatchObject({
      validCount: 2,
      invalidCount: 2,
      currentItemCount: 3,
    });
    expect(body.rows.map((r: { nameFa: string }) => r.nameFa)).toEqual([
      "چای تازه",
      "نوشیدنی تازه",
    ]);
    expect(body.invalid).toHaveLength(2);
    expect(body.newCategories).toEqual(["نوشیدنی سرد"]);

    // Dry-run: nothing changed in DB
    expect(
      await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "چای تازه" } })
    ).toBeNull();
  });

  it("returns 400 for a bad file", async () => {
    const res = await preview(postReq(data.venue.id, { csv: "" }), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await preview(
      postReq(data.venue.id, { csv: `${HEADER}\nچای,Tea,دسر,1000,,,,,,` }),
      params(data.venue.id)
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /items/import-csv skipRows", () => {
  it("excludes chosen rows while still replacing the menu", async () => {
    const csv = [
      HEADER,
      "چای نگه‌داشته‌شده,Kept,دسر,10000,,,false,,,",
      "چای کنارگذاشته‌شده,Dropped,دسر,20000,,,false,,,",
    ].join("\n");
    const res = await importCsv(
      postReq(data.venue.id, { csv, skipRows: [3] }),
      params(data.venue.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.created).toBe(1);
    expect(body.summary.skipped).toBe(1);

    expect(
      await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "چای نگه‌داشته‌شده" } })
    ).not.toBeNull();
    expect(
      await prisma.menuItem.findFirst({ where: { venueId: data.venue.id, nameFa: "چای کنارگذاشته‌شده" } })
    ).toBeNull();

    // Replace semantics kept: previous menu items are soft-deleted
    const old = await prisma.menuItem.findFirst({
      where: { venueId: data.venue.id, nameFa: "چای نعناع" },
    });
    expect(old?.deletedAt).not.toBeNull();
  });
});
