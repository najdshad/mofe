import { getCurrentUser } from "@/lib/auth";
import { getAccessibleVenues } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VenuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const venues = await getAccessibleVenues(user.id);

  if (venues.length === 1) {
    redirect(`/admin/${venues[0].id}/menu`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="font-serif text-3xl text-ink-strong">انتخاب محل کار</h1>
      <p className="mt-2 text-sm text-ink-muted">
        لطفاً یک مجموعه را انتخاب کنید
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {venues.map((v) => (
          <Link
            key={v.id}
            href={`/admin/${v.id}/menu`}
            className="rounded-[var(--radius-panel)] border border-line bg-paper px-8 py-4 text-center text-lg font-serif text-ink transition-colors hover:border-ink"
          >
            {v.nameFa}
          </Link>
        ))}
      </div>
    </div>
  );
}
