import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const { code, planId } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "کد تخفیف وارد کنید" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ error: "کد تخفیف نامعتبر است" }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "این کد تخفیف غیرفعال است" }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ error: "این کد تخفیف منقضی شده است" }, { status: 400 });
    }

    if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "این کد تخفیف به حداکثر استفاده رسیده است" }, { status: 400 });
    }

    if (planId && coupon.appliesToPlanSlug) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (plan && plan.slug !== coupon.appliesToPlanSlug) {
        return NextResponse.json({ error: "این کد تخفیف برای این طرح قابل استفاده نیست" }, { status: 400 });
      }
    }

    if (planId && coupon.minPlanPrice) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (plan && plan.priceToman < coupon.minPlanPrice) {
        return NextResponse.json({ error: "این کد تخفیف برای طرح‌های با قیمت بالاتر قابل استفاده است" }, { status: 400 });
      }
    }

    const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;
    const baseAmount = plan?.priceToman ?? 0;
    let discountAmount = 0;

    if (coupon.discountType === "percentage") {
      discountAmount = Math.round(baseAmount * coupon.discountValue / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, baseAmount);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
      finalAmount: baseAmount - discountAmount,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
