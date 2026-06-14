import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicationsClient } from "./PublicationsClient";

export default async function PublicationsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const publications = await prisma.menuPublication.findMany({
    where: { venueId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = publications.map((p) => ({
    id: p.id,
    status: p.status,
    trigger: p.trigger,
    createdAt: p.createdAt.toISOString(),
  }));

  return <PublicationsClient publications={data} />;
}
