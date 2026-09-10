import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { BOM, MENU_CSV_HEADERS } from "@/lib/csv";

const EXAMPLE =
  "پیتزا مخلوط,Special Mix Pizza,پیتزا,180000,خمیر تازه با پنیر موزارلا,850,false,dairy|gluten,بزرگ|Large|15000;کوچک|Small|-5000,تک‌نفره|180000;دونفره|320000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const csv = BOM + [...MENU_CSV_HEADERS].join(",") + "\n" + EXAMPLE + "\n";

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
