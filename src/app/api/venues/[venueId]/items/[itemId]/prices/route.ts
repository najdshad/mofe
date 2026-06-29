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

    const prices = await prisma.menuItemPrice.findMany({
      where: { menuItemId: itemId },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(prices);
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
    if (!Array.isArray(body.prices)) {
      return NextResponse.json({ error: "prices array is required" }, { status: 400 });
    }

    for (const p of body.prices) {
      if (!p.description || typeof p.description !== "string" || !p.description.trim()) {
        return NextResponse.json({ error: "Each price needs a description" }, { status: 400 });
      }
      if (typeof p.priceToman !== "number" || p.priceToman < 0) {
        return NextResponse.json({ error: "Each price needs a valid priceToman" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.menuItemPrice.deleteMany({ where: { menuItemId: itemId } }),
      ...body.prices.map((p: { description: string; priceToman: number; displayOrder?: number }, idx: number) =>
        prisma.menuItemPrice.create({
          data: {
            menuItemId: itemId,
            description: p.description,
            priceToman: p.priceToman,
            displayOrder: p.displayOrder ?? idx,
          },
        })
      ),
    ]);

    const prices = await prisma.menuItemPrice.findMany({
      where: { menuItemId: itemId },
      orderBy: { displayOrder: "asc" },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.prices.update",
      entityType: "item",
      entityId: itemId,
      metadata: { count: prices.length },
    });

    return NextResponse.json(prices);
  } catch (e) {
    return errorResponse(e);
  }
}
