import { getCurrentUser } from "@/lib/auth";
import { getVenueMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { QRIconButton } from "./QRIconButton";

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
  const [membership, venue] = await Promise.all([
    getVenueMembership(user.id, venueId),
    prisma.venue.findUnique({ where: { id: venueId }, select: { nameFa: true, slug: true, publicStatus: true } }),
  ]);

  if (!membership) redirect("/venues");
  if (membership.role === "staff") redirect("/venues");
  if (!venue) redirect("/venues");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-6">
            <Link
              href="/venues"
              className="font-serif text-xl text-ink-strong"
            >
              mofé
            </Link>
            <span className="text-sm text-ink-muted">{venue.nameFa}</span>
          </div>
          <div className="flex items-center gap-4">
            <QRIconButton
              venueName={venue.nameFa}
              publicUrl={getPublicMenuUrl(venue.slug)}
              isUnpublished={venue.publicStatus !== "published"}
            />
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
        <div className="mx-auto flex max-w-5xl gap-4 px-4">
          <Link
            href={`/admin/${venueId}/menu`}
            className="border-b-2 border-transparent px-1 py-2.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            منو
          </Link>
          <Link
            href={`/admin/${venueId}/orders`}
            className="border-b-2 border-transparent px-1 py-2.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            سفارشات
          </Link>
          <Link
            href={`/admin/${venueId}/sales`}
            className="border-b-2 border-transparent px-1 py-2.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            فروش
          </Link>
          <Link
            href={`/admin/${venueId}/settings`}
            className="border-b-2 border-transparent px-1 py-2.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            تنظیمات
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
