import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: { itemIds: string[] } = await request.json();

    const items = await prisma.menuItem.findMany({
      where: { id: { in: body.itemIds }, venueId, deletedAt: null },
      select: { id: true, photoUrl: true },
    });

    for (const item of items) {
      if (item.photoUrl) {
        const filePath = path.join(process.cwd(), "public", item.photoUrl);
        try { await fs.unlink(filePath); } catch { /* ok */ }
      }
    }

    const result = await prisma.menuItem.updateMany({
      where: { id: { in: body.itemIds }, venueId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (e) {
    return errorResponse(e);
  }
}
