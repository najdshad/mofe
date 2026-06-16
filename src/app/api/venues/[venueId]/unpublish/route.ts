import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/permissions";
import { unpublishVenueMenu } from "@/lib/public-menu/publication";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await canPublish(user.id, venueId);

  const result = await unpublishVenueMenu(venueId, user.id);
  return NextResponse.json(result);
}
