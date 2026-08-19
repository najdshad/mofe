import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

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
      include: { category: true },
      orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    });

    const csv = toCsv(
      ["nameFa", "nameEn", "categoryNameFa", "priceToman", "description", "calories", "isSoldOut"],
      items.map((item) => [
        item.nameFa,
        item.nameEn ?? "",
        item.category.nameFa,
        String(item.priceToman),
        item.description ?? "",
        item.calories != null ? String(item.calories) : "",
        item.isSoldOut ? "true" : "false",
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
