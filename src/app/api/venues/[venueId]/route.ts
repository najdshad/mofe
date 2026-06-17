import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManageItems, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    return NextResponse.json(venue);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const canManage = await canManageItems(user.id, venueId);
    if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const venue = await prisma.venue.update({
      where: { id: venueId },
      data: body,
    });

    return NextResponse.json(venue);
  } catch (e) {
    return errorResponse(e);
  }
}
