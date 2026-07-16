import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { validateCsrf } from "@/lib/csrf";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, categoryId } = await params;
    const canManageResult = await canManage(user.id, venueId);
    if (!canManageResult) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    await validateCsrf();

    const body = await request.json();

    const ALLOWED_FIELDS = ["nameFa", "displayOrder", "active"] as const;
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    const category = await prisma.category.update({
      where: { id: categoryId, venueId },
      data,
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "category.update",
      entityType: "category",
      entityId: categoryId,
      metadata: { changes: Object.keys(body) },
    });

    return NextResponse.json(category);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, categoryId } = await params;
    const canManageResult = await canManage(user.id, venueId);
    if (!canManageResult) {
      return NextResponse.json({ error: "دسترسی محدود" }, { status: 403 });
    }

    await validateCsrf();

    const itemCount = await prisma.menuItem.count({
      where: { categoryId, deletedAt: null },
    });

    if (itemCount > 0) {
      return NextResponse.json(
        { error: "این دسته دارای آیتم است. ابتدا آیتم‌ها را جابه‌جا کنید." },
        { status: 400 }
      );
    }

    const cat = await prisma.category.findUnique({
      where: { id: categoryId, venueId },
    });

    await prisma.category.update({
      where: { id: categoryId, venueId },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "category.delete",
      entityType: "category",
      entityId: categoryId,
      metadata: { nameFa: cat?.nameFa },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
