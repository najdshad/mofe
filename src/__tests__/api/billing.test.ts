import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { cleanTestData, seedTestData, seedTestPlans, seedTestSubscription } from "../helpers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/api-helpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-helpers")>("@/lib/api-helpers");
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

vi.mock("@/lib/permissions", () => ({
  requireVenueAccess: vi.fn(),
}));

import { requireAuth } from "@/lib/api-helpers";
import { requireVenueAccess } from "@/lib/permissions";
import { ApiError } from "@/lib/api-helpers";

// Coupons validate
import { POST as validateCoupon } from "@/app/api/billing/coupons/validate/route";

// Payments
import { POST as createPayment } from "@/app/api/billing/payments/route";

// Callback
import { GET as callbackPayment } from "@/app/api/billing/callback/route";

// Subscription
import { GET as getSubscription } from "@/app/api/billing/subscription/route";
import { POST as changeSubscription } from "@/app/api/billing/subscription/route";

// Plans
import { GET as getPlans } from "@/app/api/billing/plans/route";

// Invoices
import { GET as getInvoices } from "@/app/api/billing/invoices/route";

let data: Awaited<ReturnType<typeof seedTestData>>;

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockRequireVenueAccess = requireVenueAccess as ReturnType<typeof vi.fn>;

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/billing/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(url: string): Request {
  return new Request(url);
}

beforeAll(async () => {
  await cleanTestData();
  data = await seedTestData();
});

beforeEach(() => {
  mockRequireAuth.mockReset();
  mockRequireVenueAccess.mockReset();
  mockRequireAuth.mockResolvedValue(data.user);
  mockRequireVenueAccess.mockImplementation(async (_userId: string, venueId: string) => {
    if (venueId === data.venue.id) return { role: "owner" as const, userId: data.user.id, venueId: data.venue.id };
    throw new ApiError("Unauthorized: no access to this venue", 401);
  });
});

afterEach(async () => {
  // Clean up any test-created invoices and coupons between tests
  await prisma.invoice.deleteMany({ where: { subscription: { venueId: data.venue.id } } });
  await prisma.coupon.deleteMany({ where: { code: { startsWith: "TEST_" } } });
});

// ──────────────────────────────────────────────
// Plans API
// ──────────────────────────────────────────────
describe("GET /api/billing/plans", () => {
  it("returns purchasable plans ordered by sortOrder", async () => {
    const res = await getPlans();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.plans).toBeInstanceOf(Array);
    expect(body.plans.length).toBeGreaterThanOrEqual(2);

    const slugs = body.plans.map((p: { slug: string }) => p.slug);
    expect(slugs).not.toContain("basic"); // basic is not purchasable
    expect(slugs).toContain("pro");
    expect(slugs).toContain("premium");

    // Ordered by sortOrder
    const proIdx = slugs.indexOf("pro");
    const premiumIdx = slugs.indexOf("premium");
    expect(proIdx).toBeLessThan(premiumIdx);
  });

  it("returns plan with correct field types", async () => {
    const res = await getPlans();
    const body = await res.json();

    for (const plan of body.plans) {
      expect(plan).toMatchObject({
        id: expect.any(String),
        slug: expect.any(String),
        nameFa: expect.any(String),
        nameEn: expect.any(String),
        priceToman: expect.any(Number),
        maxMenuItems: expect.any(Number),
        maxTables: expect.any(Number),
        customDomain: expect.any(Boolean),
        orderingEnabled: expect.any(Boolean),
      });
    }
  });
});

// ──────────────────────────────────────────────
// Coupons Validate API
// ──────────────────────────────────────────────
describe("POST /api/billing/coupons/validate", () => {
  let testCouponId: string;

  beforeEach(async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: "TEST_SAVE20",
        description: "۲۰٪ تخفیف آزمایشی",
        discountType: "percentage",
        discountValue: 20,
        maxUses: 10,
        isActive: true,
      },
    });
    testCouponId = coupon.id;
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when code is missing", async () => {
    const res = await validateCoupon(jsonReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("کد تخفیف وارد کنید");
  });

  it("returns 404 when coupon not found", async () => {
    const res = await validateCoupon(jsonReq({ code: "NONEXISTENT" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("کد تخفیف نامعتبر است");
  });

  it("returns 400 when coupon is inactive", async () => {
    await prisma.coupon.update({ where: { id: testCouponId }, data: { isActive: false } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("این کد تخفیف غیرفعال است");

    await prisma.coupon.update({ where: { id: testCouponId }, data: { isActive: true } });
  });

  it("returns 400 when coupon is expired", async () => {
    await prisma.coupon.update({ where: { id: testCouponId }, data: { expiresAt: new Date("2020-01-01") } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("این کد تخفیف منقضی شده است");

    await prisma.coupon.update({ where: { id: testCouponId }, data: { expiresAt: null } });
  });

  it("returns 400 when coupon has reached max uses", async () => {
    await prisma.coupon.update({ where: { id: testCouponId }, data: { usedCount: 10, maxUses: 10 } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("این کد تخفیف به حداکثر استفاده رسیده است");

    await prisma.coupon.update({ where: { id: testCouponId }, data: { usedCount: 0, maxUses: 10 } });
  });

  it("allows coupon with maxUses -1 (unlimited) even after many uses", async () => {
    await prisma.coupon.update({ where: { id: testCouponId }, data: { maxUses: -1, usedCount: 999 } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);

    await prisma.coupon.update({ where: { id: testCouponId }, data: { maxUses: 10, usedCount: 0 } });
  });

  it("returns 400 when coupon does not apply to selected plan", async () => {
    await prisma.coupon.update({ where: { id: testCouponId }, data: { appliesToPlanSlug: "premium" } });

    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: proPlan!.id }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("این کد تخفیف برای این طرح قابل استفاده نیست");

    await prisma.coupon.update({ where: { id: testCouponId }, data: { appliesToPlanSlug: null } });
  });

  it("returns 400 when plan price is below minPlanPrice", async () => {
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.coupon.update({ where: { id: testCouponId }, data: { minPlanPrice: 5000000 } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: premiumPlan!.id }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("این کد تخفیف برای طرح‌های با قیمت بالاتر قابل استفاده است");

    await prisma.coupon.update({ where: { id: testCouponId }, data: { minPlanPrice: null } });
  });

  it("returns valid with correct discount for percentage coupon", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: proPlan!.id }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.valid).toBe(true);
    expect(body.coupon.code).toBe("TEST_SAVE20");
    expect(body.coupon.discountType).toBe("percentage");
    expect(body.coupon.discountValue).toBe(20);
    expect(body.discountAmount).toBe(300000); // 20% of 1,500,000
    expect(body.finalAmount).toBe(1200000);
  });

  it("calculates discount for fixed coupon", async () => {
    await prisma.coupon.update({
      where: { id: testCouponId },
      data: { discountType: "fixed", discountValue: 100000 },
    });

    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: proPlan!.id }));
    const body = await res.json();

    expect(body.valid).toBe(true);
    expect(body.discountAmount).toBe(100000);
    expect(body.finalAmount).toBe(1400000);

    await prisma.coupon.update({
      where: { id: testCouponId },
      data: { discountType: "percentage", discountValue: 20 },
    });
  });

  it("caps fixed discount at plan price (no negative final amount)", async () => {
    await prisma.coupon.update({
      where: { id: testCouponId },
      data: { discountType: "fixed", discountValue: 99999999 },
    });

    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: proPlan!.id }));
    const body = await res.json();

    expect(body.discountAmount).toBe(1500000); // capped at plan price
    expect(body.finalAmount).toBe(0);

    await prisma.coupon.update({
      where: { id: testCouponId },
      data: { discountType: "percentage", discountValue: 20 },
    });
  });

  it("returns valid even without planId", async () => {
    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it("trims and uppercases coupon code", async () => {
    const res = await validateCoupon(jsonReq({ code: "  test_save20  " }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
  });

  it("returns valid for coupon with appliesToPlanSlug matching the plan", async () => {
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.coupon.update({
      where: { id: testCouponId },
      data: { appliesToPlanSlug: "premium" },
    });

    const res = await validateCoupon(jsonReq({ code: "TEST_SAVE20", planId: premiumPlan!.id }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);

    await prisma.coupon.update({ where: { id: testCouponId }, data: { appliesToPlanSlug: null } });
  });
});

// ──────────────────────────────────────────────
// Subscription GET API
// ──────────────────────────────────────────────
describe("GET /api/billing/subscription", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));

    const res = await getSubscription(getReq("http://localhost/api/billing/subscription?venueId=test"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when venueId is missing", async () => {
    const res = await getSubscription(getReq("http://localhost/api/billing/subscription"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("venueId required");
  });

  it("returns subscription and usage data for active subscription", async () => {
    const res = await getSubscription(
      getReq(`http://localhost/api/billing/subscription?venueId=${data.venue.id}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscription).not.toBeNull();
    expect(body.subscription.status).toBe("active");
    expect(body.subscription.plan.slug).toBe("premium");
    expect(body.subscription.plan.maxMenuItems).toBe(-1);
    expect(body.subscription.plan.maxTables).toBe(-1);
    expect(body.usage).toMatchObject({
      itemCount: expect.any(Number),
      tableCount: expect.any(Number),
    });
  });

  it("returns null subscription when no subscription exists", async () => {
    const isolatedUser = await prisma.user.create({
      data: { email: `isolated-${Date.now()}@test.ir`, name: "Isolated", passwordHash: "", status: "active" },
    });
    const isolatedVenue = await prisma.venue.create({
      data: { nameFa: "بدون اشتراک", slug: `no-sub-venue-${Date.now()}` },
    });
    await prisma.venueMember.create({
      data: { venueId: isolatedVenue.id, userId: isolatedUser.id, role: "owner" },
    });
    mockRequireAuth.mockResolvedValue(isolatedUser);
    mockRequireVenueAccess.mockImplementation(async () => ({ role: "owner" as const, userId: isolatedUser.id, venueId: isolatedVenue.id }));

    const res = await getSubscription(
      getReq(`http://localhost/api/billing/subscription?venueId=${isolatedVenue.id}`)
    );
    const body = await res.json();

    expect(body.subscription).toBeNull();
    expect(body.usage).toBeNull();

    await prisma.venueMember.deleteMany({ where: { venueId: isolatedVenue.id } });
    await prisma.venue.delete({ where: { id: isolatedVenue.id } });
    await prisma.user.delete({ where: { id: isolatedUser.id } });
  });

  it("calls requireAuth and requireVenueAccess", async () => {
    await getSubscription(
      getReq(`http://localhost/api/billing/subscription?venueId=${data.venue.id}`)
    );

    expect(mockRequireAuth).toHaveBeenCalledOnce();
    expect(mockRequireVenueAccess).toHaveBeenCalledOnce();
    expect(mockRequireVenueAccess).toHaveBeenCalledWith(data.user.id, data.venue.id);
  });
});

// ──────────────────────────────────────────────
// Subscription POST (plan change) API
// ──────────────────────────────────────────────
describe("POST /api/billing/subscription", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await changeSubscription(jsonReq({ venueId: data.venue.id, planId: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when venueId or planId missing", async () => {
    let res = await changeSubscription(jsonReq({ planId: "x" }));
    expect(res.status).toBe(400);
    let body = await res.json();
    expect(body.error).toBe("venueId and planId required");

    res = await changeSubscription(jsonReq({ venueId: data.venue.id }));
    expect(res.status).toBe(400);
    body = await res.json();
    expect(body.error).toBe("venueId and planId required");
  });

  it("returns 400 when plan not found", async () => {
    const res = await changeSubscription(jsonReq({ venueId: data.venue.id, planId: "nonexistent" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("طرح نامعتبر است");
  });

  it("returns 400 when changing to same plan", async () => {
    const current = await prisma.subscription.findUnique({ where: { venueId: data.venue.id }, include: { plan: true } });

    const res = await changeSubscription(jsonReq({ venueId: data.venue.id, planId: current!.planId }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("طرح فعلی شما همین است");
  });

  it("upgrades plan with immediate payment (prorated)", async () => {
    // Set current subscription to "pro" first then upgrade to premium
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: proPlan!.id, status: "active" },
    });

    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    const res = await changeSubscription(
      jsonReq({ venueId: data.venue.id, planId: premiumPlan!.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.immediate).toBe(true);
    expect(typeof body.proratedAmount).toBe("number");
    expect(body.proratedAmount).toBeGreaterThan(0);
    expect(body.subscription.plan.slug).toBe("premium");
  });

  it("downgrades plan without immediate payment", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });

    const res = await changeSubscription(
      jsonReq({ venueId: data.venue.id, planId: proPlan!.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.immediate).toBe(false);
    expect(body.proratedAmount).toBeUndefined();
    expect(body.subscription.plan.slug).toBe("pro");
  });

  it("requires immediate full payment from expired subscription", async () => {
    // Current plan is "pro" (from previous downgrade test) — expire it, then upgrade to premium
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "expired" },
    });

    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    const res = await changeSubscription(
      jsonReq({ venueId: data.venue.id, planId: premiumPlan!.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.immediate).toBe(true);
    expect(body.proratedAmount).toBe(premiumPlan!.priceToman);
    expect(body.subscription.status).toBe("trial");

    // Restore active subscription
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });

  it("handles upgrade from basic (free) to paid", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: basicPlan!.id, status: "trial" },
    });

    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });
    const res = await changeSubscription(
      jsonReq({ venueId: data.venue.id, planId: proPlan!.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.immediate).toBe(true);
    expect(body.proratedAmount).toBe(proPlan!.priceToman);

    // Restore
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: (await prisma.plan.findUnique({ where: { slug: "premium" } }))!.id, status: "active" },
    });
  });
});

// ──────────────────────────────────────────────
// Payments API
// ──────────────────────────────────────────────
describe("POST /api/billing/payments", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await createPayment(jsonReq({ venueId: data.venue.id }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when venueId is missing", async () => {
    const res = await createPayment(jsonReq({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("venueId required");
  });

  it("returns 404 when no subscription exists", async () => {
    const venueNoSub = await prisma.venue.create({
      data: { nameFa: "بدون اشتراک", slug: `no-sub-${Date.now()}` },
    });
    mockRequireVenueAccess.mockImplementation(async () => ({ role: "owner" as const, userId: data.user.id, venueId: venueNoSub.id }));

    const res = await createPayment(jsonReq({ venueId: venueNoSub.id }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("اشتراکی یافت نشد");

    await prisma.venue.delete({ where: { id: venueNoSub.id } });
  });

  it("returns 400 when plan is not purchasable", async () => {
    const basicPlan = await prisma.plan.findUnique({ where: { slug: "basic" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: basicPlan!.id },
    });

    const res = await createPayment(jsonReq({ venueId: data.venue.id }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("طرح پایه قابل تمدید نیست");

    // Restore
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: premiumPlan!.id, status: "active" },
    });
  });

  it("calls changePlan when planId is provided", async () => {
    const proPlan = await prisma.plan.findUnique({ where: { slug: "pro" } });

    const res = await createPayment(
      jsonReq({ venueId: data.venue.id, planId: proPlan!.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.authority).toBeTruthy();

    const sub = await prisma.subscription.findUnique({
      where: { venueId: data.venue.id },
      include: { plan: true },
    });
    expect(sub!.plan.slug).toBe("pro");

    // Restore
    const premiumPlan = await prisma.plan.findUnique({ where: { slug: "premium" } });
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { planId: premiumPlan!.id, status: "active" },
    });
  });

  it("creates invoice with correct amounts and returns redirect URL", async () => {
    const beforeCount = await prisma.invoice.count({ where: { subscription: { venueId: data.venue.id } } });

    const res = await createPayment(jsonReq({ venueId: data.venue.id }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.invoiceId).toBeTruthy();
    expect(body.authority).toBeTruthy();
    expect(body.redirectUrl).toContain("/api/billing/callback");

    const afterCount = await prisma.invoice.count({ where: { subscription: { venueId: data.venue.id } } });
    expect(afterCount).toBe(beforeCount + 1);

    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    expect(invoice).not.toBeNull();
    expect(invoice!.amountToman).toBeGreaterThan(0);
    expect(invoice!.status).toBe("pending");
    expect(invoice!.authority).toBe(body.authority);
    expect(invoice!.baseAmount).toBe(invoice!.amountToman);
    expect(invoice!.discountAmount).toBeNull();
    expect(invoice!.couponId).toBeNull();
  });

  it("applies percentage coupon discount correctly", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: "TEST_PAYPCT", discountType: "percentage", discountValue: 10, maxUses: 5, isActive: true },
    });

    const res = await createPayment(
      jsonReq({ venueId: data.venue.id, couponId: coupon.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    const premiumPrice = (await prisma.plan.findUnique({ where: { slug: "premium" } }))!.priceToman;
    expect(invoice!.baseAmount).toBe(premiumPrice);
    expect(invoice!.discountAmount).toBe(Math.round(premiumPrice * 0.1));
    expect(invoice!.amountToman).toBe(premiumPrice - Math.round(premiumPrice * 0.1));
    expect(invoice!.couponId).toBe(coupon.id);
    expect(invoice!.couponCode).toBe("TEST_PAYPCT");

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("applies fixed coupon discount correctly", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: "TEST_PAYFIX", discountType: "fixed", discountValue: 500000, maxUses: 5, isActive: true },
    });

    const res = await createPayment(
      jsonReq({ venueId: data.venue.id, couponId: coupon.id })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });
    const premiumPrice = (await prisma.plan.findUnique({ where: { slug: "premium" } }))!.priceToman;
    expect(invoice!.baseAmount).toBe(premiumPrice);
    expect(invoice!.discountAmount).toBe(500000);
    expect(invoice!.amountToman).toBe(premiumPrice - 500000);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("increments coupon usage after payment request", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: "TEST_USAGE", discountType: "fixed", discountValue: 10000, maxUses: 5, isActive: true },
    });

    expect(coupon.usedCount).toBe(0);

    await createPayment(jsonReq({ venueId: data.venue.id, couponId: coupon.id }));

    const updated = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    expect(updated!.usedCount).toBe(1);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("does NOT increment coupon usage when maxUses is -1 (unlimited)", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: "TEST_UNLIM", discountType: "fixed", discountValue: 10000, maxUses: -1, isActive: true },
    });

    await createPayment(jsonReq({ venueId: data.venue.id, couponId: coupon.id }));

    const updated = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    expect(updated!.usedCount).toBe(0);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("creates invoice with correct periodEnd for active subscription (extends from end)", async () => {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { currentPeriodEnd: periodEnd, status: "active" },
    });

    const res = await createPayment(jsonReq({ venueId: data.venue.id }));
    const body = await res.json();
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });

    // Period should start from currentPeriodEnd (extend)
    expect(invoice!.periodStart.getTime()).toBe(periodEnd.getTime());
    expect(invoice!.periodEnd.getTime()).toBe(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
  });

  it("creates invoice with period starting from now for trial/expired", async () => {
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "trial" },
    });

    const before = Date.now();
    const res = await createPayment(jsonReq({ venueId: data.venue.id }));
    const body = await res.json();
    const invoice = await prisma.invoice.findUnique({ where: { id: body.invoiceId } });

    expect(invoice!.periodStart.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(invoice!.periodEnd.getTime()).toBe(invoice!.periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Restore
    await prisma.subscription.update({
      where: { venueId: data.venue.id },
      data: { status: "active" },
    });
  });
});

// ──────────────────────────────────────────────
// Invoices API
// ──────────────────────────────────────────────
describe("GET /api/billing/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockRequireAuth.mockRejectedValue(new ApiError("Unauthorized", 401));
    const res = await getInvoices(getReq("http://localhost/api/billing/invoices?venueId=x"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when venueId is missing", async () => {
    const res = await getInvoices(getReq("http://localhost/api/billing/invoices"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("venueId required");
  });

  it("returns empty array when no subscription exists", async () => {
    const venueNoSub = await prisma.venue.create({
      data: { nameFa: "بدون فاکتور", slug: `no-inv-venue-${Date.now()}` },
    });
    mockRequireVenueAccess.mockImplementation(async () => ({ role: "owner" as const, userId: data.user.id, venueId: venueNoSub.id }));

    const res = await getInvoices(getReq(`http://localhost/api/billing/invoices?venueId=${venueNoSub.id}`));
    const body = await res.json();
    expect(body.invoices).toEqual([]);

    await prisma.venue.delete({ where: { id: venueNoSub.id } });
  });

  it("returns invoices ordered by createdAt desc", async () => {
    // Create a couple of invoices
    const sub = await prisma.subscription.findUnique({ where: { venueId: data.venue.id } });
    const inv1 = await prisma.invoice.create({
      data: {
        subscriptionId: sub!.id,
        amountToman: 100000,
        status: "paid",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(Date.now() - 2000),
      },
    });
    const inv2 = await prisma.invoice.create({
      data: {
        subscriptionId: sub!.id,
        amountToman: 200000,
        status: "pending",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
        createdAt: new Date(Date.now() - 1000),
      },
    });

    const res = await getInvoices(getReq(`http://localhost/api/billing/invoices?venueId=${data.venue.id}`));
    const body = await res.json();

    expect(body.invoices).toHaveLength(2);
    expect(body.invoices[0].id).toBe(inv2.id); // newest first
    expect(body.invoices[1].id).toBe(inv1.id);
    expect(body.invoices[0].amountToman).toBe(200000);
    expect(body.invoices[0].status).toBe("pending");
    expect(body.invoices[1].status).toBe("paid");
  });

  it("returns correct field types for invoices", async () => {
    const res = await getInvoices(getReq(`http://localhost/api/billing/invoices?venueId=${data.venue.id}`));
    const body = await res.json();

    for (const inv of body.invoices) {
      expect(inv).toMatchObject({
        id: expect.any(String),
        amountToman: expect.any(Number),
        status: expect.any(String),
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
        createdAt: expect.any(String),
      });
    }
  });
});

// ──────────────────────────────────────────────
// Callback API
// ──────────────────────────────────────────────
describe("GET /api/billing/callback", () => {
  it("redirects to failed when Authority is missing", async () => {
    const res = await callbackPayment(getReq("http://localhost/api/billing/callback?Status=OK"));
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("payment=failed");
  });

  it("redirects to failed when Status is not OK and not mock", async () => {
    const res = await callbackPayment(
      getReq("http://localhost/api/billing/callback?Authority=abc&Status=NOK")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("payment=failed");
  });

  it("redirects to invalid when invoice not found", async () => {
    const res = await callbackPayment(
      getReq("http://localhost/api/billing/callback?Authority=nonexistent&Status=OK&mock=1")
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("payment=invalid");
  });

  it("updates invoice to paid and extends subscription on mock success", async () => {
    const sub = await prisma.subscription.findUnique({ where: { venueId: data.venue.id } });
    const oldPeriodEnd = sub!.currentPeriodEnd;

    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId: sub!.id,
        amountToman: 1500000,
        status: "pending",
        authority: `callback_test_auth_${Date.now()}`,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    const res = await callbackPayment(
      getReq(`http://localhost/api/billing/callback?Authority=${invoice.authority}&Status=OK&mock=1`)
    );

    expect(res.status).toBe(307);
    const loc = res.headers.get("Location") || "";
    expect(loc).toContain("payment=success");

    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    expect(updatedInvoice!.status).toBe("paid");
    expect(updatedInvoice!.refId).toContain("dev_ref_");
    expect(updatedInvoice!.paidAt).not.toBeNull();

    // Subscription should have been extended
    const updatedSub = await prisma.subscription.findUnique({ where: { venueId: data.venue.id } });
    expect(updatedSub!.currentPeriodEnd.getTime()).toBeGreaterThan(oldPeriodEnd.getTime());
    expect(updatedSub!.status).toBe("active");
  });

  it("redirects to proper venue billing page on success", async () => {
    const sub = await prisma.subscription.findUnique({ where: { venueId: data.venue.id } });
    const invoice = await prisma.invoice.create({
      data: {
        subscriptionId: sub!.id,
        amountToman: 1500000,
        status: "pending",
        authority: `callback_redirect_${Date.now()}`,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    const res = await callbackPayment(
      getReq(`http://localhost/api/billing/callback?Authority=${invoice.authority}&Status=OK&mock=1`)
    );

    expect(res.status).toBe(307);
    const location = res.headers.get("Location") || "";
    expect(location).toContain(`/admin/${data.venue.id}/billing`);
    expect(location).toContain("payment=success");
  });

  it("redirects to generic login on error", async () => {
    // Pass no params to trigger the catch block via an error path
    const res = await callbackPayment(getReq("http://localhost/api/billing/callback"));
    expect(res.status).toBe(302);
    const location = res.headers.get("Location") || "";
    // Should be a redirect to failed
    expect(location).toContain("payment=failed");
  });
});
