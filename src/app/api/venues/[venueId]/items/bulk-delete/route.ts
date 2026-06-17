import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageItems } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  const canManage = await canManageItems(user.id, venueId);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body: { itemIds: string[] } = await request.json();

  const result = await prisma.menuItem.updateMany({
    where: { id: { in: body.itemIds }, venueId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deletedCount: result.count });
}
