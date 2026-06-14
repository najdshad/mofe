import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, itemId } = await params;
  await requireVenueAccess(user.id, venueId);

  const body = await request.json();
  const item = await prisma.menuItem.update({
    where: { id: itemId, venueId },
    data: body,
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, itemId } = await params;
  await requireVenueAccess(user.id, venueId);

  await prisma.menuItem.update({
    where: { id: itemId, venueId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
