import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const body: { itemIds: string[] } = await request.json();

    const items = await prisma.menuItem.findMany({
      where: { id: { in: body.itemIds }, venueId, deletedAt: null },
      select: { id: true, photoUrl: true },
    });

    const result = await prisma.menuItem.updateMany({
      where: { id: { in: body.itemIds }, venueId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (const item of items) {
      if (item.photoUrl) {
        const filePath = path.join(process.cwd(), "public", item.photoUrl);
        try { await fs.unlink(filePath); } catch { /* ok */ }
      }
    }

    return NextResponse.json({ deletedCount: result.count });
  } catch (e) {
    return errorResponse(e);
  }
}
