import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageItems, canPublish, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  publishVenueMenu,
  unpublishVenueMenu,
} from "@/lib/public-menu/publication";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  return NextResponse.json(venue);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const body = await request.json();

  if (body?.action === "publish") {
    await canPublish(user.id, venueId);

    const result = await publishVenueMenu(venueId, user.id);
    if (!result) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  }

  if (body?.action === "unpublish") {
    await canPublish(user.id, venueId);
    const result = await unpublishVenueMenu(venueId, user.id);
    return NextResponse.json(result);
  }

  const canManage = await canManageItems(user.id, venueId);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: body,
  });

  return NextResponse.json(venue);
}
