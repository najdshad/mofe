import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateCsrf } from "@/lib/csrf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const tables = await prisma.venueTable.findMany({
      where: { venueId, isActive: true },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(tables);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    const hasAccess = await canManage(user.id, venueId);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await validateCsrf();

    const body = await request.json();
    if (!body.number || typeof body.number !== "number" || body.number < 1) {
      return NextResponse.json({ error: "شماره میز معتبر وارد کنید" }, { status: 400 });
    }

    const existing = await prisma.venueTable.findUnique({
      where: { venueId_number: { venueId, number: body.number } },
    });
    if (existing) {
      return NextResponse.json({ error: "این شماره میز قبلاً ثبت شده است" }, { status: 409 });
    }

    const table = await prisma.venueTable.create({
      data: {
        venueId,
        number: body.number,
        label: body.label || null,
        tags: body.tags || [],
        isActive: true,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
