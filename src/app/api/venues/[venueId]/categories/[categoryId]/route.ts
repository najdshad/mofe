import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId, categoryId } = await params;
    await requireVenueAccess(user.id, venueId);

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
    await requireVenueAccess(user.id, venueId);

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

    await prisma.category.update({
      where: { id: categoryId, venueId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
