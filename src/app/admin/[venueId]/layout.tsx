import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPublicMenuUrl } from "@/lib/config";
import { QRIconButton } from "./QRIconButton";
import { NavClient } from "./NavClient";
import { ExternalLink, LogOut, Store } from "lucide-react";

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
  const [access, venue] = await Promise.all([
    requireVenueAccess(user.id, venueId).catch(() => null),
    prisma.venue.findUnique({ where: { id: venueId }, select: { nameFa: true, slug: true } }),
  ]);

  if (!access || !venue) redirect("/venues");

  const publicUrl = getPublicMenuUrl(venue.slug);

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-line bg-panel p-4 lg:flex">
        <Link href="/venues" className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink font-serif text-lg text-paper">
            m
          </span>
          <span>
            <span className="block font-serif text-xl leading-none text-ink-strong">mofé</span>
            <span className="mt-1 block text-[10px] text-ink-muted">مدیریت منوی دیجیتال</span>
          </span>
        </Link>

        <div className="mt-5 rounded-2xl border border-line bg-white/50 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Store className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{venue.nameFa}</p>
              <p className="mt-0.5 truncate text-[11px] text-ink-muted" dir="ltr">/{venue.slug}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1">
          <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.12em] text-ink-muted">فضای کاری</p>
          <NavClient venueId={venueId} variant="sidebar" />
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-ink transition-colors hover:border-ink/40 hover:bg-white"
          >
            مشاهده منوی عمومی
            <ExternalLink className="h-4 w-4 text-ink-muted" strokeWidth={1.8} />
          </a>
          <QRIconButton venueName={venue.nameFa} publicUrl={publicUrl} showLabel />
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink">{user.name}</p>
              <p className="text-[10px] text-ink-muted">مدیر مجموعه</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-700"
                aria-label="خروج از حساب"
                title="خروج"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-line bg-panel/95 backdrop-blur lg:hidden">
          <div className="flex h-15 items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/venues" className="font-serif text-xl text-ink-strong">mofé</Link>
              <span className="h-5 w-px bg-line" />
              <span className="truncate text-xs font-medium text-ink-muted">{venue.nameFa}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-panel text-ink-muted"
                aria-label="مشاهده منوی عمومی"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <QRIconButton venueName={venue.nameFa} publicUrl={publicUrl} />
            </div>
          </div>
          <NavClient venueId={venueId} variant="mobile" />
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
