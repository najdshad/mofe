"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

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

interface SubscriptionData {
  id: string;
  status: string;
  plan: PlanData;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
}

interface UsageData {
  itemCount: number;
  tableCount: number;
}

interface InvoiceData {
  id: string;
  amountToman: number;
  status: string;
  refId: string | null;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  description: string | null;
  createdAt: string;
}

interface Props {
  venueId: string;
  plans: PlanData[];
  subscription: SubscriptionData | null;
  usage: UsageData;
  invoices: InvoiceData[];
}

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  past_due: "bg-orange-100 text-orange-800",
  canceled: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  trial: "دوره آزمایشی",
  active: "فعال",
  past_due: "سررسید شده",
  canceled: "لغو شده",
  expired: "منقضی شده",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
  failed: "ناموفق",
  refunded: "بازگشت وجه",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function daysRemaining(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function BillingClient({
  venueId,
  plans,
  subscription,
  usage,
  invoices,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paying, setPaying] = useState(false);
  const paymentParam = searchParams.get("payment");
  const [paymentError, setPaymentError] = useState<string | null>(
    paymentParam === "failed" ? "پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید." : null
  );
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    paymentParam === "success" ? "پرداخت با موفقیت انجام شد. اشتراک شما تمدید شد." : null
  );

  const handlePay = useCallback(async () => {
    setPaying(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/billing/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || "خطا در ایجاد پرداخت");
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setPaymentError("خطا در ارتباط با سرور");
    } finally {
      setPaying(false);
    }
  }, [venueId]);

  const handleChangePlan = useCallback(
    async (planId: string) => {
      setChangingPlan(planId);
      setPlanError(null);
      try {
        const res = await fetch("/api/billing/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId, planId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPlanError(data.error || "خطا در تغییر طرح");
          return;
        }

        if (data.immediate && data.proratedAmount && data.proratedAmount > 0) {
          const payRes = await fetch("/api/billing/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ venueId }),
          });
          const payData = await payRes.json();
          if (payRes.ok && payData.redirectUrl) {
            window.location.href = payData.redirectUrl;
            return;
          }
          setPlanError(payData.error || "خطا در ایجاد پرداخت");
        } else {
          setSuccessMsg("طرح شما با موفقیت تغییر کرد و در دوره بعدی اعمال خواهد شد.");
        }
        router.refresh();
      } catch {
        setPlanError("خطا در ارتباط با سرور");
      } finally {
        setChangingPlan(null);
      }
    },
    [venueId, router]
  );

  const plan = subscription?.plan;
  const isOnTrial = subscription?.status === "trial";
  const trialDaysLeft = subscription?.trialEndsAt ? daysRemaining(subscription.trialEndsAt) : 0;
  const periodEndDays = subscription?.currentPeriodEnd ? daysRemaining(subscription.currentPeriodEnd.toString()) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      {successMsg && (
        <div className="rounded-[var(--radius-control)] border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {paymentError && (
        <div className="rounded-[var(--radius-control)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {paymentError}
        </div>
      )}

      {planError && (
        <div className="rounded-[var(--radius-control)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {planError}
        </div>
      )}

      <Panel title="وضعیت اشتراک">
        {subscription ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-ink">{plan?.nameFa}</span>
                <span className="text-xs text-ink-muted mr-2">
                  {plan ? formatCurrency(plan.priceToman) : ""}
                  {plan && plan.priceToman > 0 ? " / ماهانه" : ""}
                </span>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none tracking-wide ${STATUS_STYLES[subscription.status] || ""}`}
              >
                {STATUS_LABELS[subscription.status] || subscription.status}
              </span>
            </div>

            {isOnTrial && (
              <p className="text-sm text-ink-muted">
                {trialDaysLeft > 0
                  ? `${trialDaysLeft} روز از دوره آزمایشی شما باقی مانده است.`
                  : "دوره آزمایشی شما به پایان رسیده است."}
              </p>
            )}

            {subscription.status === "active" && (
              <p className="text-sm text-ink-muted">
                {periodEndDays > 0
                  ? `${periodEndDays} روز تا پایان دوره جاری.`
                  : "دوره جاری در حال اتمام است."}
              </p>
            )}

            {subscription.status === "expired" && (
              <p className="text-sm text-red-600 font-medium">
                اشتراک شما منقضی شده است. برای ادامه استفاده، لطفاً یکی از طرح‌های زیر را انتخاب کنید و پرداخت را انجام دهید.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">هنوز اشتراکی فعال نشده است.</p>
        )}
      </Panel>

      <Panel title="میزان استفاده">
        {subscription ? (
          <div className="space-y-3">
            <UsageRow
              label="آیتم‌های منو"
              current={usage.itemCount}
              max={plan?.maxMenuItems ?? 10}
            />
            <UsageRow
              label="میزها"
              current={usage.tableCount}
              max={plan?.maxTables ?? 3}
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">دامنه اختصاصی</span>
              <span className={plan?.customDomain ? "text-green-600" : "text-ink-muted"}>
                {plan?.customDomain ? "✅ فعال" : "❌ غیرفعال"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">مدیریت سفارش میز</span>
              <span className={plan?.orderingEnabled ? "text-green-600" : "text-ink-muted"}>
                {plan?.orderingEnabled ? "✅ فعال" : "❌ غیرفعال"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">برای مشاهده میزان استفاده، اشتراک خود را فعال کنید.</p>
        )}
      </Panel>

      {!subscription || subscription.status === "expired" || isOnTrial ? (
        <Panel title="انتخاب طرح">
          <p className="text-sm text-ink-muted mb-4">
            {isOnTrial
              ? "دوره آزمایشی شما رو به پایان است. یکی از طرح‌های زیر را انتخاب کنید:"
              : "طرح مناسب خود را انتخاب کنید:"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={plan?.id === p.id}
                isChanging={changingPlan === p.id}
                onSelect={handleChangePlan}
              />
            ))}
          </div>
        </Panel>
      ) : null}

      {subscription && (subscription.status === "active" || subscription.status === "past_due") && (
        <Panel title="تمدید اشتراک">
          <p className="text-sm text-ink-muted mb-3">
            برای تمدید اشتراک خود برای یک ماه دیگر، روی دکمه زیر کلیک کنید.
          </p>
          <Button onClick={handlePay} disabled={paying}>
            {paying ? "در حال انتقال به درگاه..." : `پرداخت ${plan ? formatCurrency(plan.priceToman) : ""}`}
          </Button>
        </Panel>
      )}

      <Panel title="تاریخچه پرداخت‌ها">
        {invoices.length === 0 ? (
          <p className="text-sm text-ink-muted">هیچ پرداختی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th className="py-2 pl-2 text-right">تاریخ</th>
                  <th className="py-2 pl-2 text-right">مبلغ</th>
                  <th className="py-2 pl-2 text-right">وضعیت</th>
                  <th className="py-2 pl-2 text-right">رسید</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-line">
                    <td className="py-2 pl-2">{formatDate(inv.createdAt)}</td>
                    <td className="py-2 pl-2">{formatCurrency(inv.amountToman)}</td>
                    <td className="py-2 pl-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : inv.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="py-2 pl-2 font-mono text-xs text-ink-muted" dir="ltr">
                      {inv.refId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function UsageRow({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, (current / max) * 100);
  const isNearLimit = !unlimited && pct >= 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span
          className={
            isNearLimit ? "text-orange-600 font-medium" : "text-ink"
          }
        >
          {unlimited
            ? `${current} / نامحدود`
            : `${current} / ${max.toLocaleString("fa-IR")}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-line overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? "bg-orange-400" : "bg-ink-muted"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isChanging,
  onSelect,
}: {
  plan: PlanData;
  isCurrent: boolean;
  isChanging: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border p-4 transition-all ${
        isCurrent
          ? "border-ink bg-paper"
          : "border-line bg-surface hover:border-ink/50"
      }`}
    >
      <h3 className="font-serif text-lg text-ink-strong">{plan.nameFa}</h3>
      <p className="mt-1 text-sm text-ink-muted">{plan.description}</p>
      <p className="mt-2 text-xl font-serif text-ink-strong">
        {formatCurrency(plan.priceToman)}
        <span className="text-sm text-ink-muted">/ماه</span>
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
        <FeatureRow enabled={true} label={plan.maxMenuItems === -1 ? "آیتم‌های منو: نامحدود" : `حداکثر ${plan.maxMenuItems.toLocaleString("fa-IR")} آیتم منو`} />
        <FeatureRow enabled={true} label={plan.maxTables === -1 ? "میزها: نامحدود" : `حداکثر ${plan.maxTables.toLocaleString("fa-IR")} میز`} />
        <FeatureRow enabled={plan.customDomain} label="دامنه اختصاصی" />
        <FeatureRow enabled={plan.orderingEnabled} label="مدیریت سفارش میز" />
      </ul>
      {isCurrent ? (
        <p className="mt-3 text-xs text-green-600 font-medium">طرح فعلی شما</p>
      ) : (
        <Button
          className="mt-3 w-full"
          variant="secondary"
          disabled={isChanging}
          onClick={() => onSelect(plan.id)}
        >
          {isChanging ? "..." : "انتخاب این طرح"}
        </Button>
      )}
    </div>
  );
}

function FeatureRow({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={enabled ? "text-green-600" : "text-ink-muted/40"}>
        {enabled ? "✓" : "✗"}
      </span>
      <span className={enabled ? "text-ink" : "text-ink-muted/40"}>{label}</span>
    </li>
  );
}
