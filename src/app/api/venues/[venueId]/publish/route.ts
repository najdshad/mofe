import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage } from "@/lib/permissions";
import { publishVenueMenu } from "@/lib/public-menu/publication";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await canManage(user.id, venueId);

    const result = await publishVenueMenu(venueId, user.id);
    if (!result) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
