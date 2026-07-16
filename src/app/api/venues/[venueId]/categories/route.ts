import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { validateCsrf } from "@/lib/csrf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const categories = await prisma.category.findMany({
      where: { venueId, deletedAt: null },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(categories);
  } catch (e) {
    return errorResponse(e);
  }
}

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

    const body = await request.json();

    if (!body.nameFa || typeof body.nameFa !== "string" || !body.nameFa.trim()) {
      return NextResponse.json({ error: "نام دسته الزامی است" }, { status: 400 });
    }

    const category = await prisma.$transaction(async (tx) => {
      const agg = await tx.category.aggregate({
        where: { venueId, deletedAt: null },
        _max: { displayOrder: true },
      });
      return tx.category.create({
        data: {
          venueId,
          nameFa: body.nameFa,
          displayOrder: (agg._max.displayOrder ?? 0) + 1,
          active: body.active ?? true,
        },
      });
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "category.create",
      entityType: "category",
      entityId: category.id,
      metadata: { nameFa: category.nameFa },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
