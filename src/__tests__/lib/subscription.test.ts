import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanTestData, seedTestData, seedTestPlans, seedTestSubscription } from "../helpers";
import { prisma } from "@/lib/prisma";

import {
  getCurrentSubscription,
  getSubscriptionUsage,
  checkItemLimit,
  checkTableLimit,
  canUseOrdering,
  canUseCustomDomain,
  requireActiveSubscription,
  isSubscriptionActive,
  ensureTrialSubscription,
  changePlan,
  extendSubscription,
  expireSubscription,
} from "@/lib/subscription";
import { ApiError } from "@/lib/api-helpers";

let data: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

describe("getCurrentSubscription", () => {
  it("returns subscription with plan included", async () => {
    const sub = await getCurrentSubscription(data.venue.id);
    expect(sub).not.toBeNull();
    expect(sub!.plan).toBeDefined();
    expect(sub!.plan.slug).toBe("premium");
    expect(sub!.venueId).toBe(data.venue.id);
  });

  it("returns null for venue without subscription", async () => {
    const sub = await getCurrentSubscription("nonexistent-venue-id");
    expect(sub).toBeNull();
  });
});

describe("getSubscriptionUsage", () => {
  it("returns itemCount and tableCount for venue", async () => {
    const usage = await getSubscriptionUsage(data.venue.id);
    expect(usage).toMatchObject({
      itemCount: expect.any(Number),
      tableCount: expect.any(Number),
    });
    expect(usage.itemCount).toBeGreaterThanOrEqual(3);
    expect(usage.tableCount).toBeGreaterThanOrEqual(0);
  });

  it("excludes soft-deleted items from count", async () => {
    // Create a deleted item
    await prisma.menuItem.create({
      data: {
        venueId: data.venue.id,
        categoryId: data.categories.cat1.id,
        nameFa: "موقت برای تست",
        priceToman: 50000,
        station: "kitchen",
        displayOrder: 99,
        deletedAt: new Date(),
      },
    });

    const usage = await getSubscriptionUsage(data.venue.id);
    const items = await prisma.menuItem.count({
      where: { venueId: data.venue.id, deletedAt: null },
    });
    // The usage count should match the non-deleted count
    expect(usage.itemCount).toBe(items);
  });

  it("excludes inactive tables from count", async () => {
    await prisma.venueTable.create({
      data: { venueId: data.venue.id, number: 999, isActive: false },
    });

    const usage = await getSubscriptionUsage(data.venue.id);
    const activeTables = await prisma.venueTable.count({
      where: { venueId: data.venue.id, isActive: true },
    });
    expect(usage.tableCount).toBe(activeTables);
  });
});

describe("checkItemLimit", () => {
  it("returns allowed=true with -1 max (unlimited)", async () => {
    const result = await checkItemLimit(data.venue.id);
    expect(result.allowed).toBe(true);
    expect(result.max).toBe(-1);
    expect(result.current).toBeGreaterThanOrEqual(3);
  });

  it("returns allowed=false when at limit", async () => {
    // Temporarily switch to a plan with limited items
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    proPlan!.maxMenuItems = 3;
    await prisma.plan.update({ where: { id: proPlan!.id }, data: { maxMenuItems: 3 } });

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: proPlan!.id },
    });

    const result = await checkItemLimit(data.venue.id);
    expect(result.allowed).toBe(false);
    expect(result.current).toBeGreaterThanOrEqual(3);
    expect(result.max).toBe(3);

    // Restore
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: premiumPlan!.id },
    });
    await prisma.plan.update({ where: { id: proPlan!.id }, data: { maxMenuItems: 100 } });
  });

  it("returns allowed=true when under limit", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    await prisma.plan.update({ where: { id: proPlan!.id }, data: { maxMenuItems: 100 } });

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: proPlan!.id },
    });

    const result = await checkItemLimit(data.venue.id);
    expect(result.allowed).toBe(true);
    expect(result.current).toBeLessThan(100);
    expect(result.max).toBe(100);

    // Restore
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: premiumPlan!.id },
    });
  });
});

describe("checkTableLimit", () => {
  it("returns allowed=true with -1 max (unlimited)", async () => {
    const result = await checkTableLimit(data.venue.id);
    expect(result.allowed).toBe(true);
    expect(result.max).toBe(-1);
  });

  it("returns allowed=false when at limit", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    await prisma.plan.update({ where: { id: proPlan!.id }, data: { maxTables: 0 } });

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: proPlan!.id },
    });

    const result = await checkTableLimit(data.venue.id);
    expect(result.allowed).toBe(false);
    expect(result.max).toBe(0);

    // Restore
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: premiumPlan!.id },
    });
    await prisma.plan.update({ where: { id: proPlan!.id }, data: { maxTables: 10 } });
  });
});

describe("canUseOrdering / canUseCustomDomain", () => {
  it("returns correct values for premium plan", async () => {
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    expect(canUseOrdering(premiumPlan)).toBe(true);
    expect(canUseCustomDomain(premiumPlan)).toBe(true);
  });

  it("returns correct values for pro plan", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    expect(canUseOrdering(proPlan)).toBe(true);
    expect(canUseCustomDomain(proPlan)).toBe(true);
  });

  it("returns correct values for basic plan", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    expect(canUseOrdering(basicPlan)).toBe(false);
    expect(canUseCustomDomain(basicPlan)).toBe(false);
  });

  it("returns false when plan is null/undefined", async () => {
    expect(canUseOrdering(null)).toBe(false);
    expect(canUseOrdering(undefined)).toBe(false);
    expect(canUseCustomDomain(null)).toBe(false);
    expect(canUseCustomDomain(undefined)).toBe(false);
  });
});

describe("requireActiveSubscription", () => {
  it("returns subscription for active status", async () => {
    const sub = await requireActiveSubscription(data.venue.id);
    expect(sub).toBeDefined();
    expect(sub.status).toBe("active");
  });

  it("returns subscription for trial status", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "trial" },
    });

    const sub = await requireActiveSubscription(data.venue.id);
    expect(sub).toBeDefined();
    expect(sub.status).toBe("trial");

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("throws 402 for expired subscription", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "expired" },
    });

    await expect(requireActiveSubscription(data.venue.id)).rejects.toThrow(ApiError);
    await expect(requireActiveSubscription(data.venue.id)).rejects.toThrow(
      "اشتراک شما منقضی شده است"
    );

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("throws 402 when no subscription exists", async () => {
    await expect(requireActiveSubscription("nonexistent")).rejects.toThrow(ApiError);
    await expect(requireActiveSubscription("nonexistent")).rejects.toThrow(
      "اشتراکی برای این مجموعه یافت نشد"
    );
  });
});

describe("isSubscriptionActive", () => {
  it("returns true for active subscription", async () => {
    expect(await isSubscriptionActive(data.venue.id)).toBe(true);
  });

  it("returns true for trial subscription", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "trial" },
    });

    expect(await isSubscriptionActive(data.venue.id)).toBe(true);

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("returns true for past_due subscription", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "past_due" },
    });

    expect(await isSubscriptionActive(data.venue.id)).toBe(true);

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("returns false for expired subscription", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "expired" },
    });

    expect(await isSubscriptionActive(data.venue.id)).toBe(false);

    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("returns false when no subscription exists", async () => {
    expect(await isSubscriptionActive("nonexistent-venue")).toBe(false);
  });
});

describe("ensureTrialSubscription", () => {
  it("creates a new trial subscription for venue without one", async () => {
    const newVenue = await prisma.venue.create({
      data: { nameFa: "کافه جدید", slug: `new-venue-${Date.now()}` },
    });

    const sub = await ensureTrialSubscription(newVenue.id);
    expect(sub).not.toBeNull();
    expect(sub.status).toBe("trial");
    expect(sub.plan.slug).toBe("basic");
    expect(sub.trialEndsAt).not.toBeNull();
    expect(sub.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());

    // Verify it was saved
    const found = await prisma.subscription.findUnique({ where: { venueId: newVenue.id } });
    expect(found).not.toBeNull();

    await prisma.subscription.delete({ where: { venueId: newVenue.id } });
    await prisma.venue.delete({ where: { id: newVenue.id } });
  });

  it("returns existing subscription if one already exists", async () => {
    const sub = await ensureTrialSubscription(data.venue.id);
    expect(sub.plan.slug).toBe("premium"); // not basic, because it already exists
    expect(sub.status).toBe("active");
  });

  it("sets correct trial days from basic plan", async () => {
    const newVenue = await prisma.venue.create({
      data: { nameFa: "کافه تریال", slug: `trial-venue-${Date.now()}` },
    });

    const sub = await ensureTrialSubscription(newVenue.id);
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });

    const expectedEnd = new Date(sub.currentPeriodStart.getTime() + basicPlan!.trialDays * 24 * 60 * 60 * 1000);
    expect(sub.trialEndsAt!.getTime()).toBe(expectedEnd.getTime());

    await prisma.subscription.delete({ where: { venueId: newVenue.id } });
    await prisma.venue.delete({ where: { id: newVenue.id } });
  });
});

describe("changePlan", () => {
  it("sets immediate=true with full price for free-to-paid upgrade", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: basicPlan!.id, status: "trial" },
    });

    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const result = await changePlan(data.venue.id, proPlan!.id);

    expect(result.immediate).toBe(true);
    expect(result.proratedAmount).toBe(proPlan!.priceToman);

    const sub = await prisma.subscription.findUnique({
      where: { venueId: data.venue.id },
      include: { plan: true },
    });
    expect(sub!.plan.slug).toBe("pro");
  });

  it("sets immediate=true with full price for expired subscription", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "expired" },
    });

    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    const result = await changePlan(data.venue.id, premiumPlan!.id);

    expect(result.immediate).toBe(true);
    expect(result.proratedAmount).toBe(premiumPlan!.priceToman);
  });

  it("calculates prorated amount for upgrade during active period", async () => {
    // Set current plan to pro
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: proPlan!.id, status: "active" },
    });

    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    const result = await changePlan(data.venue.id, premiumPlan!.id);

    expect(result.immediate).toBe(true);
    expect(result.proratedAmount).toBeGreaterThan(0);
    expect(result.proratedAmount).toBeLessThan(premiumPlan!.priceToman);
  });

  it("sets immediate=false for downgrade", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const result = await changePlan(data.venue.id, proPlan!.id);

    expect(result.immediate).toBe(false);
    expect(result.proratedAmount).toBeUndefined();

    const sub = await prisma.subscription.findUnique({
      where: { venueId: data.venue.id },
      include: { plan: true },
    });
    expect(sub!.plan.slug).toBe("pro");
  });

  it("throws error for unknown plan", async () => {
    await expect(changePlan(data.venue.id, "nonexistent-plan-id")).rejects.toThrow("طرح مورد نظر یافت نشد");
  });

  it("throws error for non-purchasable plan", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    await expect(changePlan(data.venue.id, basicPlan!.id)).rejects.toThrow("این طرح قابل خرید نیست");
  });

  it("throws error for venue without subscription", async () => {
    await expect(changePlan("nonexistent", (await prisma.plan.findUnique({ where: { slug: "pro" } }))!.id)).rejects.toThrow("اشتراکی یافت نشد");
  });
});

describe("extendSubscription", () => {
  it("extends subscription by 30 days (1 month) from now if expired", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: {
        status: "expired",
        currentPeriodEnd: new Date(Date.now() - 1 * 86400000),
      },
    });

    const before = Date.now();
    const updated = await extendSubscription(data.venue.id);
    const after = Date.now();

    expect(updated.status).toBe("active");
    expect(updated.currentPeriodStart.getTime()).toBeGreaterThanOrEqual(before - 1000);
    // Should be ~30 days from now
    const minExpected = 29 * 86400000;
    const maxExpected = 31 * 86400000;
    const msExtended = updated.currentPeriodEnd.getTime() - updated.currentPeriodStart.getTime();
    expect(msExtended).toBeGreaterThan(minExpected);
    expect(msExtended).toBeLessThan(maxExpected);
  });

  it("extends from currentPeriodEnd when already active", async () => {
    const futureEnd = new Date(Date.now() + 10 * 86400000);
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active", currentPeriodEnd: futureEnd },
    });

    const updated = await extendSubscription(data.venue.id);

    expect(updated.currentPeriodStart.getTime()).toBe(futureEnd.getTime());
    const msExtended = updated.currentPeriodEnd.getTime() - updated.currentPeriodStart.getTime();
    expect(msExtended).toBeCloseTo(30 * 86400000, -2); // close to 30 days
  });

  it("throws for venue without subscription", async () => {
    await expect(extendSubscription("nonexistent")).rejects.toThrow("اشتراکی یافت نشد");
  });
});

describe("expireSubscription", () => {
  it("sets subscription status to expired", async () => {
    await expireSubscription(data.venue.id);

    const sub = await prisma.subscription.findUnique({ where: { venueId: data.venue.id } });
    expect(sub!.status).toBe("expired");

    // Restore
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });
});
