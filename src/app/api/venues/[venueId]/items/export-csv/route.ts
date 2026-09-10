import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  MENU_CSV_HEADERS,
  serializeAllergenCodes,
  serializePrices,
  serializeVariants,
  toCsv,
} from "@/lib/csv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const items = await prisma.menuItem.findMany({
      where: { venueId, deletedAt: null },
      include: {
        category: true,
        variants: { orderBy: { displayOrder: "asc" } },
        prices: { orderBy: { displayOrder: "asc" } },
        allergens: true,
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
    });

    const csv = toCsv(
      [...MENU_CSV_HEADERS],
      items.map((item) => [
        item.nameFa,
        item.nameEn ?? "",
        item.category.nameFa,
        String(item.priceToman),
        item.description ?? "",
        item.calories != null ? String(item.calories) : "",
        item.isSoldOut ? "true" : "false",
        serializeAllergenCodes(item.allergens.map((a) => a.allergenCode)),
        serializeVariants(
          item.variants.map((v) => ({
            nameFa: v.nameFa,
            nameEn: v.nameEn,
            priceModifier: v.priceModifier,
          }))
        ),
        serializePrices(
          item.prices.map((p) => ({ description: p.description, priceToman: p.priceToman }))
        ),
      ]),
    );

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menu-items-${venueId}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
