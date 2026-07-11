import { getCurrentUser } from "@/lib/auth";
import { requireRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminOrdersClient } from "./AdminOrdersClient";

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireRole(user.id, venueId, ["owner", "manager"]);

  const [tables, categories] = await Promise.all([
    prisma.venueTable.findMany({
      where: { venueId },
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
    <AdminOrdersClient
      venueId={venueId}
      tables={tables.map((t) => ({
        id: t.id,
        number: t.number,
        label: t.label || undefined,
        isActive: t.isActive,
        status: t.status,
      }))}
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
