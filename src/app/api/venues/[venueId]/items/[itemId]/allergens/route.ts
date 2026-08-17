import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ALLERGEN_CODES } from "@/lib/allergens";
import { validateCsrf } from "@/lib/csrf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, venueId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "آیتم مورد نظر یافت نشد" }, { status: 404 });
    }

    const allergens = await prisma.menuItemAllergen.findMany({
      where: { menuItemId: itemId },
    });

    return NextResponse.json(allergens.map((a) => a.allergenCode));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, venueId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "آیتم مورد نظر یافت نشد" }, { status: 404 });
    }

    const body = await request.json();
    if (!Array.isArray(body.allergenCodes)) {
      return NextResponse.json({ error: "allergenCodes array is required" }, { status: 400 });
    }

    for (const code of body.allergenCodes) {
      if (!ALLERGEN_CODES.includes(code)) {
        return NextResponse.json({ error: `Invalid allergen code: ${code}` }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.menuItemAllergen.deleteMany({ where: { menuItemId: itemId } }),
      ...body.allergenCodes.map((code: string) =>
        prisma.menuItemAllergen.create({
          data: { menuItemId: itemId, allergenCode: code },
        })
      ),
    ]);

    
    return NextResponse.json({ allergenCodes: body.allergenCodes });
  } catch (e) {
    return errorResponse(e);
  }
}
