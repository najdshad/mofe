import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await canPublish(user.id, venueId);

  await prisma.menuPublication.create({
    data: {
      venueId,
      status: "unpublished",
      trigger: "manual_unpublish",
      createdByUserId: user.id,
      completedAt: new Date(),
    },
  });

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      publicStatus: "unpublished",
      unpublishedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
