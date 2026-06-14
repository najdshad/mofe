import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleVenues } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await getAccessibleVenues(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    memberships: memberships.map((m) => ({
      venueId: m.venueId,
      role: m.role,
      venue: {
        id: m.venue.id,
        nameFa: m.venue.nameFa,
        slug: m.venue.slug,
        publicStatus: m.venue.publicStatus,
      },
    })),
  });
}
