import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-5xl leading-tight text-ink-strong lg:text-7xl">
        mofé
      </h1>
      <p className="mt-4 max-w-lg text-lg leading-8 text-ink-muted">
        مدیریت منوی کافه و رستوران. ساده، مینیمال، حرفه‌ای.
      </p>
      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/login"
          className="rounded-full bg-ink px-8 py-3 text-sm text-paper transition-opacity hover:opacity-90"
        >
          ورود به سیستم
        </Link>
      </div>
    </div>
  );
}
