import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionStatus, formatSubscriptionStatus, SUBSCRIPTION_PLANS } from "@/lib/subscription";
import { getAccessibleVenues } from "@/lib/permissions";
import { resolveVenueTheme, themeStyleVariables } from "@/lib/themes";
import { BillingClient } from "./BillingClient";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ venueId?: string | string[]; reason?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/billing");
  const status = await getSubscriptionStatus(user.id);
  const params = (await searchParams) ?? {};
  const requestedVenueId = Array.isArray(params.venueId) ? params.venueId[0] : params.venueId;
  const venues = await getAccessibleVenues(user.id);
  const venue = venues.find((item) => item.id === requestedVenueId) ?? venues[0];
  const theme = resolveVenueTheme(venue?.themeId, venue?.accentColor);

  return (
    <div
      data-admin-theme-root
      data-theme-mode={theme.mode}
      data-theme-contrast={theme.contrast}
      className="min-h-screen bg-canvas px-4 py-8 sm:px-6"
      style={themeStyleVariables(theme)}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/venues" className="font-serif text-2xl text-ink-strong">mofé</Link>
            <h1 className="mt-6 text-3xl font-bold text-ink-strong">اشتراک و صورتحساب</h1>
            <p className="mt-2 text-sm text-ink-muted">مدیریت دسترسی {user.name} به امکانات mofé</p>
          </div>
          <Link href="/venues" className="rounded-xl border border-line px-4 py-2 text-sm text-ink-muted hover:border-ink">
            بازگشت به مجموعه‌ها
          </Link>
        </div>

        <div className="mt-8">
          <BillingClient
            initialSubscription={{
              plan: status.subscription.plan,
              status: status.subscription.status,
              active: status.active,
              currentPeriodEnd: status.periodEnd?.toISOString() ?? null,
              cancelAtPeriodEnd: status.subscription.cancelAtPeriodEnd,
            }}
            plans={Object.values(SUBSCRIPTION_PLANS)}
          />
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          وضعیت فعلی: {formatSubscriptionStatus(status.subscription.status)} · اطلاعات پرداخت شما امن و فقط در حساب خودتان نمایش داده می‌شود.
        </p>
      </div>
    </div>
  );
}
