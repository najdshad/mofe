import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateInput, getRollingRange } from "@/lib/ledger-range";
import { SalesClient } from "./SalesClient";

export default async function SalesPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const initialRange = getRollingRange(30);
  const [items, entries] = await Promise.all([
    prisma.menuItem.findMany({
      where: { venueId, deletedAt: null },
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
      select: {
        id: true,
        nameFa: true,
        priceToman: true,
        category: { select: { nameFa: true } },
      },
    }),
    prisma.ledgerEntry.findMany({
      where: { venueId, occurredAt: { gte: initialRange.from, lte: initialRange.to } },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      include: { saleItems: true },
    }),
  ]);

  return (
    <SalesClient
      venueId={venueId}
      defaultCustomFrom={formatDateInput(initialRange.from)}
      defaultCustomTo={formatDateInput(initialRange.to)}
      menuItems={items.map((item) => ({
        id: item.id,
        nameFa: item.nameFa,
        categoryNameFa: item.category.nameFa,
        priceToman: item.priceToman,
      }))}
      initialEntries={entries.map((entry) => ({
        ...entry,
        type: entry.type === "expense" ? "expense" : "sale",
        occurredAt: entry.occurredAt.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        tags: entry.tags ? entry.tags.split(",").filter(Boolean) : [],
      }))}
    />
  );
}
