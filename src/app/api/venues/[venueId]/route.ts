import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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
  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: body,
  });

  return NextResponse.json(venue);
}
