import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { logAudit } from "@/lib/audit";
import { clearMenuCache } from "@/lib/menu-cache";
import { renderPublicMenu } from "./renderer";
import { getStorage } from "@/lib/storage";
import crypto from "crypto";

export async function buildPublicSnapshot(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true, slug: true, nameFa: true, nameEn: true,
      welcomeMessage: true, accentColor: true, logoUrl: true,
      publicStatus: true,
    },
  });
  if (!venue) {
    return null;
  }

  const categories = await prisma.category.findMany({
    where: { venueId, deletedAt: null, active: true },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
        include: {
          variants: { orderBy: { displayOrder: "asc" } },
          prices: { orderBy: { displayOrder: "asc" } },
          allergens: true,
        },
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
      logoUrl: venue.logoUrl ?? null,
      slug: venue.slug,
      publicUrl,
      publicStatus: venue.publicStatus,
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
          photoUrl: item.photoUrl ?? null,
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

  const [publication] = await prisma.$transaction([
    prisma.menuPublication.create({
      data: {
        venueId,
        status: "published",
        trigger: "manual_publish",
        snapshot: JSON.stringify(snapshot),
        createdByUserId: userId,
        completedAt: new Date(),
      },
    }),
    prisma.venue.update({
      where: { id: venueId },
      data: {
        publicStatus: "published",
        publishedAt: new Date(),
      },
    }),
  ]);

  await trimPublications(venueId);

  clearMenuCache(snapshot.venue.slug);

  try {
    const html = renderPublicMenu(snapshot as Parameters<typeof renderPublicMenu>[0]);
    const storage = await getStorage();
    const contentHash = crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 12);
    const key = `menus/${snapshot.venue.slug}-${contentHash}.html`;
    const result = await storage.save(key, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");
    await prisma.menuPublication.update({
      where: { id: publication.id },
      data: { staticAssetUrl: result.url },
    });
  } catch {
    // CDN upload failure is non-critical — menu still served from origin
  }

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

async function trimPublications(venueId: string) {
  const ids = await prisma.menuPublication.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
    skip: 5,
    select: { id: true },
  });
  if (ids.length > 0) {
    await prisma.menuPublication.deleteMany({
      where: { id: { in: ids.map((r) => r.id) } },
    });
  }
}

export async function unpublishVenueMenu(venueId: string, userId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { slug: true },
  });

  await prisma.$transaction([
    prisma.menuPublication.create({
      data: {
        venueId,
        status: "unpublished",
        trigger: "manual_unpublish",
        createdByUserId: userId,
        completedAt: new Date(),
      },
    }),
    prisma.venue.update({
      where: { id: venueId },
      data: {
        publicStatus: "unpublished",
        unpublishedAt: new Date(),
      },
    }),
  ]);

  await trimPublications(venueId);

  if (venue) clearMenuCache(venue.slug);

  await logAudit({
    venueId,
    actorUserId: userId,
    action: "unpublish",
    entityType: "venue",
    entityId: venueId,
  });

  return { success: true };
}
