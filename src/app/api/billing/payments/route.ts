import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { getCurrentSubscription } from "@/lib/subscription";
import { requestPayment } from "@/lib/zarinpal";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { venueId } = body;
    if (!venueId) {
      return NextResponse.json({ error: "venueId required" }, { status: 400 });
    }
    await requireVenueAccess(user.id, venueId);

    const sub = await getCurrentSubscription(venueId);
    if (!sub) {
      return NextResponse.json({ error: "اشتراکی یافت نشد" }, { status: 404 });
    }
    if (!sub.plan.purchasable) {
      return NextResponse.json({ error: "طرح پایه قابل تمدید نیست" }, { status: 400 });
    }

    const amount = sub.plan.priceToman;
    const now = new Date();
    const alreadyActive = sub.status === "active" && sub.currentPeriodEnd > now;
    const periodStart = alreadyActive ? sub.currentPeriodEnd : now;
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId: sub.id,
        amountToman: amount,
        status: "pending",
        periodStart,
        periodEnd,
        description: `پرداخت اشتراک ${sub.plan.nameFa} - یک ماهه`,
      },
    });

    const { authority, redirectUrl } = await requestPayment(
      amount,
      `پرداخت اشتراک ${sub.plan.nameFa} - مجموعه ${sub.venueId}`
    );

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { authority },
    });

    await logAudit({
      venueId,
      actorUserId: user.id,
      action: "billing.payment_request",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { amount, plan: sub.plan.slug, authority },
    });

    return NextResponse.json({
      success: true,
      authority,
      redirectUrl,
      invoiceId: invoice.id,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
