import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    await validateCsrf();

    const body: { orders: { id: string; displayOrder: number }[] } =
      await request.json();

    await prisma.$transaction(
      body.orders.map((o) =>
        prisma.category.update({
          where: { id: o.id, venueId },
          data: { displayOrder: o.displayOrder },
        })
      )
    );

    
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
