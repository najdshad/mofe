import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { buildPublicSnapshot } from "@/lib/public-menu/publication";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { slug: true },
    });
    if (!venue) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const snapshot = await buildPublicSnapshot(venue.slug);
    if (!snapshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
