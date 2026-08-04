import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
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

  const [venue, categories, items, lastPublication, publicationsData] =
    await Promise.all([
      prisma.venue.findUnique({ where: { id: venueId }, select: { updatedAt: true, slug: true, publicStatus: true } }),
      prisma.category.findMany({
        where: { venueId, deletedAt: null },
        orderBy: { displayOrder: "asc" },
        include: { _count: { select: { menuItems: true } } },
      }),
      prisma.menuItem.findMany({
        where: { venueId, deletedAt: null },
        orderBy: [{ categoryId: "asc" }, { displayOrder: "asc" }],
        include: { category: { select: { nameFa: true } } },
      }),
      prisma.menuPublication.findFirst({
        where: { venueId, status: "published" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.menuPublication.findMany({
        where: { venueId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, status: true, trigger: true, createdAt: true },
      }),
    ]);

  if (!venue) redirect("/venues");

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
    photoUrl: i.photoUrl,
  }));

  const hasUnpublishedChanges = !lastPublication ? true : await (async () => {
    const dates = [new Date(venue.updatedAt)];

    const [catAgg, itemAgg] = await Promise.all([
      prisma.category.aggregate({
        where: { venueId, deletedAt: null },
        _max: { updatedAt: true },
      }),
      prisma.menuItem.aggregate({
        where: { venueId, deletedAt: null },
        _max: { updatedAt: true },
      }),
    ]);
    if (catAgg._max.updatedAt) dates.push(new Date(catAgg._max.updatedAt));
    if (itemAgg._max.updatedAt) dates.push(new Date(itemAgg._max.updatedAt));

    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    return maxDate > new Date(lastPublication.createdAt);
  })();

  const publications = publicationsData.map((pub) => ({
    id: pub.id,
    status: pub.status,
    trigger: pub.trigger,
    createdAt: pub.createdAt.toISOString(),
    createdAtLabel: pub.createdAt.toLocaleDateString("fa-IR"),
  }));

  return (
    <MenuClient
      venueId={venueId}
      categories={categoriesData}
      items={itemsData}
      venuePublicStatus={venue.publicStatus}
      hasUnpublishedChanges={hasUnpublishedChanges}
      publicUrl={getPublicMenuUrl(venue.slug)}
      publications={publications}
    />
  );
}
