import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
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

  const [venue, members] = await Promise.all([
    prisma.venue.findUnique({ where: { id: venueId } }),
    prisma.venueMember.findMany({
      where: { venueId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!venue) redirect("/venues");

  return (
    <SettingsClient
      venueId={venueId}
      nameFa={venue.nameFa}
      nameEn={venue.nameEn}
      slug={venue.slug}
      timezone={venue.timezone}
      plan={venue.plan}
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
    />
  );
}
