import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: {
      visible: boolean;
      station?: string;
      itemIds?: string[];
    } = await request.json();

    const where: Prisma.MenuItemWhereInput = { venueId, deletedAt: null };
    if (body.station) where.station = body.station;
    if (body.itemIds) where.id = { in: body.itemIds };

    const result = await prisma.menuItem.updateMany({
      where,
      data: { visibleOnPublicMenu: body.visible },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.bulk-visibility",
      entityType: "item",
      metadata: { visible: body.visible, itemIds: body.itemIds, station: body.station, count: result.count },
    });

    return NextResponse.json({ updatedCount: result.count });
  } catch (e) {
    return errorResponse(e);
  }
}
