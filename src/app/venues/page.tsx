import { getCurrentUser } from "@/lib/auth";
import { getAccessibleVenues } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSubscriptionStatus, formatSubscriptionStatus } from "@/lib/subscription";

export default async function VenuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const venues = await getAccessibleVenues(user.id);
  const subscription = await getSubscriptionStatus(user.id);

  if (venues.length === 1 && subscription.active) {
    redirect(`/admin/${venues[0].id}/menu`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="font-serif text-3xl text-ink-strong">انتخاب محل کار</h1>
      <p className="mt-2 text-sm text-ink-muted">
        لطفاً یک مجموعه را انتخاب کنید
      </p>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${subscription.active ? "bg-success" : "bg-red-500"}`} />
        <span>وضعیت اشتراک: {formatSubscriptionStatus(subscription.subscription.status)}</span>
        <Link href="/account/billing" className="mr-auto text-xs font-bold text-accent hover:underline">
          مدیریت اشتراک
        </Link>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {venues.map((v) => (
          <Link
            key={v.id}
            href={subscription.active ? `/admin/${v.id}/menu` : "/account/billing"}
            className={`rounded-[var(--radius-panel)] border border-line bg-paper px-8 py-4 text-center text-lg font-serif text-ink transition-colors ${subscription.active ? "hover:border-ink" : "opacity-60"}`}
          >
            {v.nameFa}
          </Link>
        ))}
      </div>
    </div>
  );
}
