import { getCurrentUser } from "@/lib/auth";
import { getAccessibleVenues } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VenuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await getAccessibleVenues(user.id);

  if (memberships.length === 1 && memberships[0].role !== "staff") {
    redirect(`/admin/${memberships[0].venueId}/menu`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="font-serif text-3xl text-ink-strong">انتخاب محل کار</h1>
      <p className="mt-2 text-sm text-ink-muted">
        لطفاً یک مجموعه را انتخاب کنید
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {memberships.map((m) => (
          <Link
            key={m.venueId}
            href={`/admin/${m.venueId}/menu`}
            className="rounded-[var(--radius-panel)] border border-line bg-paper px-8 py-4 text-center text-lg font-serif text-ink transition-colors hover:border-ink"
          >
            {m.venue.nameFa}
            <span className="mr-3 text-xs text-ink-muted">{m.role}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
