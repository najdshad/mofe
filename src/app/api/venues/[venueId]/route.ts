import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";
import { isThemePresetKey } from "@/lib/themes";
import { clearMenuCache } from "@/lib/public-menu/menu-cache";

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

    await validateCsrf();

    const ALLOWED_FIELDS = [
      "nameFa", "nameEn",
      "welcomeMessage",
      "themeId",
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
    if (data.themeId !== undefined && !isThemePresetKey(data.themeId)) {
      return NextResponse.json({ error: "پوسته انتخاب‌شده نامعتبر است" }, { status: 400 });
    }
    if (data.themeId !== undefined) {
      data.accentColor = null;
    }
    const venue = await prisma.venue.update({
      where: { id: venueId },
      data,
    });
    clearMenuCache(venue.slug);

    return NextResponse.json(venue);
  } catch (e) {
    return errorResponse(e);
  }
}
