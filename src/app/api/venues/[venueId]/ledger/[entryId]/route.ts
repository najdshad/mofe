import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { validateCsrf } from "@/lib/csrf";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ venueId: string; entryId: string }> },
) {
  try {
    const user = await requireAuth();
    const { venueId, entryId } = await params;
    await requireVenueAccess(user.id, venueId);
    await validateCsrf();

    const entry = await prisma.ledgerEntry.findFirst({
      where: { id: entryId, venueId },
      select: { id: true },
    });
    if (!entry) {
      return NextResponse.json({ error: "تراکنش مورد نظر یافت نشد" }, { status: 404 });
    }

    await prisma.ledgerEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
