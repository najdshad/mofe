import { getCurrentUser } from "@/lib/auth";
import { getVenueMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const membership = await getVenueMembership(user.id, venueId);
  if (!membership) redirect("/venues");

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) redirect("/venues");

  const statusLabels: Record<string, string> = {
    draft: "پیش‌نویس",
    published: "منتشر شده",
    unpublished: "منتشر نشده",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/venues"
              className="font-serif text-xl text-ink-strong"
            >
              mofé
            </Link>
            <span className="text-sm text-ink-muted">{venue.nameFa}</span>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
              {statusLabels[venue.publicStatus] || venue.publicStatus}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-muted">{user.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-ink-muted hover:text-ink transition-colors"
              >
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] gap-6 px-5">
          <Link
            href={`/admin/${venueId}/menu`}
            className="border-b-2 border-transparent px-1 py-3 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            منو
          </Link>
          <Link
            href={`/admin/${venueId}/qr-menu`}
            className="border-b-2 border-transparent px-1 py-3 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            انتشار و QR
          </Link>
          <Link
            href={`/admin/${venueId}/settings`}
            className="border-b-2 border-transparent px-1 py-3 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            تنظیمات
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1520px] flex-1 px-5 py-6">
        {children}
      </main>
    </div>
  );
}
