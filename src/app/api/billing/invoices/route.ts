import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { getCurrentSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    if (!venueId) {
      return NextResponse.json({ error: "venueId required" }, { status: 400 });
    }
    await requireVenueAccess(user.id, venueId);

    const sub = await getCurrentSubscription(venueId);
    if (!sub) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await prisma.invoice.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountToman: true,
        status: true,
        refId: true,
        cardPan: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invoices });
  } catch (e) {
    return errorResponse(e);
  }
}
