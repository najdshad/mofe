import { getCurrentUser } from "@/lib/auth";
import { getVenueMembership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function StaffLayout({
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
    prisma.venue.findUnique({ where: { id: venueId }, select: { nameFa: true } }),
  ]);

  if (!membership) redirect("/venues");
  if (!venue) redirect("/venues");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-4">
            <span className="font-serif text-xl text-ink-strong">mofé</span>
            <span className="text-sm text-ink-muted">{venue.nameFa}</span>
            <span className="text-sm font-medium text-ink">سفارشات</span>
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
