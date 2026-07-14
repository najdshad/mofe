import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSubscription } from "@/lib/subscription";
import { PayClient } from "./PayClient";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>;
  searchParams: Promise<{ planId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const { planId } = await searchParams;
  if (!planId) redirect(`/admin/${venueId}/billing`);

  const [plan, sub] = await Promise.all([
    prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        description: true,
        priceToman: true,
        maxMenuItems: true,
        maxTables: true,
        customDomain: true,
        orderingEnabled: true,
      },
    }),
    getCurrentSubscription(venueId),
  ]);

  if (!plan || !plan.priceToman || plan.priceToman <= 0) {
    redirect(`/admin/${venueId}/billing`);
  }

  return (
    <PayClient
      venueId={venueId}
      plan={{
        id: plan.id,
        slug: plan.slug,
        nameFa: plan.nameFa,
        nameEn: plan.nameEn,
        description: plan.description,
        priceToman: plan.priceToman,
        maxMenuItems: plan.maxMenuItems,
        maxTables: plan.maxTables,
        customDomain: plan.customDomain,
        orderingEnabled: plan.orderingEnabled,
      }}
      subscriptionStatus={sub?.status ?? null}
    />
  );
}
