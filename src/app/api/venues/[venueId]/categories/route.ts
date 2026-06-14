import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await canManageCategories(user.id, venueId);

  const categories = await prisma.category.findMany({
    where: { venueId, deletedAt: null },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
}
