import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    return NextResponse.json(venue);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await validateCsrf();

    const ALLOWED_FIELDS = [
      "nameFa", "nameEn", "timezone",
      "welcomeMessage",
    ] as const;

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if (data.welcomeMessage !== undefined && typeof data.welcomeMessage !== "string") {
      return NextResponse.json({ error: "قالب پیام خوش‌آمدگویی نامعتبر است" }, { status: 400 });
    }
    if (data.nameFa !== undefined && typeof data.nameFa !== "string") {
      return NextResponse.json({ error: "قالب نام فارسی نامعتبر است" }, { status: 400 });
    }
    const venue = await prisma.venue.update({
      where: { id: venueId },
      data,
    });

    return NextResponse.json(venue);
  } catch (e) {
    return errorResponse(e);
  }
}
