import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-helpers";

export type SubscriptionData = NonNullable<Awaited<ReturnType<typeof getCurrentSubscription>>>;

export async function getCurrentSubscription(venueId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { venueId },
    include: { plan: true },
  });
  return sub;
}

export async function getSubscriptionUsage(venueId: string) {
  const [itemCount, tableCount] = await Promise.all([
    prisma.menuItem.count({ where: { venueId, deletedAt: null } }),
    prisma.venueTable.count({ where: { venueId, isActive: true } }),
  ]);
  return { itemCount, tableCount };
}

export async function checkItemLimit(
  venueId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const sub = await getCurrentSubscription(venueId);
  const max = sub?.plan.maxMenuItems ?? 10;
  const current = await prisma.menuItem.count({ where: { venueId, deletedAt: null } });
  return { allowed: max === -1 || current < max, current, max };
}

export async function checkTableLimit(
  venueId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const sub = await getCurrentSubscription(venueId);
  const max = sub?.plan.maxTables ?? 3;
  const current = await prisma.venueTable.count({ where: { venueId, isActive: true } });
  return { allowed: max === -1 || current < max, current, max };
}

export function canUseOrdering(plan?: { orderingEnabled: boolean } | null): boolean {
  return plan?.orderingEnabled ?? false;
}

export function canUseCustomDomain(plan?: { customDomain: boolean } | null): boolean {
  return plan?.customDomain ?? false;
}

export async function requireActiveSubscription(venueId: string): Promise<SubscriptionData> {
  const sub = await getCurrentSubscription(venueId);
  if (!sub) {
    throw new ApiError("اشتراکی برای این مجموعه یافت نشد", 402);
  }
  if (sub.status === "expired") {
    throw new ApiError("اشتراک شما منقضی شده است. لطفاً برای ادامه استفاده، اشتراک خود را تمدید کنید.", 402);
  }
  return sub;
}

export async function isSubscriptionActive(venueId: string): Promise<boolean> {
  const sub = await getCurrentSubscription(venueId);
  if (!sub) return false;
  return sub.status === "trial" || sub.status === "active" || sub.status === "past_due";
}

export async function ensureTrialSubscription(venueId: string) {
  const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
  if (!basicPlan) throw new Error("Basic plan not seeded");

  const now = new Date();
  const trialEnd = new Date(now.getTime() + basicPlan.trialDays * 24 * 60 * 60 * 1000);

  const existing = await prisma.subscription.findUnique({
    where: { venueId },
    include: { plan: true },
  });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      venueId,
      planId: basicPlan.id,
      status: "trial",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
    include: { plan: true },
  });
}

export async function changePlan(
  venueId: string,
  newPlanId: string
): Promise<{ immediate: boolean; proratedAmount?: number }> {
  const sub = await getCurrentSubscription(venueId);
  if (!sub) throw new ApiError("اشتراکی یافت نشد", 404);

  const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
  if (!newPlan) throw new ApiError("طرح مورد نظر یافت نشد", 404);
  if (!newPlan.purchasable) throw new ApiError("این طرح قابل خرید نیست", 400);

  const oldPlan = sub.plan;
  const now = new Date();
  const isExpired = sub.status === "expired" || sub.currentPeriodEnd <= now;
  const wasFree = oldPlan.priceToman === 0;

  if (wasFree || isExpired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: newPlan.id,
        status: "trial",
      },
    });

    return { immediate: true, proratedAmount: newPlan.priceToman };
  }

  if (newPlan.priceToman > oldPlan.priceToman) {
    const msInPeriod = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime();
    const msRemaining = Math.max(0, sub.currentPeriodEnd.getTime() - now.getTime());
    const ratio = msRemaining / msInPeriod;
    const priceDiff = newPlan.priceToman - oldPlan.priceToman;
    const proratedAmount = Math.round(priceDiff * ratio);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: newPlan.id,
        currentPeriodEnd: new Date(now.getTime() + msRemaining),
      },
    });

    return { immediate: true, proratedAmount };
  } else {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { planId: newPlan.id },
    });

    return { immediate: false };
  }
}

export async function extendSubscription(venueId: string, months = 1) {
  const sub = await getCurrentSubscription(venueId);
  if (!sub) throw new ApiError("اشتراکی یافت نشد", 404);

  const now = new Date();
  const alreadyActive = sub.status === "active" && sub.currentPeriodEnd > now;

  const base = alreadyActive ? sub.currentPeriodEnd : now;
  const newEnd = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);

  return prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "active",
      currentPeriodStart: base,
      currentPeriodEnd: newEnd,
    },
    include: { plan: true },
  });
}

export async function expireSubscription(venueId: string) {
  return prisma.subscription.update({
    where: { venueId },
    data: { status: "expired" },
  });
}

export const PLAN_LABELS: Record<string, string> = {
  basic: "پایه",
  pro: "حرفه‌ای",
  premium: "پریمیوم",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trial: "دوره آزمایشی",
  active: "فعال",
  past_due: "سررسید شده",
  canceled: "لغو شده",
  expired: "منقضی شده",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  failed: "ناموفق",
  refunded: "بازگشت وجه",
};
