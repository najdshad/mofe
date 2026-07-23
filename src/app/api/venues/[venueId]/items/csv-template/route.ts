import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";

const BOM = "\uFEFF";
const HEADERS = "nameFa,nameEn,categoryNameFa,priceToman,station,description,calories,isSoldOut";
const EXAMPLE = "پیتزا مخلوط,Special Mix Pizza,پیتزا,180000,kitchen,خمیر تازه با پنیر موزارلا,850,false";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const csv = BOM + HEADERS + "\n" + EXAMPLE + "\n";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menu-template-${venueId}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
