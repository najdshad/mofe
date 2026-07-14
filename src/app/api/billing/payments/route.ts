import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { getCurrentSubscription, changePlan } from "@/lib/subscription";
import { requestPayment } from "@/lib/zarinpal";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

function computeDiscount(
  baseAmount: number,
  coupon: { discountType: string; discountValue: number } | null
): number {
  if (!coupon) return 0;
  if (coupon.discountType === "percentage") {
    return Math.round(baseAmount * coupon.discountValue / 100);
  }
  return Math.min(coupon.discountValue, baseAmount);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { venueId, planId, couponId } = body;
    if (!venueId) {
      return NextResponse.json({ error: "venueId required" }, { status: 400 });
    }
    await requireVenueAccess(user.id, venueId);

    if (planId) {
      await changePlan(venueId, planId);
    }

    const sub = await getCurrentSubscription(venueId);
    if (!sub) {
      return NextResponse.json({ error: "اشتراکی یافت نشد" }, { status: 404 });
    }
    if (!sub.plan.purchasable) {
      return NextResponse.json({ error: "طرح پایه قابل تمدید نیست" }, { status: 400 });
    }

    let coupon = null;
    let discountAmount = 0;
    if (couponId) {
      coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (coupon) {
        discountAmount = computeDiscount(sub.plan.priceToman, coupon);
      }
    }

    const baseAmount = sub.plan.priceToman;
    const finalAmount = Math.max(0, baseAmount - discountAmount);
    const now = new Date();
    const alreadyActive = sub.status === "active" && sub.currentPeriodEnd > now;
    const periodStart = alreadyActive ? sub.currentPeriodEnd : now;
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId: sub.id,
        baseAmount,
        discountAmount: discountAmount || null,
        couponId: coupon?.id ?? null,
        couponCode: coupon?.code ?? null,
        amountToman: finalAmount,
        status: "pending",
        periodStart,
        periodEnd,
        description: `پرداخت اشتراک ${sub.plan.nameFa} - یک ماهه`,
      },
    });

    if (coupon && coupon.maxUses !== -1) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const { authority, redirectUrl } = await requestPayment(
      finalAmount,
      `پرداخت اشتراک ${sub.plan.nameFa} - ${coupon ? `(کد تخفیف: ${coupon.code}) ` : ""}مجموعه ${sub.venueId}`
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
      metadata: { amount: finalAmount, baseAmount, discountAmount, plan: sub.plan.slug, authority, couponCode: coupon?.code },
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
