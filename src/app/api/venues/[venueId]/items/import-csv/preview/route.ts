import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";
import { parseMenuCsv } from "@/lib/csv-import";
import { sanitizeCsvField } from "@/lib/csv";

// Pre-flight check for the import review page. Writes nothing.
// The import itself is a full replace, so this reports which rows are
// usable, which will be skipped (and why), and what will be rebuilt.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const body = await request.json();
    const { valid, invalid, categoryNames, error } = parseMenuCsv(body.csv);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const [currentItemCount, currentCategoryCount, existingCategories] = await Promise.all([
      prisma.menuItem.count({ where: { venueId, deletedAt: null } }),
      prisma.category.count({ where: { venueId, deletedAt: null } }),
      prisma.category.findMany({ where: { venueId, deletedAt: null }, select: { nameFa: true } }),
    ]);

    const existingCatNames = new Set(existingCategories.map((c) => c.nameFa.toLowerCase()));
    const newCategories = categoryNames.filter(
      (n) => !existingCatNames.has(sanitizeCsvField(n).toLowerCase())
    );

    return NextResponse.json({
      summary: {
        validCount: valid.length,
        invalidCount: invalid.length,
        currentItemCount,
        currentCategoryCount,
        newCategoryCount: newCategories.length,
      },
      rows: valid.map(({ rowNum, data }) => ({
        row: rowNum,
        categoryNameFa: data.categoryNameFa,
        nameFa: data.nameFa,
        priceToman: data.priceToman,
      })),
      invalid,
      newCategories,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
