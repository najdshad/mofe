import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getAccessibleVenues } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAuth();
    const memberships = await getAccessibleVenues(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      memberships: memberships.map((m) => ({
        venueId: m.venueId,
        venue: {
          id: m.venue.id,
          nameFa: m.venue.nameFa,
          slug: m.venue.slug,
          publicStatus: m.venue.publicStatus,
        },
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
