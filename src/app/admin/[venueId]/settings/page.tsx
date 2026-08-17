import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { normalizeThemePreset } from "@/lib/themes";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true, nameFa: true, nameEn: true, slug: true,
      welcomeMessage: true, logoUrl: true, themeId: true, accentColor: true,
    },
  });

  if (!venue) redirect("/venues");

  return (
    <SettingsClient
      venueId={venueId}
      nameFa={venue.nameFa}
      nameEn={venue.nameEn}
      slug={venue.slug}
      welcomeMessage={venue.welcomeMessage}
      logoUrl={venue.logoUrl}
      themeId={normalizeThemePreset(venue.themeId)}
      accentColor={venue.accentColor}
      publicMenuDomain={getPublicMenuUrl(venue.slug)}
    />
  );
}
