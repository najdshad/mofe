import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getAccessibleVenues } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAuth();
    const memberships = await getAccessibleVenues(user.id);

    return NextResponse.json(
      memberships.map((m) => ({
        id: m.venue.id,
        nameFa: m.venue.nameFa,
        slug: m.venue.slug,
        role: m.role,
        publicStatus: m.venue.publicStatus,
      }))
    );
  } catch (e) {
    return errorResponse(e);
  }
}
