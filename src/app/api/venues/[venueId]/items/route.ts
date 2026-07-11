import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { canManage, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { VALID_STATIONS } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const user = await requireAuth();
    const { venueId } = await params;
    await requireVenueAccess(user.id, venueId);

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const station = searchParams.get("station");
    const soldOut = searchParams.get("soldOut");
    const search = searchParams.get("search");
    const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "100", 10) || 100, 1), 500);
    const skip = Math.max(parseInt(searchParams.get("skip") ?? "0", 10) || 0, 0);

    const where: Prisma.MenuItemWhereInput = { venueId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;
    if (station) where.station = station;
    if (soldOut !== null) where.isSoldOut = soldOut === "true";
    if (search) {
      where.OR = [
        { nameFa: { contains: search } },
        { nameEn: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
        include: { category: true },
        take,
        skip,
      }),
      prisma.menuItem.count({ where }),
    ]);

    return NextResponse.json({ items, total, take, skip });
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

    const body = await request.json();

    if (!body.nameFa || typeof body.nameFa !== "string" || !body.nameFa.trim()) {
      return NextResponse.json({ error: "نام فارسی الزامی است" }, { status: 400 });
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: "دسته الزامی است" }, { status: 400 });
    }
    if (body.priceToman == null || isNaN(Number(body.priceToman)) || Number(body.priceToman) < 0) {
      return NextResponse.json({ error: "قیمت معتبر وارد کنید" }, { status: 400 });
    }
    if (!body.station || !VALID_STATIONS.includes(body.station)) {
      return NextResponse.json({ error: "ایستگاه معتبر وارد کنید" }, { status: 400 });
    }

    const maxOrder = await prisma.menuItem.aggregate({
      where: { venueId, categoryId: body.categoryId, deletedAt: null },
      _max: { displayOrder: true },
    });

    const item = await prisma.menuItem.create({
      data: {
        venueId,
        categoryId: body.categoryId,
        nameFa: body.nameFa,
        nameEn: body.nameEn,
        description: body.description,
        priceToman: body.priceToman,
        station: body.station,
        calories: body.calories,
        isSoldOut: body.isSoldOut ?? false,
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "item.create",
      entityType: "item",
      entityId: item.id,
      metadata: { nameFa: item.nameFa, categoryId: item.categoryId },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
