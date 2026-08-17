import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cleanTestData, seedTestData } from "../helpers";

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

import { ApiError, requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { GET, POST } from "@/app/api/venues/[venueId]/ledger/route";
import { DELETE } from "@/app/api/venues/[venueId]/ledger/[entryId]/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function request(
  venueId: string,
  method = "GET",
  body?: unknown,
  searchParams?: string,
): Request {
  const query = searchParams ? `?${searchParams}` : "";
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  return new Request(`http://localhost/api/venues/${venueId}/ledger${query}`, options);
}

function params(venueId: string) {
  return { params: Promise.resolve({ venueId }) };
}

function entryParams(venueId: string, entryId: string) {
  return { params: Promise.resolve({ venueId, entryId }) };
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
    if (venueId === data.venue.id) return { id: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
});

afterEach(async () => {
  await prisma.saleLineItem.deleteMany({
    where: { ledgerEntry: { venueId: data.venue.id } },
  });
  await prisma.ledgerEntry.deleteMany({ where: { venueId: data.venue.id } });
});

describe("POST /api/venues/[venueId]/ledger", () => {
  it("creates a sale and calculates its total from current menu prices", async () => {
    const response = await POST(
      request(data.venue.id, "POST", {
        type: "sale",
        occurredAt: "2026-08-17T08:30:00.000Z",
        description: "میز ۴",
        items: [
          { menuItemId: data.items.item1.id, quantity: 2 },
          { menuItemId: data.items.item3.id, quantity: 1 },
        ],
      }),
      params(data.venue.id),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.type).toBe("sale");
    expect(body.amountToman).toBe(
      data.items.item1.priceToman * 2 + data.items.item3.priceToman,
    );
    expect(body.saleItems).toHaveLength(2);
    expect(body.saleItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuItemId: data.items.item1.id,
          itemName: data.items.item1.nameFa,
          unitPriceToman: data.items.item1.priceToman,
          quantity: 2,
        }),
      ]),
    );
  });

  it("merges duplicate menu items before calculating a sale", async () => {
    const response = await POST(
      request(data.venue.id, "POST", {
        type: "sale",
        items: [
          { menuItemId: data.items.item1.id, quantity: 1 },
          { menuItemId: data.items.item1.id, quantity: 2 },
        ],
      }),
      params(data.venue.id),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.saleItems).toHaveLength(1);
    expect(body.saleItems[0].quantity).toBe(3);
    expect(body.amountToman).toBe(data.items.item1.priceToman * 3);
  });

  it("creates a sale with a variant price modifier and records the variant", async () => {
    const variant = await prisma.menuItemVariant.create({
      data: { menuItemId: data.items.item1.id, nameFa: "بزرگ", priceModifier: 15000 },
    });

    const response = await POST(
      request(data.venue.id, "POST", {
        type: "sale",
        items: [
          { menuItemId: data.items.item1.id, quantity: 2, variantId: variant.id },
          { menuItemId: data.items.item1.id, quantity: 1 },
        ],
      }),
      params(data.venue.id),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.amountToman).toBe((data.items.item1.priceToman + 15000) * 2 + data.items.item1.priceToman);
    expect(body.saleItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          menuItemId: data.items.item1.id,
          variantId: variant.id,
          variantName: "بزرگ",
          unitPriceToman: data.items.item1.priceToman + 15000,
          quantity: 2,
        }),
        expect.objectContaining({
          menuItemId: data.items.item1.id,
          variantId: null,
          variantName: null,
          quantity: 1,
        }),
      ]),
    );
  });

  it("rejects a variant that does not belong to the item", async () => {
    const foreignVariant = await prisma.menuItemVariant.create({
      data: { menuItemId: data.items.item3.id, nameFa: "بزرگ", priceModifier: 10000 },
    });

    const response = await POST(
      request(data.venue.id, "POST", {
        type: "sale",
        items: [{ menuItemId: data.items.item1.id, quantity: 1, variantId: foreignVariant.id }],
      }),
      params(data.venue.id),
    );
    expect(response.status).toBe(400);
  });

  it("creates an expense with normalized tags", async () => {
    const response = await POST(
      request(data.venue.id, "POST", {
        type: "expense",
        amountToman: 450000,
        description: "خرید مواد اولیه",
        tags: [" مواد اولیه ", "#خرید", "خرید"],
        occurredAt: "2026-08-16T09:00:00.000Z",
      }),
      params(data.venue.id),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.amountToman).toBe(450000);
    expect(body.tags).toEqual(["مواد اولیه", "خرید"]);
    expect(body.saleItems).toEqual([]);
  });

  it("rejects invalid expenses and menu items outside the venue", async () => {
    const invalidExpense = await POST(
      request(data.venue.id, "POST", {
        type: "expense",
        amountToman: 0,
      }),
      params(data.venue.id),
    );
    expect(invalidExpense.status).toBe(400);

    const invalidSale = await POST(
      request(data.venue.id, "POST", {
        type: "sale",
        items: [{ menuItemId: "missing-item", quantity: 1 }],
      }),
      params(data.venue.id),
    );
    expect(invalidSale.status).toBe(400);
  });
});

describe("GET /api/venues/[venueId]/ledger", () => {
  it("filters entries by type and date range", async () => {
    await prisma.ledgerEntry.createMany({
      data: [
        {
          venueId: data.venue.id,
          type: "sale",
          amountToman: 100000,
          occurredAt: new Date("2026-08-10T09:00:00.000Z"),
        },
        {
          venueId: data.venue.id,
          type: "expense",
          amountToman: 25000,
          occurredAt: new Date("2026-08-15T09:00:00.000Z"),
        },
        {
          venueId: data.venue.id,
          type: "sale",
          amountToman: 200000,
          occurredAt: new Date("2026-08-16T09:00:00.000Z"),
        },
      ],
    });

    const query = new URLSearchParams({
      type: "sale",
      from: "2026-08-14T00:00:00.000Z",
      to: "2026-08-17T00:00:00.000Z",
    });
    const response = await GET(
      request(data.venue.id, "GET", undefined, query.toString()),
      params(data.venue.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].type).toBe("sale");
    expect(body.entries[0].amountToman).toBe(200000);
  });

  it("rejects invalid date ranges", async () => {
    const response = await GET(
      request(
        data.venue.id,
        "GET",
        undefined,
        "from=2026-08-17T00%3A00%3A00.000Z&to=2026-08-16T00%3A00%3A00.000Z",
      ),
      params(data.venue.id),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/venues/[venueId]/ledger/[entryId]", () => {
  it("deletes a venue ledger entry", async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        venueId: data.venue.id,
        type: "expense",
        amountToman: 125000,
      },
    });

    const response = await DELETE(
      request(data.venue.id, "DELETE"),
      entryParams(data.venue.id, entry.id),
    );
    expect(response.status).toBe(200);
    expect(await prisma.ledgerEntry.findUnique({ where: { id: entry.id } })).toBeNull();
  });

  it("does not delete an entry without venue access", async () => {
    mockRequireVenueAccess.mockRejectedValue(
      new ApiError("Unauthorized: no access to this venue", 401),
    );

    const response = await DELETE(
      request(data.venue.id, "DELETE"),
      entryParams(data.venue.id, "missing-entry"),
    );
    expect(response.status).toBe(401);
  });
});
