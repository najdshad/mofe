import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManageCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, categoryId } = await params;
    await canManageCategories(user.id, venueId);

    const body = await request.json();

    const category = await prisma.category.update({
      where: { id: categoryId, venueId },
      data: body,
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
    await canManageCategories(user.id, venueId);

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
