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

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";
import { GET as getVariants, POST as setVariants } from "@/app/api/venues/[venueId]/items/[itemId]/variants/route";
import { GET as getPrices, POST as setPrices } from "@/app/api/venues/[venueId]/items/[itemId]/prices/route";
import { GET as getAllergens, POST as setAllergens } from "@/app/api/venues/[venueId]/items/[itemId]/allergens/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function req(venueId: string, itemId: string, method = "GET", body?: unknown): Request {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new Request(`http://localhost/api/venues/${venueId}/items/${itemId}`, opts);
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

afterEach(async () => {
  await prisma.menuItemVariant.deleteMany();
  await prisma.menuItemPrice.deleteMany();
  await prisma.menuItemAllergen.deleteMany();
});

describe("Variants", () => {
  it("GET returns existing variants ordered by displayOrder", async () => {
    await prisma.menuItemVariant.create({ data: { menuItemId: data.items.item1.id, nameFa: "کوچک", priceModifier: -10000, displayOrder: 2 } });
    await prisma.menuItemVariant.create({ data: { menuItemId: data.items.item1.id, nameFa: "بزرگ", priceModifier: 15000, displayOrder: 1 } });

    const res = await getVariants(req(data.venue.id, data.items.item1.id), params(data.venue.id, data.items.item1.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((v: { nameFa: string }) => v.nameFa)).toEqual(["بزرگ", "کوچک"]);
  });

  it("POST replaces all variants in a transaction", async () => {
    const res = await setVariants(
      req(data.venue.id, data.items.item1.id, "POST", {
        variants: [
          { nameFa: "بزرگ", nameEn: "Large", priceModifier: 20000, displayOrder: 1 },
          { nameFa: "کوچک", nameEn: "Small", priceModifier: 0, displayOrder: 2 },
        ],
      }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].priceModifier).toBe(20000);
    expect(body[0].nameEn).toBe("Large");
  });

  it("POST returns 400 when variants is not an array", async () => {
    const res = await setVariants(
      req(data.venue.id, data.items.item1.id, "POST", { variants: "oops" }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when a variant lacks nameFa", async () => {
    const res = await setVariants(
      req(data.venue.id, data.items.item1.id, "POST", { variants: [{ priceModifier: 1000 }] }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("GET and POST return 404 for a non-existent item", async () => {
    const res = await getVariants(req(data.venue.id, "nope"), params(data.venue.id, "nope"));
    expect(res.status).toBe(404);
    const res2 = await setVariants(
      req(data.venue.id, "nope", "POST", { variants: [] }),
      params(data.venue.id, "nope")
    );
    expect(res2.status).toBe(404);
  });
});

describe("Prices", () => {
  it("GET returns existing prices ordered by displayOrder", async () => {
    await prisma.menuItemPrice.create({ data: { menuItemId: data.items.item1.id, description: "نصف", priceToman: 40000, displayOrder: 2 } });
    await prisma.menuItemPrice.create({ data: { menuItemId: data.items.item1.id, description: "کامل", priceToman: 75000, displayOrder: 1 } });

    const res = await getPrices(req(data.venue.id, data.items.item1.id), params(data.venue.id, data.items.item1.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((p: { description: string }) => p.description)).toEqual(["کامل", "نصف"]);
  });

  it("POST replaces all prices in a transaction", async () => {
    const res = await setPrices(
      req(data.venue.id, data.items.item1.id, "POST", {
        prices: [{ description: "تک نفره", priceToman: 75000 }, { description: "دو نفره", priceToman: 140000 }],
      }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].description).toBe("تک نفره");
    expect(body[0].priceToman).toBe(75000);
  });

  it("POST returns 400 for missing description", async () => {
    const res = await setPrices(
      req(data.venue.id, data.items.item1.id, "POST", { prices: [{ priceToman: 50000 }] }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for negative price", async () => {
    const res = await setPrices(
      req(data.venue.id, data.items.item1.id, "POST", { prices: [{ description: "منفی", priceToman: -1 }] }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when prices is not an array", async () => {
    const res = await setPrices(
      req(data.venue.id, data.items.item1.id, "POST", { prices: 42 }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });
});

describe("Allergens", () => {
  it("GET returns allergen codes for an item", async () => {
    await prisma.menuItemAllergen.create({ data: { menuItemId: data.items.item1.id, allergenCode: "dairy" } });
    await prisma.menuItemAllergen.create({ data: { menuItemId: data.items.item1.id, allergenCode: "gluten" } });

    const res = await getAllergens(req(data.venue.id, data.items.item1.id), params(data.venue.id, data.items.item1.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sort()).toEqual(["dairy", "gluten"]);
  });

  it("POST replaces allergen codes", async () => {
    const res = await setAllergens(
      req(data.venue.id, data.items.item1.id, "POST", { allergenCodes: ["nuts", "eggs"] }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allergenCodes).toEqual(["nuts", "eggs"]);

    const stored = await prisma.menuItemAllergen.findMany({ where: { menuItemId: data.items.item1.id } });
    expect(stored.map((a) => a.allergenCode).sort()).toEqual(["eggs", "nuts"]);
  });

  it("POST returns 400 for an invalid allergen code", async () => {
    const res = await setAllergens(
      req(data.venue.id, data.items.item1.id, "POST", { allergenCodes: ["nonexistent"] }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid allergen code");
  });

  it("POST returns 400 when allergenCodes is not an array", async () => {
    const res = await setAllergens(
      req(data.venue.id, data.items.item1.id, "POST", { allergenCodes: "dairy" }),
      params(data.venue.id, data.items.item1.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await getAllergens(req(data.venue.id, data.items.item1.id), params(data.venue.id, data.items.item1.id));
    expect(res.status).toBe(401);
  });
});
