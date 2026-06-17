import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManageCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await canManageCategories(user.id, venueId);

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
    await canManageCategories(user.id, venueId);

    const body = await request.json();

    if (!body.nameFa || typeof body.nameFa !== "string" || !body.nameFa.trim()) {
      return NextResponse.json({ error: "نام دسته الزامی است" }, { status: 400 });
    }

    const maxOrder = await prisma.category.aggregate({
      where: { venueId, deletedAt: null },
      _max: { displayOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        venueId,
        nameFa: body.nameFa,
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        active: body.active ?? true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
