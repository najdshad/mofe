import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./MenuClient";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const categories = await prisma.category.findMany({
    where: { venueId, deletedAt: null },
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { menuItems: true } },
    },
  });

  const items = await prisma.menuItem.findMany({
    where: { venueId, deletedAt: null },
    orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
    include: { category: true },
  });

  const categoriesData = categories.map((c) => ({
    id: c.id,
    nameFa: c.nameFa,
    displayOrder: c.displayOrder,
    active: c.active,
    itemCount: c._count.menuItems,
  }));

  const itemsData = items.map((i) => ({
    id: i.id,
    nameFa: i.nameFa,
    nameEn: i.nameEn,
    categoryId: i.categoryId,
    categoryNameFa: i.category.nameFa,
    priceToman: i.priceToman,
    priceFormatted: i.priceToman.toLocaleString("fa-IR"),
    station: i.station,
    isSoldOut: i.isSoldOut,
    description: i.description,
    calories: i.calories,
    displayOrder: i.displayOrder,
    photoAssetId: i.photoAssetId,
  }));

  return (
    <MenuClient
      venueId={venueId}
      categories={categoriesData}
      items={itemsData}
    />
  );
}
