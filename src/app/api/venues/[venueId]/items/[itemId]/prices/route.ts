import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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

    
    return NextResponse.json(prices);
  } catch (e) {
    return errorResponse(e);
  }
}
