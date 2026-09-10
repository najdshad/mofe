import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ImportClient } from "./ImportClient";

export default async function MenuImportPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const access = await requireVenueAccess(user.id, venueId).catch(() => null);
  if (!access) redirect("/venues");

  return <ImportClient venueId={venueId} />;
}
