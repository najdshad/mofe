import Link from "next/link";

export default function InternalDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-ink-strong">پنل مدیریت داخلی</h1>
      <p className="text-sm text-ink-muted">ایجاد و مدیریت کاربران و مجموعه‌ها</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/internal/users"
          className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 transition-colors hover:border-ink"
        >
          <h2 className="font-serif text-lg text-ink-strong">کاربران</h2>
          <p className="mt-1 text-sm text-ink-muted">ایجاد حساب کاربری برای صاحبان کافه</p>
        </Link>
        <Link
          href="/internal/venues"
          className="rounded-[var(--radius-panel)] border border-line bg-paper p-6 transition-colors hover:border-ink"
        >
          <h2 className="font-serif text-lg text-ink-strong">مجموعه‌ها</h2>
          <p className="mt-1 text-sm text-ink-muted">ایجاد مجموعه جدید و انتساب مالک</p>
        </Link>
      </div>
    </div>
  );
}
