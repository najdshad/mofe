import { describe, it, expect, beforeAll, vi } from "vitest";
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
import { PATCH as itemPATCH } from "@/app/api/venues/[venueId]/items/[itemId]/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

describe.concurrent("Concurrent access patterns", () => {
  it("handles concurrent item price updates", async () => {
    mockRequireAuth.mockResolvedValue(data.user);
    mockRequireVenueAccess.mockResolvedValue({ userId: data.user.id, venueId: data.venue.id });

    const itemId = data.items.item1.id;
    const venueId = data.venue.id;

    const makeUpdate = (price: number) =>
      itemPATCH(
        new Request(`http://localhost/api/venues/${venueId}/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ priceToman: price }),
          headers: { "content-type": "application/json" },
        }),
        { params: Promise.resolve({ venueId, itemId }) },
      );

    const results = await Promise.allSettled([
      makeUpdate(1000),
      makeUpdate(2000),
      makeUpdate(3000),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled" && r.value.status === 200);
    expect(successes.length).toBe(3);

    const updated = await prisma.menuItem.findUnique({ where: { id: itemId } });
    expect(updated).toBeDefined();
    expect([1000, 2000, 3000]).toContain(updated!.priceToman);
  });
});
