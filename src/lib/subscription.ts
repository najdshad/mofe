import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-helpers";

export const TRIAL_DAYS = 14;

export const SUBSCRIPTION_PLANS = {
  monthly: {
    key: "monthly",
    label: "ماهانه",
    amountToman: 249_000,
    durationDays: 30,
  },
  yearly: {
    key: "yearly",
    label: "سالانه",
    amountToman: 2_390_000,
    durationDays: 365,
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return value === "monthly" || value === "yearly";
}

export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return prisma.subscription.create({
    data: {
      userId,
      plan: "trial",
      status: "trialing",
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    },
  });
}

export async function getSubscriptionStatus(userId: string) {
  const subscription = await ensureSubscription(userId);
  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd ?? subscription.trialEndsAt;
  const isTrial = subscription.status === "trialing";
  const active =
    (isTrial && Boolean(subscription.trialEndsAt && subscription.trialEndsAt > now)) ||
    (subscription.status === "active" && Boolean(periodEnd && periodEnd > now));

  if (!active && subscription.status !== "expired") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "expired" },
    });
  }

  return {
    subscription: active ? subscription : { ...subscription, status: "expired" },
    active,
    isTrial: active && isTrial,
    periodEnd,
  };
}

export async function requireActiveSubscription(userId: string) {
  const status = await getSubscriptionStatus(userId);
  if (!status.active) {
    throw new ApiError("اشتراک شما فعال نیست. لطفاً یکی از پلن‌ها را انتخاب کنید.", 402);
  }
  return status;
}

export function formatSubscriptionStatus(status: string) {
  switch (status) {
    case "trialing":
      return "دوره آزمایشی";
    case "active":
      return "فعال";
    case "past_due":
      return "در انتظار پرداخت";
    case "canceled":
      return "لغو شده";
    case "expired":
      return "منقضی شده";
    default:
      return status;
  }
}
