import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";

export async function buildPublicSnapshot(venueSlug: string) {
  const venue = await prisma.venue.findUnique({
    where: { slug: venueSlug },
    select: {
      id: true, slug: true, nameFa: true, nameEn: true,
      welcomeMessage: true, accentColor: true, logoUrl: true,
    },
  });
  if (!venue) {
    return null;
  }

  const categories = await prisma.category.findMany({
    where: { venueId: venue.id, deletedAt: null, active: true },
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
