import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getAccessibleVenues } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAuth();
    const venues = await getAccessibleVenues(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      venues: venues.map((v) => ({
        venueId: v.id,
        venue: {
          id: v.id,
          nameFa: v.nameFa,
          slug: v.slug,
        },
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
