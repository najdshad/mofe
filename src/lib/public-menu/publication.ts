import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { logAudit } from "@/lib/audit";

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
        include: {
          variants: { orderBy: { displayOrder: "asc" } },
          prices: { orderBy: { displayOrder: "asc" } },
          allergens: true,
        },
      },
    },
  });

  const itemPhotoIds: string[] = [];
  if (venue.menuPhotoMode) {
    for (const cat of categories) {
      for (const item of cat.menuItems) {
        if (item.photoAssetId) itemPhotoIds.push(item.photoAssetId);
      }
    }
  }

  const assetIds = new Set<string>();
  if (venue.logoAssetId) assetIds.add(venue.logoAssetId);
  for (const id of itemPhotoIds) assetIds.add(id);

  const assets = assetIds.size > 0
    ? await prisma.asset.findMany({
        where: { id: { in: Array.from(assetIds) } },
        select: { id: true, publicUrl: true },
      })
    : [];
  const assetMap = new Map(assets.map((a) => [a.id, a.publicUrl]));

  const publicUrl = getPublicMenuUrl(venue.slug);

  return {
    venue: {
      id: venue.id,
      nameFa: venue.nameFa,
      nameEn: venue.nameEn,
      welcomeMessage: venue.welcomeMessage,
      accentColor: venue.accentColor,
      logoUrl: venue.logoAssetId ? assetMap.get(venue.logoAssetId) ?? null : null,
      slug: venue.slug,
      publicUrl,
      publicStatus: venue.publicStatus,
      menuPhotoMode: venue.menuPhotoMode,
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
          variants: item.variants.map((v) => ({
            nameFa: v.nameFa,
            nameEn: v.nameEn,
            priceModifier: v.priceModifier,
          })),
          prices: item.prices.map((p) => ({
            description: p.description,
            priceToman: p.priceToman,
          })),
          allergenCodes: item.allergens.map((a) => a.allergenCode),
          photoUrl:
            venue.menuPhotoMode && item.photoAssetId
              ? assetMap.get(item.photoAssetId) ?? null
              : null,
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

  await logAudit({
    venueId,
    actorUserId: userId,
    action: "publish",
    entityType: "venue",
    entityId: venueId,
    metadata: { publicationId: publication.id },
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

  await logAudit({
    venueId,
    actorUserId: userId,
    action: "unpublish",
    entityType: "venue",
    entityId: venueId,
  });

  return { success: true };
}
