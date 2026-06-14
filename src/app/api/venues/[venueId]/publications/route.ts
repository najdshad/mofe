import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const publications = await prisma.menuPublication.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(publications);
}
