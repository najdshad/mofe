import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { buildPublicSnapshot } from "@/lib/public-menu/publication";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const snapshot = await buildPublicSnapshot(venueId);
    if (!snapshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (e) {
    return errorResponse(e);
  }
}
