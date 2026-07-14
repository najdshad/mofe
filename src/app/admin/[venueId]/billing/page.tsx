import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSubscription, getSubscriptionUsage } from "@/lib/subscription";
import { BillingClient } from "./BillingClient";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const [plans, sub, usage] = await Promise.all([
    prisma.plan.findMany({
      where: { purchasable: true },
      orderBy: { sortOrder: "asc" },
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
    getSubscriptionUsage(venueId),
  ]);

  const rawInvoices = sub
    ? await prisma.invoice.findMany({
        where: { subscriptionId: sub.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amountToman: true,
          status: true,
          refId: true,
          paidAt: true,
          periodStart: true,
          periodEnd: true,
          description: true,
          createdAt: true,
        },
      })
    : [];

  const invoices = rawInvoices.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    periodStart: inv.periodStart.toISOString(),
    periodEnd: inv.periodEnd.toISOString(),
  }));

  const serializedSub = sub
    ? {
        id: sub.id,
        status: sub.status,
        plan: {
          id: sub.plan.id,
          slug: sub.plan.slug,
          nameFa: sub.plan.nameFa,
          nameEn: sub.plan.nameEn,
          description: sub.plan.description,
          priceToman: sub.plan.priceToman,
          maxMenuItems: sub.plan.maxMenuItems,
          maxTables: sub.plan.maxTables,
          customDomain: sub.plan.customDomain,
          orderingEnabled: sub.plan.orderingEnabled,
        },
        trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        canceledAt: sub.canceledAt?.toISOString() ?? null,
      }
    : null;

  return (
    <BillingClient
      venueId={venueId}
      plans={plans}
      subscription={serializedSub}
      usage={usage}
      invoices={invoices}
    />
  );
}
