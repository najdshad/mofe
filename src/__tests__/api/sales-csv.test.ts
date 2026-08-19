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
import { GET as exportCsv } from "@/app/api/venues/[venueId]/ledger/export-csv/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function req(venueId: string, query = ""): Request {
  return new Request(`http://localhost/api/venues/${venueId}/ledger/export-csv${query}`);
}

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(async () => {
  mockRequireAuth.mockReset();
  mockRequireVenueAccess.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: data.venue.id });
  await prisma.saleLineItem.deleteMany({ where: { ledgerEntry: { venueId: data.venue.id } } });
  await prisma.ledgerEntry.deleteMany({ where: { venueId: data.venue.id } });
});

describe("GET /ledger/export-csv", () => {
  it("exports entries with BOM, headers, and line-item summaries", async () => {
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "sale",
        amountToman: 240000,
        occurredAt: new Date("2026-08-01T12:00:00Z"),
        saleItems: {
          create: [
            {
              menuItemId: data.items.item1.id,
              itemName: "چای نعناع",
              unitPriceToman: 75000,
              quantity: 2,
              totalToman: 150000,
            },
            {
              menuItemId: data.items.item2.id,
              itemName: "چای دارچین",
              variantName: "بزرگ",
              unitPriceToman: 90000,
              quantity: 1,
              totalToman: 90000,
            },
          ],
        },
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "expense",
        amountToman: 50000,
        description: "اجاره",
        tags: "هزینه,اداری",
        occurredAt: new Date("2026-08-02T12:00:00Z"),
      },
    });

    const res = await exportCsv(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(`ledger-${data.venue.id}.csv`);

    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain("type,occurredAt,amountToman,description,tags,items");
    expect(csv).toContain("sale");
    expect(csv).toContain("240000");
    expect(csv).toContain("چای دارچین (بزرگ) x1 | چای نعناع x2");
    expect(csv).toContain("expense");
    expect(csv).toContain("50000");
    expect(csv).toContain("اجاره");
    expect(csv).toContain("هزینه,اداری");
  });

  it("filters by from/to range and type", async () => {
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "sale",
        amountToman: 10000,
        occurredAt: new Date("2026-07-01T12:00:00Z"),
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "expense",
        amountToman: 20000,
        occurredAt: new Date("2026-07-15T12:00:00Z"),
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "sale",
        amountToman: 30000,
        occurredAt: new Date("2026-08-10T12:00:00Z"),
      },
    });

    const res = await exportCsv(
      req(
        data.venue.id,
        `?from=${encodeURIComponent("2026-08-01T00:00:00.000Z")}&to=${encodeURIComponent("2026-08-31T23:59:59.999Z")}&type=sale`,
      ),
      params(data.venue.id),
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("30000");
    expect(csv).not.toContain("10000");
    expect(csv).not.toContain("20000");
  });

  it("rejects an invalid range", async () => {
    const res = await exportCsv(
      req(data.venue.id, `?from=${encodeURIComponent("not-a-date")}`),
      params(data.venue.id),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid type", async () => {
    const res = await exportCsv(req(data.venue.id, "?type=refund"), params(data.venue.id));
    expect(res.status).toBe(400);
  });

  it("prefixes formula-injection cells with a quote", async () => {
    await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "expense",
        amountToman: 1000,
        description: "=HYPERLINK(\"http://evil\")",
        occurredAt: new Date("2026-08-03T12:00:00Z"),
      },
    });

    const res = await exportCsv(req(data.venue.id), params(data.venue.id));
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await exportCsv(req(data.venue.id), params(data.venue.id));
    expect(res.status).toBe(401);
  });
});