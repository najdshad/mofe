import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
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
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();

    const ALLOWED_FIELDS = [
      "nameFa", "nameEn", "description", "priceToman", "station",
      "calories", "isSoldOut", "displayOrder",
    ] as const;
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    const item = await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data,
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.update",
      entityType: "item",
      entityId: itemId,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json(item);
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
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const item = await prisma.menuItem.findUnique({
      where: { id: itemId, venueId },
      select: { photoAssetId: true, nameFa: true },
    });

    if (item?.photoAssetId) {
      const filePath = path.join(process.cwd(), "public", item.photoAssetId);
      try { await fs.unlink(filePath); } catch { /* ok */ }
    }

    await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.delete",
      entityType: "item",
      entityId: itemId,
      metadata: { nameFa: item?.nameFa },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
