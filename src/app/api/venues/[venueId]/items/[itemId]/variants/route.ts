import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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

    const variants = await prisma.menuItemVariant.findMany({
      where: { menuItemId: itemId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(variants);
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

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, venueId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "آیتم مورد نظر یافت نشد" }, { status: 404 });
    }

    const body = await request.json();
    if (!Array.isArray(body.variants)) {
      return NextResponse.json({ error: "variants array is required" }, { status: 400 });
    }

    for (const v of body.variants) {
      if (!v.nameFa || typeof v.nameFa !== "string" || !v.nameFa.trim()) {
        return NextResponse.json({ error: "Each variant needs a nameFa" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.menuItemVariant.deleteMany({ where: { menuItemId: itemId } }),
      ...body.variants.map((v: { nameFa: string; nameEn?: string; priceModifier?: number; displayOrder?: number }, idx: number) =>
        prisma.menuItemVariant.create({
          data: {
            menuItemId: itemId,
            nameFa: v.nameFa,
            nameEn: v.nameEn ?? null,
            priceModifier: v.priceModifier ?? 0,
            displayOrder: v.displayOrder ?? idx,
          },
        })
      ),
    ]);

    const variants = await prisma.menuItemVariant.findMany({
      where: { menuItemId: itemId },
      orderBy: { displayOrder: "asc" },
    });

    
    return NextResponse.json(variants);
  } catch (e) {
    return errorResponse(e);
  }
}
