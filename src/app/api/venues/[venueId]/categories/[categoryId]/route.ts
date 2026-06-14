import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, categoryId } = await params;
  await canManageCategories(user.id, venueId);

  const body = await request.json();
  const category = await prisma.category.update({
    where: { id: categoryId, venueId },
    data: body,
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; categoryId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  await prisma.category.update({
    where: { id: categoryId, venueId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
