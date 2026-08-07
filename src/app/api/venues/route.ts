import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getAccessibleVenues } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireAuth();
    const venues = await getAccessibleVenues(user.id);

    return NextResponse.json(
      venues.map((v) => ({
        id: v.id,
        nameFa: v.nameFa,
        slug: v.slug,
      }))
    );
  } catch (e) {
    return errorResponse(e);
  }
}
