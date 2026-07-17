import { getCurrentUser } from "@/lib/auth";
import { getVenueMembership } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrdersClient } from "./OrdersClient";

export default async function StaffOrdersPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const membership = await getVenueMembership(user.id, venueId);
  if (!membership) redirect("/venues");

  const [tables, categories] = await Promise.all([
    prisma.venueTable.findMany({
      where: { venueId, isActive: true },
      orderBy: { number: "asc" },
    }),
    prisma.category.findMany({
      where: { venueId, active: true },
      orderBy: { displayOrder: "asc" },
      include: {
        menuItems: {
          where: { deletedAt: null, venueId },
          orderBy: { displayOrder: "asc" },
          include: {
            variants: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
    }),
  ]);

  return (
    <OrdersClient
      venueId={venueId}
      tables={tables.map((t) => ({ id: t.id, number: t.number, label: t.label || undefined, tags: t.tags, status: t.status }))}
      categories={categories.map((c) => ({
        id: c.id,
        nameFa: c.nameFa,
        items: c.menuItems.map((mi) => ({
          id: mi.id,
          nameFa: mi.nameFa,
          nameEn: mi.nameEn || undefined,
          priceToman: mi.priceToman,
          station: mi.station,
          isSoldOut: mi.isSoldOut,
          variants: mi.variants.map((v) => ({
            id: v.id,
            nameFa: v.nameFa,
            nameEn: v.nameEn || undefined,
            priceModifier: v.priceModifier,
          })),
        })),
      }))}
    />
  );
}
