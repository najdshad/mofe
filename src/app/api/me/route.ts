import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { getAccessibleVenues } from "@/lib/permissions";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  try {
    const user = await requireAuth();
    const venues = await getAccessibleVenues(user.id);
    const subscription = await getSubscriptionStatus(user.id);

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
      subscription: {
        plan: subscription.subscription.plan,
        status: subscription.subscription.status,
        active: subscription.active,
        currentPeriodEnd: subscription.periodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.subscription.cancelAtPeriodEnd,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
