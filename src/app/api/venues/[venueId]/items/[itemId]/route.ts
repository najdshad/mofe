import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";
import path from "path";
import fs from "fs/promises";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
      include: { category: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const body = await request.json();

    if (body.priceToman !== undefined && (typeof body.priceToman !== "number" || body.priceToman < 0)) {
      return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 });
    }

    const ALLOWED_FIELDS = [
      "nameFa", "nameEn", "description", "priceToman",
      "calories", "isSoldOut", "displayOrder",
    ] as const;
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, venueId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "آیتم مورد نظر یافت نشد" }, { status: 404 });
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data,
    });

    
    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, itemId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, venueId },
      select: { photoUrl: true, nameFa: true },
    });

    if (!item) {
      return NextResponse.json({ error: "آیتم مورد نظر یافت نشد" }, { status: 404 });
    }

    if (item.photoUrl) {
      const filePath = path.join(process.cwd(), "public", item.photoUrl);
      try { await fs.unlink(filePath); } catch { /* ok */ }
    }

    await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data: { deletedAt: new Date() },
    });

    
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
