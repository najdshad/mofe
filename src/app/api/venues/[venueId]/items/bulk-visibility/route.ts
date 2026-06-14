import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const body: {
    visible: boolean;
    station?: string;
    itemIds?: string[];
  } = await request.json();

  const where: Record<string, unknown> = { venueId, deletedAt: null };
  if (body.station) where.station = body.station;
  if (body.itemIds) where.id = { in: body.itemIds };

  const result = await prisma.menuItem.updateMany({
    where,
    data: { visibleOnPublicMenu: body.visible },
  });

  return NextResponse.json({ updatedCount: result.count });
}
