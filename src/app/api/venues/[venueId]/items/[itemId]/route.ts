import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManageItems, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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
    const canManage = await canManageItems(user.id, venueId);
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const item = await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data: body,
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
    const canManage = await canManageItems(user.id, venueId);
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.menuItem.update({
      where: { id: itemId, venueId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
