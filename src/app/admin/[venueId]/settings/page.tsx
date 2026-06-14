import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  await requireVenueAccess(user.id, venueId);

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) redirect("/venues");

  const members = await prisma.venueMember.findMany({
    where: { venueId },
    include: { user: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Panel title="اطلاعات مجموعه">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-ink-muted">نام فارسی</span>
            <span className="text-ink">{venue.nameFa}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-ink-muted">زمان‌zone</span>
            <span className="text-ink">{venue.timezone}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-ink-muted">طرح</span>
            <span className="text-ink">{venue.plan}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-ink-muted">وضعیت انتشار</span>
            <span className="text-ink">{venue.publicStatus}</span>
          </div>
        </div>
      </Panel>

      <Panel title="اعضا" subtitle="مدیریت دسترسی کاربران">
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border border-line px-4 py-3"
            >
              <div>
                <div className="text-sm text-ink">{m.user.name}</div>
                <div className="text-xs text-ink-muted">{m.user.email}</div>
              </div>
              <span className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
                {m.role === "owner"
                  ? "مالک"
                  : m.role === "manager"
                  ? "مدیر"
                  : "کارمند"}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="دامنه">
        <p className="text-sm text-ink-muted">
          دامنه پیش‌فرض:{" "}
          <span dir="ltr" className="text-ink">
            menu.mofe.ir/{venue.slug}
          </span>
        </p>
        {venue.plan !== "starter" && (
          <p className="mt-2 text-sm text-ink-muted">
            برای تنظیم دامنه اختصاصی با پشتیبانی تماس بگیرید.
          </p>
        )}
      </Panel>
    </div>
  );
}
