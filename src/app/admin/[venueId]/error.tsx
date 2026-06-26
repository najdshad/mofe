"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
      <h2 className="font-serif text-2xl text-ink-strong">خطا</h2>
      <p className="max-w-md text-sm text-ink-muted">
        خطایی در بارگذاری این صفحه رخ داده است. لطفاً دوباره تلاش کنید.
      </p>
      <button
        onClick={reset}
        className="rounded-full border border-line bg-paper px-6 py-2 text-sm text-ink transition-colors hover:bg-surface"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
