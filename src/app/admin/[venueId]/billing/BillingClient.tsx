"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CircleAlert,
  CreditCard,
  FileText,
  Globe2,
  LayoutGrid,
  RefreshCw,
  Sparkles,
  Table2,
  X,
  type LucideIcon,
} from "lucide-react";
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

const STATUS_CONFIG: Record<
  string,
  { label: string; light: string; dark: string }
> = {
  trial: {
    label: "دوره آزمایشی",
    light: "border-blue-200 bg-blue-50 text-blue-700",
    dark: "border-blue-300/20 bg-blue-300/15 text-blue-100",
  },
  active: {
    label: "فعال",
    light: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dark: "border-emerald-300/20 bg-emerald-300/15 text-emerald-100",
  },
  past_due: {
    label: "نیازمند تمدید",
    light: "border-orange-200 bg-orange-50 text-orange-700",
    dark: "border-orange-300/20 bg-orange-300/15 text-orange-100",
  },
  canceled: {
    label: "لغو شده",
    light: "border-gray-200 bg-gray-50 text-gray-600",
    dark: "border-gray-300/20 bg-gray-300/15 text-gray-100",
  },
  expired: {
    label: "منقضی شده",
    light: "border-red-200 bg-red-50 text-red-700",
    dark: "border-red-300/20 bg-red-300/15 text-red-100",
  },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "در انتظار پرداخت",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  paid: {
    label: "پرداخت شده",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "ناموفق",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  refunded: {
    label: "بازگشت وجه",
    className: "border-gray-200 bg-gray-50 text-gray-600",
  },
};

function formatNumber(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

function formatCurrency(amount: number): string {
  return `${formatNumber(amount)} تومان`;
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

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      light: "border-line bg-surface text-ink-muted",
      dark: "border-paper/15 bg-paper/10 text-paper/80",
    }
  );
}

function getInvoiceStatusConfig(status: string) {
  return (
    INVOICE_STATUS_CONFIG[status] ?? {
      label: status,
      className: "border-line bg-surface text-ink-muted",
    }
  );
}

function formatLimit(limit: number, noun: string): string {
  return limit === -1 ? `${noun} نامحدود` : `${formatNumber(limit)} ${noun}`;
}

function StatusBadge({ status, dark = false }: { status: string; dark?: boolean }) {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
        dark ? config.dark : config.light
      }`}
    >
      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config = getInvoiceStatusConfig(status);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
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
          router.push(`/admin/${venueId}/billing/pay?planId=${planId}`);
        } else {
          setSuccessMsg("طرح شما با موفقیت تغییر کرد و در دوره بعدی اعمال خواهد شد.");
          router.refresh();
        }
      } catch {
        setPlanError("خطا در ارتباط با سرور");
      } finally {
        setChangingPlan(null);
      }
    },
    [venueId, router]
  );

  const scrollToPlans = useCallback(() => {
    document.getElementById("plans")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const plan = subscription?.plan;
  const isOnTrial = subscription?.status === "trial";
  const isExpired = subscription?.status === "expired";
  const canRenew = Boolean(
    subscription &&
      plan &&
      plan.priceToman > 0 &&
      ["active", "past_due", "canceled"].includes(subscription.status)
  );
  const trialDaysLeft = subscription?.trialEndsAt
    ? daysRemaining(subscription.trialEndsAt)
    : 0;
  const statusDetail = getStatusDetail(subscription, trialDaysLeft);
  const planSectionTitle =
    !subscription || isOnTrial || isExpired
      ? "یک طرح انتخاب کنید"
      : "طرح خود را مدیریت کنید";
  const planSectionSubtitle =
    !subscription || isOnTrial || isExpired
      ? "امکانات بیشتری برای منو و سفارش‌گیری در اختیارتان قرار می‌گیرد."
      : "هر زمان بخواهید می‌توانید طرح مناسب‌تری انتخاب کنید.";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-ink-muted">
            صورتحساب و اشتراک
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-strong sm:text-4xl">
            ساده، روشن، بدون دردسر
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-ink-muted">
            وضعیت اشتراک، مصرف و پرداخت‌های مجموعه‌تان را در یک نگاه ببینید.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-ink-muted sm:flex">
          <CreditCard className="h-4 w-4" strokeWidth={1.7} />
          پرداخت امن با زرین‌پال
        </div>
      </header>

      {(successMsg || paymentError || planError) && (
        <div className="space-y-2" aria-live="polite">
          {successMsg && (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-4 w-4" />
              </span>
              {successMsg}
            </div>
          )}
          {paymentError && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <CircleAlert className="h-5 w-5 shrink-0" />
              {paymentError}
            </div>
          )}
          {planError && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <CircleAlert className="h-5 w-5 shrink-0" />
              {planError}
            </div>
          )}
        </div>
      )}

      <section
        aria-labelledby="current-plan-title"
        className="relative overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-paper sm:px-7 sm:py-8"
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full border border-paper/10" />
        <div className="pointer-events-none absolute -left-4 -top-8 h-32 w-32 rounded-full bg-paper/5" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-[-3rem] h-48 w-48 rounded-full border-[22px] border-paper/5" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-paper/55">اشتراک فعلی</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2
                id="current-plan-title"
                className="font-serif text-4xl leading-none text-paper sm:text-5xl"
              >
                {plan?.nameFa ?? "بدون اشتراک"}
              </h2>
              {subscription && <StatusBadge status={subscription.status} dark />}
            </div>
            <p className="mt-4 max-w-lg text-sm leading-7 text-paper/70">
              {plan?.description ?? "برای شروع، یکی از طرح‌های مناسب مجموعه‌تان را انتخاب کنید."}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-paper/50">هزینه ماهانه</p>
                <p className="mt-1 font-serif text-2xl text-paper">
                  {plan && plan.priceToman > 0 ? (
                    <>
                      {formatNumber(plan.priceToman)}
                      <span className="mr-1 text-sm text-paper/60">تومان</span>
                    </>
                  ) : (
                    "رایگان"
                  )}
                </p>
              </div>
              <div className="h-10 w-px bg-paper/15" />
              <div>
                <p className="text-xs text-paper/50">
                  {subscription ? "وضعیت دوره" : "قدم بعدی"}
                </p>
                <p className="mt-1 text-sm text-paper/85">{statusDetail}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:min-w-[230px] lg:items-end">
            <div className="w-full rounded-2xl border border-paper/15 bg-paper/5 p-4 lg:text-right">
              <div className="flex items-center gap-2 text-xs text-paper/55">
                <CalendarDays className="h-4 w-4" strokeWidth={1.7} />
                پایان دوره جاری
              </div>
              <p className="mt-2 text-sm font-medium text-paper">
                {subscription ? formatDate(subscription.currentPeriodEnd) : "هنوز شروع نشده"}
              </p>
            </div>
            {canRenew ? (
              <Button
                onClick={handlePay}
                disabled={paying}
                className="w-full border-paper bg-paper text-ink hover:bg-paper/90 lg:w-auto"
                size="lg"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                {paying ? "در حال انتقال..." : "تمدید اشتراک"}
              </Button>
            ) : (
              <Button
                onClick={scrollToPlans}
                className="w-full border-paper bg-paper text-ink hover:bg-paper/90 lg:w-auto"
                size="lg"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                مشاهده طرح‌ها
              </Button>
            )}
            {canRenew && plans.length > 0 && (
              <button
                type="button"
                onClick={scrollToPlans}
                className="inline-flex items-center gap-1.5 text-xs text-paper/60 transition-colors hover:text-paper"
              >
                تغییر یا ارتقای طرح
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section
          aria-labelledby="usage-title"
          className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-ink-muted">مصرف فعلی</p>
              <h2 id="usage-title" className="mt-2 font-serif text-2xl text-ink-strong">
                همه‌چیز تحت کنترل است
              </h2>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-paper">
              <BarChart3 className="h-5 w-5" strokeWidth={1.7} />
            </div>
          </div>

          {subscription ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <UsageMeter
                  icon={LayoutGrid}
                  label="آیتم‌های منو"
                  current={usage.itemCount}
                  max={plan?.maxMenuItems ?? 10}
                />
                <UsageMeter
                  icon={Table2}
                  label="میزها"
                  current={usage.tableCount}
                  max={plan?.maxTables ?? 3}
                />
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-3 text-xs text-ink-muted">امکانات فعال این طرح</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FeatureItem
                    icon={Globe2}
                    enabled={plan?.customDomain ?? false}
                    label="دامنه اختصاصی"
                  />
                  <FeatureItem
                    icon={CreditCard}
                    enabled={plan?.orderingEnabled ?? false}
                    label="مدیریت سفارش میز"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-4 text-sm text-ink-muted">
              <Sparkles className="h-5 w-5 shrink-0 text-ink" strokeWidth={1.7} />
              بعد از فعال‌سازی اشتراک، میزان مصرف شما اینجا نمایش داده می‌شود.
            </div>
          )}
        </section>

        <section
          aria-labelledby="period-title"
          className="rounded-[var(--radius-panel)] border border-line bg-surface p-5 sm:p-6"
        >
          <p className="text-[11px] tracking-[0.18em] text-ink-muted">جزئیات دوره</p>
          <h2 id="period-title" className="mt-2 font-serif text-2xl text-ink-strong">
            تاریخ‌های مهم
          </h2>

          <div className="mt-6 space-y-4">
            <DetailRow
              icon={CalendarDays}
              label="شروع دوره"
              value={subscription ? formatDate(subscription.currentPeriodStart) : "—"}
            />
            <DetailRow
              icon={RefreshCw}
              label="تمدید بعدی"
              value={
                subscription && subscription.status !== "expired"
                  ? formatDate(subscription.currentPeriodEnd)
                  : "پس از انتخاب طرح"
              }
            />
            <DetailRow
              icon={CreditCard}
              label="پرداخت‌های ثبت‌شده"
              value={`${formatNumber(invoices.length)} مورد`}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-paper p-4">
            <p className="text-sm font-medium text-ink">نیاز به راهنمایی دارید؟</p>
            <p className="mt-1 text-xs leading-6 text-ink-muted">
              اگر درباره انتخاب طرح یا پرداخت سوالی دارید، با پشتیبانی mofé در تماس باشید.
            </p>
          </div>
        </section>
      </div>

      {plans.length > 0 && (
        <section id="plans" aria-labelledby="plans-title" className="scroll-mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-ink-muted">طرح‌ها</p>
              <h2 id="plans-title" className="mt-2 font-serif text-2xl text-ink-strong sm:text-3xl">
                {planSectionTitle}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">{planSectionSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <Check className="h-4 w-4 text-emerald-600" />
              پرداخت ماهانه، بدون تعهد بلندمدت
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {plans.map((availablePlan) => (
              <PlanCard
                key={availablePlan.id}
                plan={availablePlan}
                isCurrent={plan?.id === availablePlan.id}
                isChanging={changingPlan === availablePlan.id}
                onSelect={handleChangePlan}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="invoices-title" className="pt-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-ink-muted">سوابق</p>
            <h2 id="invoices-title" className="mt-2 font-serif text-2xl text-ink-strong">
              تاریخچه پرداخت
            </h2>
          </div>
          {invoices.length > 0 && (
            <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
              {formatNumber(invoices.length)} پرداخت
            </span>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="mt-5 flex items-center gap-4 rounded-[var(--radius-panel)] border border-dashed border-line bg-surface p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-paper">
              <FileText className="h-5 w-5 text-ink-muted" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">هنوز پرداختی ثبت نشده است</p>
              <p className="mt-1 text-xs text-ink-muted">
                رسیدهای پرداخت بعدی شما در این بخش ذخیره می‌شوند.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper sm:hidden">
              {invoices.map((invoice) => (
                <InvoiceMobileRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
            <div className="mt-5 hidden overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper sm:block">
              <table className="w-full text-sm">
                <caption className="sr-only">تاریخچه پرداخت‌های اشتراک</caption>
                <thead className="bg-surface text-xs text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 text-right font-normal">تاریخ</th>
                    <th className="px-5 py-3 text-right font-normal">شرح</th>
                    <th className="px-5 py-3 text-right font-normal">مبلغ</th>
                    <th className="px-5 py-3 text-right font-normal">وضعیت</th>
                    <th className="px-5 py-3 text-right font-normal">رسید</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-line transition-colors hover:bg-surface">
                      <td className="whitespace-nowrap px-5 py-4 text-ink-muted">
                        {formatDate(invoice.paidAt || invoice.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-ink">
                        {invoice.description || "پرداخت اشتراک ماهانه"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-ink">
                        {formatCurrency(invoice.amountToman)}
                      </td>
                      <td className="px-5 py-4">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted" dir="ltr">
                        {invoice.refId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function getStatusDetail(
  subscription: SubscriptionData | null,
  trialDaysLeft: number
): string {
  if (!subscription) return "یک طرح مناسب انتخاب کنید";
  if (subscription.status === "trial") {
    return trialDaysLeft > 0
      ? `${formatNumber(trialDaysLeft)} روز تا پایان دوره آزمایشی`
      : "دوره آزمایشی به پایان رسیده است";
  }
  if (subscription.status === "past_due") return "برای ادامه، اشتراک را تمدید کنید";
  if (subscription.status === "canceled") return "اشتراک شما لغو شده است";
  if (subscription.status === "expired") return "برای ادامه، یک طرح انتخاب کنید";
  return `تمدید در ${formatDate(subscription.currentPeriodEnd)}`;
}

function UsageMeter({
  icon: Icon,
  label,
  current,
  max,
}: {
  icon: LucideIcon;
  label: string;
  current: number;
  max: number;
}) {
  const unlimited = max === -1;
  const percentage = unlimited ? 0 : max <= 0 ? 100 : Math.min(100, (current / max) * 100);
  const isNearLimit = !unlimited && percentage >= 80;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-paper">
          <Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />
        </div>
        <span className="text-sm text-ink-muted">{label}</span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="font-serif text-2xl text-ink-strong">{formatNumber(current)}</p>
        <p className={`text-xs ${isNearLimit ? "font-medium text-orange-600" : "text-ink-muted"}`}>
          {unlimited ? "از نامحدود" : `از ${formatNumber(max)}`}
        </p>
      </div>
      {unlimited ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          بدون محدودیت
        </div>
      ) : (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-line/70"
          role="progressbar"
          aria-label={`مصرف ${label}`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={current}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? "bg-orange-500" : "bg-ink"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  enabled,
  label,
}: {
  icon: LucideIcon;
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface px-3 py-2.5">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          enabled ? "bg-emerald-100 text-emerald-700" : "bg-line/50 text-ink-muted/50"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </div>
      <span className={`text-sm ${enabled ? "text-ink" : "text-ink-muted/60"}`}>{label}</span>
      {enabled ? (
        <Check className="mr-auto h-4 w-4 text-emerald-600" strokeWidth={2} />
      ) : (
        <X className="mr-auto h-4 w-4 text-ink-muted/40" strokeWidth={1.7} />
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-paper">
        <Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm text-ink">{value}</p>
      </div>
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
  const featured = plan.slug === "premium";

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] border p-5 transition-all sm:p-6 ${
        featured
          ? "border-ink bg-ink text-paper shadow-[0_14px_30px_rgba(17,17,17,0.12)]"
          : "border-line bg-paper hover:border-ink/50"
      }`}
    >
      {featured && (
        <span className="absolute left-5 top-5 rounded-full border border-paper/15 bg-paper/10 px-2.5 py-1 text-[10px] text-paper/75">
          بدون محدودیت
        </span>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs tracking-[0.16em] ${featured ? "text-paper/55" : "text-ink-muted"}`}>
            {plan.nameEn}
          </p>
          <h3 className={`mt-2 font-serif text-2xl ${featured ? "text-paper" : "text-ink-strong"}`}>
            {plan.nameFa}
          </h3>
        </div>
        {isCurrent && (
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              featured
                ? "border-emerald-300/20 bg-emerald-300/15 text-emerald-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            طرح فعلی
          </span>
        )}
      </div>

      <p className={`mt-3 min-h-10 text-sm leading-6 ${featured ? "text-paper/65" : "text-ink-muted"}`}>
        {plan.description}
      </p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className={`font-serif text-3xl ${featured ? "text-paper" : "text-ink-strong"}`}>
          {formatNumber(plan.priceToman)}
        </span>
        <span className={`text-xs ${featured ? "text-paper/55" : "text-ink-muted"}`}>تومان / ماه</span>
      </div>

      <ul className={`mt-6 space-y-3 border-t pt-5 text-sm ${featured ? "border-paper/15" : "border-line"}`}>
        <PlanFeature
          enabled
          dark={featured}
          label={formatLimit(plan.maxMenuItems, "آیتم منو")}
        />
        <PlanFeature
          enabled
          dark={featured}
          label={formatLimit(plan.maxTables, "میز")}
        />
        <PlanFeature enabled={plan.customDomain} dark={featured} label="دامنه اختصاصی" />
        <PlanFeature enabled={plan.orderingEnabled} dark={featured} label="مدیریت سفارش میز" />
      </ul>

      {isCurrent ? (
        <div
          className={`mt-6 flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm ${
            featured
              ? "border-paper/15 bg-paper/5 text-paper/70"
              : "border-line bg-surface text-ink-muted"
          }`}
        >
          <Check className="h-4 w-4 text-emerald-500" strokeWidth={2} />
          این طرح فعال است
        </div>
      ) : (
        <Button
          className={`mt-6 w-full ${
            featured ? "border-paper bg-paper text-ink hover:bg-paper/90" : ""
          }`}
          variant={featured ? "primary" : "secondary"}
          disabled={isChanging}
          onClick={() => onSelect(plan.id)}
        >
          {isChanging ? "در حال بررسی..." : "انتخاب این طرح"}
          {!isChanging && <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />}
        </Button>
      )}
    </article>
  );
}

function PlanFeature({
  enabled,
  dark,
  label,
}: {
  enabled: boolean;
  dark: boolean;
  label: string;
}) {
  return (
    <li className={`flex items-center gap-2 ${enabled ? "" : dark ? "text-paper/30" : "text-ink-muted/45"}`}>
      {enabled ? (
        <Check
          className={`h-4 w-4 shrink-0 ${dark ? "text-emerald-300" : "text-emerald-600"}`}
          strokeWidth={2}
        />
      ) : (
        <X className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      )}
      <span>{label}</span>
    </li>
  );
}

function InvoiceMobileRow({ invoice }: { invoice: InvoiceData }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">
            {invoice.description || "پرداخت اشتراک ماهانه"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {formatDate(invoice.paidAt || invoice.createdAt)}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">مبلغ</span>
        <span className="font-medium text-ink">{formatCurrency(invoice.amountToman)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">شماره رسید</span>
        <span className="font-mono text-ink-muted" dir="ltr">
          {invoice.refId || "—"}
        </span>
      </div>
    </div>
  );
}
