"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PlanData {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  description: string | null;
  priceToman: number;
  maxMenuItems: number;
  maxTables: number;
  customDomain: boolean;
  orderingEnabled: boolean;
}

interface Props {
  venueId: string;
  plan: PlanData;
  subscriptionStatus: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

export function PayClient({ venueId, plan, subscriptionStatus }: Props) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    description: string | null;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const baseAmount = plan.priceToman;
  const finalAmount = baseAmount - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    setCouponError(null);
    setAppliedCoupon(null);
    setDiscountAmount(0);

    try {
      const res = await fetch("/api/billing/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "خطا در اعمال کد تخفیف");
        return;
      }
      setAppliedCoupon(data.coupon);
      setDiscountAmount(data.discountAmount);
    } catch {
      setCouponError("خطا در ارتباط با سرور");
    } finally {
      setApplying(false);
    }
  };

  const handlePay = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/billing/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, planId: plan.id, couponId: appliedCoupon?.id ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error || "خطا در ایجاد پرداخت");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setPayError("خطا در ارتباط با سرور");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => router.push(`/admin/${venueId}/billing`)}
        className="text-sm text-ink-muted hover:text-ink transition-colors"
      >
        ← بازگشت به صفحه اشتراک
      </button>

      <Panel title="صورتحساب">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">{plan.nameFa}</span>
            <span className="text-sm text-ink-muted">{formatCurrency(plan.priceToman)}</span>
          </div>

          <div className="border-t border-line pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">مبلغ پایه</span>
              <span>{formatCurrency(baseAmount)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>تخفیف</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between font-medium text-ink border-t border-line pt-2">
              <span>مبلغ قابل پرداخت</span>
              <span>{formatCurrency(finalAmount)}</span>
            </div>
          </div>

          <div className="text-xs text-ink-muted">
            <p>دوره: یک ماهه</p>
            {subscriptionStatus === "trial" && (
              <p className="mt-1">پس از پرداخت، اشتراک شما از امروز به مدت ۳۰ روز فعال می‌شود.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="کد تخفیف">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label=""
                placeholder="کد تخفیف را وارد کنید"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                error={couponError ?? undefined}
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleApplyCoupon}
              disabled={applying || !couponCode.trim()}
              className="self-start mt-0.5"
            >
              {applying ? "..." : "اعمال"}
            </Button>
          </div>

          {appliedCoupon && (
            <div className="rounded-[var(--radius-control)] bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              کد تخفیف <span className="font-bold" dir="ltr">{appliedCoupon.code}</span> اعمال شد.
              {appliedCoupon.description && <span> {appliedCoupon.description}</span>}
            </div>
          )}
        </div>
      </Panel>

      {payError && (
        <div className="rounded-[var(--radius-control)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {payError}
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handlePay}
        disabled={paying}
      >
        {paying
          ? "در حال انتقال به درگاه..."
          : `پرداخت ${formatCurrency(finalAmount)}`}
      </Button>
    </div>
  );
}
