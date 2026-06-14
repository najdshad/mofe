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

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const categories = await prisma.category.findMany({
    where: { venueId, deletedAt: null, active: true },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { deletedAt: null, visibleOnPublicMenu: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  const publicUrl = `https://menu.mofe.ir/m/${venue.slug}`;

  const snapshot = {
    venue: {
      id: venue.id,
      nameFa: venue.nameFa,
      nameEn: venue.nameEn,
      welcomeMessage: venue.welcomeMessage,
      accentColor: venue.accentColor,
      slug: venue.slug,
      publicUrl,
    },
    categories: categories
      .filter((cat) => cat.menuItems.length > 0)
      .map((cat) => ({
        id: cat.id,
        nameFa: cat.nameFa,
        items: cat.menuItems.map((item) => ({
          id: item.id,
          nameFa: item.nameFa,
          nameEn: item.nameEn,
          description: item.description,
          priceToman: item.priceToman,
          station: item.station,
          calories: item.calories,
          soldOut: item.isSoldOut,
        })),
      })),
    generatedAt: new Date().toISOString(),
  };

  const publication = await prisma.menuPublication.create({
    data: {
      venueId,
      status: "published",
      trigger: "manual_publish",
      snapshot: JSON.stringify(snapshot),
      createdByUserId: user.id,
      completedAt: new Date(),
    },
  });

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      publicStatus: "published",
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ publication, snapshot });
}
