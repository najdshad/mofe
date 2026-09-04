"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchApi } from "@/lib/fetch-api";

type Plan = { key: string; label: string; amountToman: number; durationDays: number };

export function BillingClient({
  initialSubscription,
  plans,
}: {
  initialSubscription: {
    plan: string;
    status: string;
    active: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  plans: Plan[];
}) {
  const [subscription, setSubscription] = useState(initialSubscription);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (action: string, plan?: string) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await fetchApi(
        "/api/billing/subscription",
        { method: "POST", body: JSON.stringify({ action, plan }) },
      );
      if (data.subscription) {
        setSubscription((current) => ({ ...current, ...data.subscription }));
      }
      setMessage(data.message ?? (action === "cancel" ? "اشتراک در پایان دوره لغو می‌شود." : "تغییرات ذخیره شد."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطا در ثبت درخواست");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel title="اشتراک فعلی" subtitle="پس از پایان دوره آزمایشی، برای ادامه استفاده یک پلن انتخاب کنید.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-bold text-ink">{subscription.status === "trialing" ? "دوره آزمایشی ۱۴ روزه" : subscription.plan === "yearly" ? "پلن سالانه" : "پلن ماهانه"}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {subscription.active && subscription.currentPeriodEnd
                ? `معتبر تا ${new Date(subscription.currentPeriodEnd).toLocaleDateString("fa-IR")}`
                : "برای ادامه، اشتراک خود را فعال کنید."}
            </p>
          </div>
          {subscription.plan !== "trial" && subscription.active && (
            <Button variant="secondary" size="sm" disabled={loading} onClick={() => submit(subscription.cancelAtPeriodEnd ? "resume" : "cancel")}>
              {subscription.cancelAtPeriodEnd ? "ادامه اشتراک" : "لغو در پایان دوره"}
            </Button>
          )}
        </div>
      </Panel>

      <Panel title="انتخاب پلن" subtitle="درگاه پرداخت هنوز متصل نشده است؛ درخواست شما برای اتصال بعدی ثبت می‌شود.">
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => (
            <button
              key={plan.key}
              type="button"
              onClick={() => setSelectedPlan(plan.key)}
              className={`rounded-2xl border p-4 text-right transition-colors ${selectedPlan === plan.key ? "border-accent bg-accent text-accent-ink" : "border-line bg-control text-ink hover:border-ink/50 hover:bg-control-hover"}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold">{plan.label}</span>
                <span className="text-xs opacity-70">{plan.durationDays === 365 ? "صرفه‌جویی سالانه" : "انعطاف‌پذیر"}</span>
              </span>
              <span className="mt-3 block text-sm opacity-80">{plan.amountToman.toLocaleString("fa-IR")} تومان</span>
            </button>
          ))}
        </div>
        <Button className="mt-4 w-full sm:w-auto" disabled={loading} onClick={() => submit("checkout", selectedPlan)}>
          ثبت درخواست پرداخت
        </Button>
        {message && <p className="mt-3 text-sm text-ink-muted" role="status">{message}</p>}
      </Panel>
    </div>
  );
}
