import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "internal") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/internal" className="font-serif text-xl text-ink-strong">
              mofé
            </Link>
            <span className="text-xs text-ink-muted">پنل داخلی</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-ink-muted">{user.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-ink-muted hover:text-ink transition-colors">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-[1520px] gap-6 px-5">
          <Link
            href="/internal/users"
            className="border-b-2 border-transparent px-1 py-3 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            کاربران
          </Link>
          <Link
            href="/internal/venues"
            className="border-b-2 border-transparent px-1 py-3 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            مجموعه‌ها
          </Link>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-[1520px] flex-1 px-5 py-6">
        {children}
      </main>
    </div>
  );
}
