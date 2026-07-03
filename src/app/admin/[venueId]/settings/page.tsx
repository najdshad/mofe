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

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) redirect("/venues");

  const members = await prisma.venueMember.findMany({
    where: { venueId },
    include: { user: true },
  });

  return (
    <SettingsClient
      venueId={venueId}
      nameFa={venue.nameFa}
      nameEn={venue.nameEn}
      slug={venue.slug}
      timezone={venue.timezone}
      plan={venue.plan}
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
