import { NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/api-helpers";
import { validateCsrf } from "@/lib/csrf";
import {
  ensureSubscription,
  getSubscriptionStatus,
  isSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    const status = await getSubscriptionStatus(user.id);
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      subscription: {
        ...status.subscription,
        currentPeriodStart: status.subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: status.periodEnd?.toISOString() ?? null,
        trialEndsAt: status.subscription.trialEndsAt?.toISOString() ?? null,
      },
      active: status.active,
      plans: Object.values(SUBSCRIPTION_PLANS),
      payments: payments.map((payment) => ({
        ...payment,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    await validateCsrf();
    const body = await request.json().catch(() => ({}));
    const action = body.action ?? "checkout";
    const subscription = await ensureSubscription(user.id);

    if (action === "cancel" || action === "resume") {
      if (subscription.plan === "trial") {
        return NextResponse.json({ error: "دوره آزمایشی قابل لغو نیست" }, { status: 400 });
      }
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data:
          action === "cancel"
            ? { cancelAtPeriodEnd: true, canceledAt: new Date() }
            : { cancelAtPeriodEnd: false, canceledAt: null, status: "active" },
      });
      return NextResponse.json({ subscription: updated });
    }

    if (!isSubscriptionPlan(body.plan)) {
      return NextResponse.json({ error: "پلن انتخاب‌شده نامعتبر است" }, { status: 400 });
    }

    const current = await getSubscriptionStatus(user.id);
    if (current.active && current.subscription.plan !== "trial") {
      return NextResponse.json({ error: "اشتراک شما از قبل فعال است" }, { status: 409 });
    }

    const selectedPlan = body.plan as keyof typeof SUBSCRIPTION_PLANS;
    const plan = SUBSCRIPTION_PLANS[selectedPlan];
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        plan: plan.key,
        amountToman: plan.amountToman,
        status: "pending",
        metadata: JSON.stringify({ source: "manual", requestedAt: new Date().toISOString() }),
      },
    });

    return NextResponse.json(
      {
        paymentId: payment.id,
        status: payment.status,
        message: "درخواست پرداخت ثبت شد. اتصال درگاه پرداخت پس از تنظیم کلیدهای سرویس انجام می‌شود.",
      },
      { status: 202 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
