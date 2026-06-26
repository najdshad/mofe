import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await canManage(user.id, venueId);

    const body: { orders: { id: string; displayOrder: number }[] } =
      await request.json();

    await prisma.$transaction(
      body.orders.map((o) =>
        prisma.menuItem.update({
          where: { id: o.id, venueId },
          data: { displayOrder: o.displayOrder },
        })
      )
    );

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.reorder",
      entityType: "item",
      metadata: { count: body.orders.length },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
