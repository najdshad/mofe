"use client";

export default function InternalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="font-serif text-2xl text-ink">خطایی رخ داده است</h1>
      <p className="text-sm text-ink-muted">متأسفانه مشکلی پیش آمده. لطفاً دوباره تلاش کنید.</p>
      <button
        onClick={reset}
        className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-90"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
