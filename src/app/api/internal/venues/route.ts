import { NextResponse } from "next/server";
import { requireInternalAuth, errorResponse, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireInternalAuth();
    const venues = await prisma.venue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return NextResponse.json(venues);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireInternalAuth();
    const body = await request.json();
    const { nameFa, nameEn, slug, ownerEmail, welcomeMessage, timezone } = body;

    if (!nameFa?.trim()) throw new ApiError("Persian name is required");
    if (!slug?.trim()) throw new ApiError("Slug is required");
    if (!ownerEmail?.trim()) throw new ApiError("Owner email is required");

    const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!slugPattern.test(slug.trim())) {
      throw new ApiError("Slug must be lowercase alphanumeric with hyphens");
    }

    const existingVenue = await prisma.venue.findUnique({ where: { slug: slug.trim() }, select: { id: true } });
    if (existingVenue) throw new ApiError("A venue with this slug already exists");

    const owner = await prisma.user.findUnique({ where: { email: ownerEmail.trim() }, select: { id: true } });
    if (!owner) throw new ApiError("Owner user not found. Create the user account first.");

    const venue = await prisma.venue.create({
      data: {
        nameFa: nameFa.trim(),
        nameEn: nameEn?.trim() || null,
        slug: slug.trim(),
        welcomeMessage: welcomeMessage?.trim() || null,
        timezone: timezone || "Asia/Tehran",
        publicStatus: "draft",
        members: {
          create: {
            userId: owner.id,
            role: "owner",
          },
        },
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
