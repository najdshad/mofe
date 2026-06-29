import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

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
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.variants.update",
      entityType: "item",
      entityId: itemId,
      metadata: { count: variants.length },
    });

    return NextResponse.json(variants);
  } catch (e) {
    return errorResponse(e);
  }
}
