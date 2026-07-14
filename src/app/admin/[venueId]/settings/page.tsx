import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { getCurrentSubscription } from "@/lib/subscription";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  const [venue, members, sub] = await Promise.all([
    prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true, nameFa: true, nameEn: true, slug: true, timezone: true,
        plan: true, welcomeMessage: true, logoAssetId: true,
      },
    }),
    prisma.venueMember.findMany({
      where: { venueId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    getCurrentSubscription(venueId),
  ]);

  if (!venue) redirect("/venues");

  return (
    <SettingsClient
      venueId={venueId}
      nameFa={venue.nameFa}
      nameEn={venue.nameEn}
      slug={venue.slug}
      timezone={venue.timezone}
      welcomeMessage={venue.welcomeMessage}
      logoUrl={venue.logoAssetId}
      members={members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
      }))}
      currentUserRole={membership.role}
      currentUserId={user.id}
      publicMenuDomain={getPublicMenuUrl(venue.slug)}
      subscription={sub ? {
        plan: {
          customDomain: sub.plan.customDomain,
          orderingEnabled: sub.plan.orderingEnabled,
        },
      } : null}
    />
  );
}
