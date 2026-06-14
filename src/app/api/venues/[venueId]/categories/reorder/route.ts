import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageCategories } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await canManageCategories(user.id, venueId);

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

  return NextResponse.json({ success: true });
}
