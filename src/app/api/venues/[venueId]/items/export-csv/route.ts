import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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

    const BOM = "\uFEFF";
    const headers = "nameFa,nameEn,categoryNameFa,priceToman,station,description,calories,visibleOnPublicMenu,isSoldOut";
    const rows = items.map((item) => {
      const row = [
        item.nameFa,
        item.nameEn ?? "",
        item.category.nameFa,
        String(item.priceToman),
        item.station,
        item.description ?? "",
        item.calories != null ? String(item.calories) : "",
        item.visibleOnPublicMenu ? "true" : "false",
        item.isSoldOut ? "true" : "false",
      ];
      return row.map((cell) => {
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(",");
    });

    const csv = BOM + headers + "\n" + rows.join("\n");

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
