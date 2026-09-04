import { describe, expect, it } from "vitest";
import {
  formatSubscriptionStatus,
  isSubscriptionPlan,
  SUBSCRIPTION_PLANS,
  TRIAL_DAYS,
} from "@/lib/subscription";

describe("subscription helpers", () => {
  it("exposes provider-neutral monthly and yearly plans", () => {
    expect(Object.keys(SUBSCRIPTION_PLANS)).toEqual(["monthly", "yearly"]);
    expect(SUBSCRIPTION_PLANS.monthly.amountToman).toBeGreaterThan(0);
    expect(SUBSCRIPTION_PLANS.yearly.durationDays).toBe(365);
  });

  it("validates supported plans", () => {
    expect(isSubscriptionPlan("monthly")).toBe(true);
    expect(isSubscriptionPlan("yearly")).toBe(true);
    expect(isSubscriptionPlan("weekly")).toBe(false);
    expect(TRIAL_DAYS).toBe(14);
  });

  it("formats subscription statuses for the account UI", () => {
    expect(formatSubscriptionStatus("trialing")).toBe("دوره آزمایشی");
    expect(formatSubscriptionStatus("active")).toBe("فعال");
    expect(formatSubscriptionStatus("expired")).toBe("منقضی شده");
  });
});
