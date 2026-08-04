import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { unpublishVenueMenu } from "@/lib/public-menu/publication";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const result = await unpublishVenueMenu(venueId, user.id);
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
