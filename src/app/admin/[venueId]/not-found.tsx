import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="font-serif text-2xl text-ink">صفحه مورد نظر یافت نشد</h1>
      <p className="text-sm text-ink-muted">صفحه‌ای که به دنبال آن هستید وجود ندارد.</p>
      <Link
        href={`/venues`}
        className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-90"
      >
        بازگشت به مجموعه‌ها
      </Link>
    </div>
  );
}
