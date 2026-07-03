import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess, canManage } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { QRMenuClient } from "./QRMenuClient";

export default async function QRMenuPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) redirect("/venues");

  const canUserPublish = await canManage(user.id, venueId);

  const lastPublication = await prisma.menuPublication.findFirst({
    where: { venueId, status: "published" },
    orderBy: { createdAt: "desc" },
  });

  const hasUnpublishedChanges = !lastPublication ? true : await (async () => {
    const dates = [new Date(venue.updatedAt)];

    const catAgg = await prisma.category.aggregate({
      where: { venueId, deletedAt: null },
      _max: { updatedAt: true },
    });
    if (catAgg._max.updatedAt) dates.push(new Date(catAgg._max.updatedAt));

    const itemAgg = await prisma.menuItem.aggregate({
      where: { venueId, deletedAt: null },
      _max: { updatedAt: true },
    });
    if (itemAgg._max.updatedAt) dates.push(new Date(itemAgg._max.updatedAt));

    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    return maxDate > new Date(lastPublication.createdAt);
  })();

  const categories = await prisma.category.findMany({
    where: { venueId, deletedAt: null, active: true },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  const publicationsData = await prisma.menuPublication.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const publications = publicationsData.map((pub) => ({
    id: pub.id,
    status: pub.status,
    trigger: pub.trigger,
    createdAt: pub.createdAt.toISOString(),
    createdAtLabel: pub.createdAt.toLocaleDateString("fa-IR"),
  }));

  const preview = {
    venue: {
      nameFa: venue.nameFa,
      nameEn: venue.nameEn,
      welcomeMessage: venue.welcomeMessage,
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
        })),
      })),
  };

  return (
    <QRMenuClient
      venueId={venueId}
      venueNameFa={venue.nameFa}
      venueNameEn={venue.nameEn}
      venueWelcomeMessage={venue.welcomeMessage}
      venueLogoUrl={venue.logoAssetId}
      venuePublicStatus={venue.publicStatus}
      venueSlug={venue.slug}
      canPublish={canUserPublish}
      preview={preview}
      hasUnpublishedChanges={hasUnpublishedChanges}
      lastPublicationCompletedAt={lastPublication?.completedAt?.toISOString() ?? null}
      publicUrl={getPublicMenuUrl(venue.slug)}
      publications={publications}
    />
  );
}
