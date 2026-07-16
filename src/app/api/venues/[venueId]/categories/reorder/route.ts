import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { validateCsrf } from "@/lib/csrf";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const canManageResult = await canManage(user.id, venueId);
    if (!canManageResult) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    await validateCsrf();

    const body: { orders: { id: string; displayOrder: number }[] } =
      await request.json();

    await prisma.$transaction(
      body.orders.map((o) =>
        prisma.category.update({
          where: { id: o.id, venueId },
          data: { displayOrder: o.displayOrder },
        })
      )
    );

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "category.reorder",
      entityType: "category",
      metadata: { order: body.orders.map((o) => ({ id: o.id, displayOrder: o.displayOrder })) },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
