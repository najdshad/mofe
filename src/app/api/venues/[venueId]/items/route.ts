import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageItems, requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const station = searchParams.get("station");
  const visible = searchParams.get("visible");
  const soldOut = searchParams.get("soldOut");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { venueId, deletedAt: null };
  if (categoryId) where.categoryId = categoryId;
  if (station) where.station = station;
  if (visible !== null) where.visibleOnPublicMenu = visible === "true";
  if (soldOut !== null) where.isSoldOut = soldOut === "true";
  if (search) {
    where.OR = [
      { nameFa: { contains: search } },
      { nameEn: { contains: search } },
    ];
  }

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    include: { category: true },
  });

  return NextResponse.json(items);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await params;
  const canManage = await canManageItems(user.id, venueId);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  if (!body.station || !["kitchen", "bar"].includes(body.station)) {
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
      visibleOnPublicMenu: body.visibleOnPublicMenu ?? true,
      isSoldOut: body.isSoldOut ?? false,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
