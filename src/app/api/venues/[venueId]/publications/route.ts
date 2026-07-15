import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const publications = await prisma.menuPublication.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        venueId: true,
        status: true,
        trigger: true,
        errorMessage: true,
        createdByUserId: true,
        createdAt: true,
        completedAt: true,
        staticAssetId: true,
      },
    });

    return NextResponse.json(publications);
  } catch (e) {
    return errorResponse(e);
  }
}
