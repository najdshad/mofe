import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { SalesClient } from "./SalesClient";

export default async function SalesPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  return <SalesClient venueId={venueId} currentUserRole={membership.role} />;
}
