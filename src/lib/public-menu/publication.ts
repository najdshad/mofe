import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";

export async function buildPublicSnapshot(venueId: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    return null;
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

  const publicUrl = getPublicMenuUrl(venue.slug);

  return {
    venue: {
      id: venue.id,
      nameFa: venue.nameFa,
      nameEn: venue.nameEn,
      welcomeMessage: venue.welcomeMessage,
      accentColor: venue.accentColor,
      logoUrl: venue.logoAssetId,
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
}

export async function publishVenueMenu(venueId: string, userId: string) {
  const snapshot = await buildPublicSnapshot(venueId);
  if (!snapshot) {
    return null;
  }

  const publication = await prisma.menuPublication.create({
    data: {
      venueId,
      status: "published",
      trigger: "manual_publish",
      snapshot: JSON.stringify(snapshot),
      createdByUserId: userId,
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

  return { publication, snapshot };
}

export async function unpublishVenueMenu(venueId: string, userId: string) {
  await prisma.menuPublication.create({
    data: {
      venueId,
      status: "unpublished",
      trigger: "manual_unpublish",
      createdByUserId: userId,
      completedAt: new Date(),
    },
  });

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      publicStatus: "unpublished",
      unpublishedAt: new Date(),
    },
  });

  return { success: true };
}
