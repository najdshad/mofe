import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-4 text-center">
      <h1 className="font-serif text-2xl text-ink">صفحه مورد نظر یافت نشد</h1>
      <p className="text-sm text-ink-muted">صفحه‌ای که به دنبال آن هستید وجود ندارد.</p>
      <Link
        href="/"
        className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-90"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
